"""Publicação dos marts: dbt build em `marts_next` e, só com tudo verde, swap atômico de schema.

    publish run [--vars '{...}']   # dbt build --target next → swap → revalidate
    publish rollback               # marts ↔ marts_prev

O swap é uma transação com três ALTER SCHEMA … RENAME: quem lê `marts` vê a versão antiga ou a
nova, nunca uma tabela pela metade. Se o build ou algum teste falhar, `marts` fica intacto.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

import httpx
import psycopg

PACKAGE_PARENT = Path(__file__).resolve().parents[1]


def project_dir() -> Path:
    """Onde está o dbt_project.yml: DBT_PROJECT_DIR, o diretório atual ou o checkout do pacote.

    Instalado sem `-e`, o pacote fica em site-packages e o projeto dbt não vai junto; por isso a
    variável e o diretório atual vêm antes.
    """
    candidates = [os.environ.get("DBT_PROJECT_DIR"), os.getcwd(), str(PACKAGE_PARENT)]
    for c in candidates:
        if c and (Path(c) / "dbt_project.yml").exists():
            return Path(c).resolve()
    raise PublishError(
        "dbt_project.yml não encontrado: defina DBT_PROJECT_DIR (ex.: services/transform)"
    )


WEB_ROLE = "fa_web"


class PublishError(Exception):
    pass


def _grant_web(cur: psycopg.Cursor) -> None:
    # privilégios padrão ficam presos ao schema antigo (OID); reaplica sempre no schema publicado
    cur.execute(
        f"""DO $$ BEGIN
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{WEB_ROLE}') THEN
                EXECUTE 'GRANT USAGE ON SCHEMA marts TO {WEB_ROLE}';
                EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA marts TO {WEB_ROLE}';
              END IF;
            END $$"""
    )


def swap(conn: psycopg.Connection) -> None:
    """marts_next → marts, marts → marts_prev, recria marts_next vazio. Tudo ou nada."""
    with conn.transaction(), conn.cursor() as cur:
        cur.execute("SET LOCAL lock_timeout = '10s'")
        cur.execute("DROP SCHEMA IF EXISTS marts_prev CASCADE")
        cur.execute("ALTER SCHEMA marts RENAME TO marts_prev")
        cur.execute("ALTER SCHEMA marts_next RENAME TO marts")
        cur.execute("CREATE SCHEMA marts_next")
        _grant_web(cur)


def rollback(conn: psycopg.Connection) -> None:
    """Volta a publicação anterior: marts ↔ marts_prev."""
    with conn.transaction(), conn.cursor() as cur:
        exists = cur.execute(
            "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'marts_prev'"
        ).fetchone()
        if not exists:
            raise PublishError("não há publicação anterior (marts_prev) para voltar")
        cur.execute("SET LOCAL lock_timeout = '10s'")
        cur.execute("ALTER SCHEMA marts RENAME TO marts_tmp")
        cur.execute("ALTER SCHEMA marts_prev RENAME TO marts")
        cur.execute("ALTER SCHEMA marts_tmp RENAME TO marts_prev")
        _grant_web(cur)
    _record(conn, "rolled_back", "marts ↔ marts_prev")


def reset_next(conn: psycopg.Connection) -> None:
    """Começa cada build com marts_next vazio (sobras de um build falho não vazam)."""
    with conn.transaction():
        conn.execute("DROP SCHEMA IF EXISTS marts_next CASCADE")
        conn.execute("CREATE SCHEMA marts_next")


def _record(conn: psycopg.Connection, status: str, note: str | None) -> None:
    conn.execute(
        "INSERT INTO ingest.publishes (status, finished_at, note) VALUES (%s, now(), %s)",
        (status, (note or "")[:4000]),
    )


def pg_env(url: str | None = None) -> dict[str, str]:
    """DATABASE_URL → PGHOST/PGPORT/… para o profile do dbt (uma variável só em todo lugar)."""
    url = url or os.environ.get("DATABASE_URL")
    if not url:
        return {}
    info = psycopg.conninfo.conninfo_to_dict(url)
    keys = {
        "host": "PGHOST",
        "port": "PGPORT",
        "user": "PGUSER",
        "password": "PGPASSWORD",
        "dbname": "PGDATABASE",
        "sslmode": "PGSSLMODE",
    }
    return {env: str(info[k]) for k, env in keys.items() if info.get(k)}


def dbt_build(dbt_vars: str | None = None) -> tuple[bool, str]:
    local = Path(sys.executable).with_name("dbt")  # dbt do mesmo venv, se houver
    proj = project_dir()
    cmd = [
        str(local) if local.exists() else "dbt",
        "build",
        "--target",
        "next",
        "--project-dir",
        str(proj),
        "--profiles-dir",
        str(proj),
    ]
    if dbt_vars:
        cmd += ["--vars", dbt_vars]
    proc = subprocess.run(cmd, capture_output=True, text=True, env={**os.environ, **pg_env()})
    out = proc.stdout + proc.stderr
    return proc.returncode == 0, out


def revalidate(url: str | None, secret: str | None) -> str:
    if not url:
        return "revalidate: REVALIDATE_URL não definida (pulado)"
    try:
        resp = httpx.post(url, headers={"x-revalidate-secret": secret or ""}, timeout=10)
        return f"revalidate: HTTP {resp.status_code}"
    except httpx.HTTPError as exc:  # a publicação já valeu; a web revalida no próximo TTL
        return f"revalidate: falhou ({exc})"


def publish(
    conn: psycopg.Connection,
    build: Callable[[], tuple[bool, str]],
    on_published: Callable[[], str] | None = None,
) -> str:
    """Build em marts_next; com sucesso, swap. Devolve o resumo; lança PublishError se falhar."""
    reset_next(conn)
    ok, log = build()
    if not ok:
        _record(conn, "failed", _tail(log))
        raise PublishError("build/testes falharam: marts não foi alterado\n" + _tail(log))
    swap(conn)
    extra = on_published() if on_published else ""
    _record(conn, "published", extra)
    return f"publicado. {extra}".strip()


def _tail(log: str, lines: int = 40) -> str:
    return "\n".join(log.strip().splitlines()[-lines:])


def _connect() -> psycopg.Connection:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL não definida")
    return psycopg.connect(url, autocommit=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="publish", description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    run_p = sub.add_parser("run", help="dbt build em marts_next e swap se tudo passar")
    run_p.add_argument(
        "--vars", default=None, help="--vars do dbt (YAML), ex.: '{poc_sentinel: true}'"
    )
    sub.add_parser("rollback", help="volta para a publicação anterior")
    args = parser.parse_args(argv)

    conn = _connect()
    try:
        if args.cmd == "rollback":
            rollback(conn)
            print("rollback feito: marts ↔ marts_prev")
            return 0
        summary = publish(
            conn,
            build=lambda: _echo(dbt_build(args.vars)),
            on_published=lambda: revalidate(
                os.environ.get("REVALIDATE_URL"), os.environ.get("REVALIDATE_SECRET")
            ),
        )
        print(summary)
        return 0
    except PublishError as exc:
        print(f"publish falhou: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()


def _echo(result: tuple[bool, str]) -> tuple[bool, str]:
    print(result[1])
    return result


if __name__ == "__main__":
    raise SystemExit(main())
