"""Medições da PoC da plataforma de dados (docs/poc-plataforma-dados.md, seção 7).

    python poc/measure.py checksum core.prices_daily_y2026   # imprime "linhas md5" (R6)
    python poc/measure.py marts-count                         # linhas por mart (P1)
    python poc/measure.py report --out poc-report             # tabela de critérios + JSON

Lê DATABASE_URL e S3_* (as mesmas variáveis da ingestão). Não altera nada.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import statistics
import sys
import time
from pathlib import Path

import psycopg

try:
    import boto3
except ImportError:  # pragma: no cover
    boto3 = None


def connect() -> psycopg.Connection:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL não definida")
    return psycopg.connect(url, autocommit=True)


def checksum(conn, table: str) -> str:
    row = conn.execute(
        f"SELECT count(*), coalesce(md5(string_agg(t::text, '|' ORDER BY t::text)), '-') FROM {table} t"
    ).fetchone()
    return f"{row[0]} {row[1]}"


def marts_count(conn) -> dict[str, int]:
    tables = [
        r[0]
        for r in conn.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'marts' ORDER BY 1"
        ).fetchall()
    ]
    return {t: conn.execute(f"SELECT count(*) FROM marts.{t}").fetchone()[0] for t in tables}


def p95(samples: list[float]) -> float:
    if not samples:
        return float("nan")
    s = sorted(samples)
    return round(s[max(0, int(len(s) * 0.95) - 1)] * 1000, 2)  # ms


def timed(conn, sql: str, params) -> float:
    t0 = time.perf_counter()
    conn.execute(sql, params).fetchall()
    return time.perf_counter() - t0


def lake_sizes() -> dict[str, dict[str, int]]:
    if boto3 is None or not os.environ.get("S3_BUCKET"):
        return {}
    s3 = boto3.client(
        "s3",
        endpoint_url=os.environ.get("S3_ENDPOINT") or None,
        aws_access_key_id=os.environ.get("S3_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("S3_SECRET_ACCESS_KEY"),
        region_name=os.environ.get("S3_REGION", "auto"),
    )
    out: dict[str, dict[str, int]] = {}
    pages = s3.get_paginator("list_objects_v2").paginate(Bucket=os.environ["S3_BUCKET"])
    for page in pages:
        for obj in page.get("Contents", []):
            parts = obj["Key"].split("/")
            # bronze/cotahist/…, silver/prices_daily/…, quarantine/…
            key = (
                "/".join(parts[:2])
                if parts[0] != "bronze" or parts[1] != "_index"
                else "bronze/_index"
            )
            agg = out.setdefault(key, {"objects": 0, "bytes": 0})
            agg["objects"] += 1
            agg["bytes"] += obj["Size"]
    return out


def report(conn, out_dir: Path) -> dict:
    data: dict = {}
    data["runs"] = [
        dict(
            zip(
                [
                    "source",
                    "status",
                    "seconds",
                    "units_done",
                    "units_total",
                    "units_skipped",
                    "units_failed",
                    "rows",
                    "quarantined",
                    "bytes_in",
                    "api_calls",
                    "args",
                ],
                r,
                strict=True,
            )
        )
        for r in conn.execute(
            """SELECT source, status, extract(epoch FROM coalesce(finished_at, now()) - started_at)::int,
                      units_done, units_total, units_skipped, units_failed, rows_loaded,
                      rows_quarantined, bytes_in, api_calls, args::text
               FROM ingest.runs ORDER BY started_at"""
        ).fetchall()
    ]
    data["units"] = [
        dict(zip(["source", "unit", "status", "rows", "attempts"], r, strict=True))
        for r in conn.execute(
            "SELECT source, unit, status, rows, attempts FROM ingest.units ORDER BY source, unit"
        ).fetchall()
    ]
    data["dlq"] = [
        dict(zip(["source", "unit", "attempts", "error"], r, strict=True))
        for r in conn.execute(
            "SELECT source, unit, attempts, left(error, 200) FROM ingest.dlq"
        ).fetchall()
    ]
    data["api_calls"] = {
        f"{s}:{d}": c
        for s, d, c in conn.execute("SELECT source, day, calls FROM ingest.api_calls").fetchall()
    }
    data["publishes"] = [
        dict(zip(["status", "note"], r, strict=True))
        for r in conn.execute(
            "SELECT status, left(note, 200) FROM ingest.publishes ORDER BY id"
        ).fetchall()
    ]
    data["pg_bytes"] = {
        schema: int(size or 0)
        for schema, size in conn.execute(
            """SELECT n.nspname, sum(pg_total_relation_size(c.oid))
               FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname IN ('core', 'marts', 'ingest') AND c.relkind IN ('r', 'p', 'm')
               GROUP BY 1"""
        ).fetchall()
    }
    data["core_rows"] = {
        t: conn.execute(f"SELECT count(*) FROM core.{t}").fetchone()[0]
        for t in (
            "instruments",
            "prices_daily",
            "fundamentals",
            "macro_series",
            "dividends",
        )
    }
    data["marts_rows"] = marts_count(conn)
    data["lake"] = lake_sizes()

    # D1/D5: latência de leitura dos marts (mesma rede do runner; no Neon/Vercel o número muda)
    tickers = (
        [r[0] for r in conn.execute("SELECT ticker FROM marts.mart_asset_index").fetchall()]
        if data["marts_rows"]
        else []
    )
    if tickers:
        rnd = random.Random(42)
        card = [
            timed(
                conn,
                """SELECT i.*, r.* FROM marts.mart_asset_index i
                   LEFT JOIN marts.mart_asset_returns r USING (ticker) WHERE i.ticker = %s""",
                (rnd.choice(tickers),),
            )
            for _ in range(1000)
        ]
        hist = [
            timed(
                conn,
                "SELECT date, close FROM marts.mart_price_history WHERE ticker = %s ORDER BY date",
                (rnd.choice(tickers),),
            )
            for _ in range(1000)
        ]
        names = [r[0] for r in conn.execute("SELECT name FROM marts.mart_asset_index").fetchall()]
        queries = [rnd.choice(tickers)[:3].lower() for _ in range(100)] + [
            rnd.choice(names).split()[0][:5].lower() for _ in range(100)
        ]
        search = [
            timed(
                conn,
                """SELECT ticker FROM marts.mart_asset_index
                   WHERE ticker ILIKE %s OR search_text LIKE %s OR search_text %% %s
                   ORDER BY (ticker ILIKE %s) DESC, similarity(search_text, %s) DESC LIMIT 6""",
                (q + "%", "%" + q + "%", q, q + "%", q),
            )
            for q in queries
        ]
        data["latency_ms_p95"] = {
            "card": p95(card),
            "history": p95(hist),
            "search": p95(search),
        }
        points = conn.execute(
            "SELECT count(*) FROM marts.mart_price_history GROUP BY ticker"
        ).fetchall()
        counts = [c for (c,) in points]
        data["history_points"] = {
            "tickers": len(counts),
            "median": statistics.median(counts) if counts else 0,
            "max": max(counts) if counts else 0,
        }
        vale = conn.execute(
            "SELECT quarter, revenue, net_income, depreciation FROM marts.mart_fundamentals_quarterly WHERE ticker = 'VALE3' ORDER BY quarter_end"
        ).fetchall()
        data["vale3_quarters"] = [list(map(str, r)) for r in vale]
        data["last_session"] = str(
            conn.execute("SELECT max(last_date) FROM marts.mart_asset_index").fetchone()[0]
        )
        data["tickers_last_session"] = conn.execute(
            "SELECT count(*) FROM marts.mart_asset_index WHERE last_date = (SELECT max(last_date) FROM marts.mart_asset_index)"
        ).fetchone()[0]

    # V4: projeção linear (bytes por ano de COTAHIST no bronze × 20 anos)
    cot = [
        r
        for r in data["runs"]
        if r["source"] == "cotahist" and r["status"] in ("success", "partial")
    ]
    year_bytes = max((r["bytes_in"] for r in cot), default=0)
    data["projection_20y_bronze_cotahist_bytes"] = year_bytes * 20

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "poc-report.json").write_text(json.dumps(data, indent=2, default=str))
    md = render(data)
    (out_dir / "poc-report.md").write_text(md)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(md)
    print(md)
    return data


def mb(n: int) -> str:
    return f"{n / 1e6:.1f} MB"


def render(d: dict) -> str:
    lines = ["## Relatório da PoC", ""]
    lines += [
        "### Execuções (ledger)",
        "",
        "| fonte | status | s | unidades | puladas | falhas | linhas | quarentena | bytes | chamadas |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in d["runs"]:
        lines.append(
            f"| {r['source']} | {r['status']} | {r['seconds']} | {r['units_done']}/{r['units_total']} | {r['units_skipped']} | {r['units_failed']} | {r['rows']} | {r['quarantined']} | {mb(r['bytes_in'] or 0)} | {r['api_calls']} |"
        )
    lines += ["", "### Armazenamento", ""]
    lines += [f"- Postgres `{k}`: {mb(v)}" for k, v in sorted(d["pg_bytes"].items())]
    lines += [
        f"- Lake `{k}`: {v['objects']} objetos, {mb(v['bytes'])}"
        for k, v in sorted(d["lake"].items())
    ]
    lines += [f"- core: {d['core_rows']}", f"- marts: {d['marts_rows']}"]
    lines.append(
        f"- Projeção 20 anos de COTAHIST no bronze: {mb(d['projection_20y_bronze_cotahist_bytes'])}"
    )
    if "latency_ms_p95" in d:
        lat = d["latency_ms_p95"]
        lines += [
            "",
            "### Leitura",
            "",
            f"- p95 cartão do ativo: {lat['card']} ms · histórico: {lat['history']} ms · busca: {lat['search']} ms (1.000/1.000/200 consultas, mesma rede)",
        ]
        lines.append(
            f"- Pontos de histórico por ativo: mediana {d['history_points']['median']}, máximo {d['history_points']['max']} ({d['history_points']['tickers']} ativos)"
        )
        lines.append(f"- Último pregão: {d['last_session']} com {d['tickers_last_session']} ativos")
        lines.append(f"- VALE3 trimestres: {', '.join(q[0] for q in d['vale3_quarters']) or '—'}")
    lines += ["", "### Publicações", ""] + [f"- {p['status']}" for p in d["publishes"]]
    lines += ["", "### DLQ", ""] + (
        [f"- {x['source']}/{x['unit']} ({x['attempts']}×): {x['error']}" for x in d["dlq"]]
        or ["- vazia"]
    )
    lines += ["", "### Chamadas por fonte e dia", ""] + [
        f"- {k}: {v}" for k, v in sorted(d["api_calls"].items())
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("checksum")
    c.add_argument("table")
    sub.add_parser("marts-count")
    r = sub.add_parser("report")
    r.add_argument("--out", default="poc-report")
    args = parser.parse_args()
    conn = connect()
    if args.cmd == "checksum":
        print(checksum(conn, args.table))
    elif args.cmd == "marts-count":
        print(json.dumps(marts_count(conn), sort_keys=True))
    else:
        report(conn, Path(args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
