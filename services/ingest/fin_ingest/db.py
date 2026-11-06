"""Acesso ao Postgres: migrations, estado da ingestão e carga idempotente."""

from __future__ import annotations

import json
import uuid
from datetime import date
from pathlib import Path
from typing import Any

import polars as pl
import psycopg

SQL_DIR = Path(__file__).parent / "sql"


def connect(database_url: str) -> psycopg.Connection:
    if not database_url:
        raise SystemExit("DATABASE_URL não definida")
    return psycopg.connect(database_url, autocommit=True)


def migrate(conn: psycopg.Connection) -> list[str]:
    applied = []
    for path in sorted(SQL_DIR.glob("*.sql")):
        conn.execute(path.read_text())
        applied.append(path.name)
    return applied


# ───────────────────────── estado: cache HTTP e orçamento ─────────────────────────


class DbHttpCache:
    def __init__(self, conn: psycopg.Connection):
        self.conn = conn

    def get(self, key: str) -> tuple[str | None, str | None]:
        row = self.conn.execute(
            "SELECT etag, last_modified FROM ingest.http_cache WHERE key = %s", (key,)
        ).fetchone()
        return (row[0], row[1]) if row else (None, None)

    def put(self, key: str, etag: str | None, last_modified: str | None) -> None:
        self.conn.execute(
            """INSERT INTO ingest.http_cache (key, etag, last_modified) VALUES (%s, %s, %s)
               ON CONFLICT (key) DO UPDATE SET etag = EXCLUDED.etag,
                 last_modified = EXCLUDED.last_modified, updated_at = now()""",
            (key, etag, last_modified),
        )


class DbBudget:
    def __init__(self, conn: psycopg.Connection):
        self.conn = conn

    def consume(self, source: str, day: date) -> int:
        row = self.conn.execute(
            """INSERT INTO ingest.api_calls (source, day, calls) VALUES (%s, %s, 1)
               ON CONFLICT (source, day) DO UPDATE SET calls = ingest.api_calls.calls + 1
               RETURNING calls""",
            (source, day),
        ).fetchone()
        return int(row[0])


# ───────────────────────── ledger, unidades, watermarks, DLQ ─────────────────────────


class State:
    def __init__(self, conn: psycopg.Connection, source: str, dataset: str):
        self.conn = conn
        self.source = source
        self.dataset = dataset

    # ledger
    def start_run(self, args: dict[str, Any]) -> str:
        run_id = str(uuid.uuid4())
        self.conn.execute(
            "INSERT INTO ingest.runs (run_id, source, dataset, args, status) VALUES (%s,%s,%s,%s,'running')",
            (run_id, self.source, self.dataset, json.dumps(args, default=str)),
        )
        return run_id

    def finish_run(
        self, run_id: str, status: str, metrics: dict[str, int], error: str | None
    ) -> None:
        self.conn.execute(
            """UPDATE ingest.runs SET status=%s, finished_at=now(), units_total=%s, units_done=%s,
                 units_failed=%s, units_skipped=%s, rows_loaded=%s, rows_quarantined=%s,
                 bytes_in=%s, api_calls=%s, error=%s
               WHERE run_id=%s""",
            (
                status,
                metrics.get("units_total", 0),
                metrics.get("units_done", 0),
                metrics.get("units_failed", 0),
                metrics.get("units_skipped", 0),
                metrics.get("rows_loaded", 0),
                metrics.get("rows_quarantined", 0),
                metrics.get("bytes_in", 0),
                metrics.get("api_calls", 0),
                error,
                run_id,
            ),
        )

    def abort_stale_runs(self, current_run_id: str, older_than_hours: float = 6) -> int:
        """Execuções `running` antigas da mesma fonte viram `aborted` (processo morto sem fechar o ledger)."""
        cur = self.conn.execute(
            """UPDATE ingest.runs SET status = 'aborted', finished_at = now(),
                 error = coalesce(error, 'execução interrompida sem fechar o ledger')
               WHERE source = %s AND dataset = %s AND status = 'running' AND run_id <> %s
                 AND started_at < now() - make_interval(secs => %s)""",
            (self.source, self.dataset, current_run_id, older_than_hours * 3600),
        )
        return cur.rowcount

    # unidades
    def unit_status(self, unit: str) -> str | None:
        row = self.conn.execute(
            "SELECT status FROM ingest.units WHERE source=%s AND dataset=%s AND unit=%s",
            (self.source, self.dataset, unit),
        ).fetchone()
        return row[0] if row else None

    def set_unit(
        self,
        unit: str,
        status: str,
        run_id: str,
        rows: int | None = None,
        sha256: str | None = None,
        error: str | None = None,
    ) -> None:
        self.conn.execute(
            """INSERT INTO ingest.units (source, dataset, unit, status, run_id, rows, sha256,
                 attempts, last_error)
               VALUES (%s,%s,%s,%s,%s,%s,%s, CASE WHEN %s = 'running' THEN 1 ELSE 0 END, %s)
               ON CONFLICT (source, dataset, unit) DO UPDATE SET
                 status = EXCLUDED.status, run_id = EXCLUDED.run_id,
                 rows = COALESCE(EXCLUDED.rows, ingest.units.rows),
                 sha256 = COALESCE(EXCLUDED.sha256, ingest.units.sha256),
                 attempts = ingest.units.attempts + CASE WHEN EXCLUDED.status = 'running' THEN 1 ELSE 0 END,
                 last_error = EXCLUDED.last_error, updated_at = now()""",
            (self.source, self.dataset, unit, status, run_id, rows, sha256, status, error),
        )

    # watermarks
    def get_watermark(self, key: str) -> str | None:
        row = self.conn.execute(
            "SELECT value FROM ingest.watermarks WHERE source=%s AND dataset=%s AND key=%s",
            (self.source, self.dataset, key),
        ).fetchone()
        return row[0] if row else None

    def set_watermark(self, key: str, value: str) -> None:
        self.conn.execute(
            """INSERT INTO ingest.watermarks (source, dataset, key, value) VALUES (%s,%s,%s,%s)
               ON CONFLICT (source, dataset, key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()""",
            (self.source, self.dataset, key, value),
        )

    # DLQ
    def dlq_put(self, unit: str, error: str) -> None:
        self.conn.execute(
            """INSERT INTO ingest.dlq (source, dataset, unit, error) VALUES (%s,%s,%s,%s)
               ON CONFLICT (source, dataset, unit) DO UPDATE SET error=EXCLUDED.error,
                 attempts = ingest.dlq.attempts + 1, last_seen = now()""",
            (self.source, self.dataset, unit, error[:2000]),
        )

    def dlq_remove(self, unit: str) -> None:
        self.conn.execute(
            "DELETE FROM ingest.dlq WHERE source=%s AND dataset=%s AND unit=%s",
            (self.source, self.dataset, unit),
        )

    def dlq_units(self, max_attempts: int) -> list[str]:
        rows = self.conn.execute(
            "SELECT unit FROM ingest.dlq WHERE source=%s AND dataset=%s AND attempts < %s ORDER BY unit",
            (self.source, self.dataset, max_attempts),
        ).fetchall()
        return [r[0] for r in rows]


# ───────────────────────── carga idempotente ─────────────────────────


def ensure_year_partition(conn: psycopg.Connection, table: str, year: int) -> None:
    """Cria a partição anual de uma tabela particionada por data, se faltar."""
    schema, name = table.split(".")
    conn.execute(
        f"CREATE TABLE IF NOT EXISTS {schema}.{name}_y{year} PARTITION OF {table} "
        f"FOR VALUES FROM ('{year}-01-01') TO ('{year + 1}-01-01')"
    )


def replace_rows(
    conn: psycopg.Connection,
    table: str,
    delete_where: str,
    params: tuple | dict,
    df: pl.DataFrame,
) -> int:
    """Troca um recorte inteiro numa transação: DELETE do recorte + COPY das linhas novas.

    Rodar duas vezes com os mesmos dados deixa a tabela igual (idempotente). Se algo falhar no
    meio, a transação volta e o recorte antigo continua lá.
    """
    columns = df.columns
    with conn.transaction(), conn.cursor() as cur:
        cur.execute(f"DELETE FROM {table} WHERE {delete_where}", params)
        if df.height:
            cols = ", ".join(columns)
            with cur.copy(f"COPY {table} ({cols}) FROM STDIN") as copy:
                for row in df.iter_rows():
                    copy.write_row(row)
    return df.height


def upsert_rows(conn: psycopg.Connection, table: str, key: list[str], df: pl.DataFrame) -> int:
    """INSERT … ON CONFLICT (key) DO UPDATE — para cargas incrementais (macro, proventos, cadastro)."""
    if df.is_empty():
        return 0
    columns = df.columns
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in columns if c not in key)
    placeholders = ", ".join(["%s"] * len(columns))
    sql = (
        f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders}) "
        f"ON CONFLICT ({', '.join(key)}) DO " + (f"UPDATE SET {updates}" if updates else "NOTHING")
    )
    with conn.transaction(), conn.cursor() as cur:
        cur.executemany(sql, list(df.iter_rows()))
    return df.height
