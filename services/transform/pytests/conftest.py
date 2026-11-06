from __future__ import annotations

import os
from pathlib import Path

import psycopg
import pytest

SCHEMA_SQL = (
    Path(__file__).resolve().parents[2] / "ingest" / "fin_ingest" / "sql" / "0001_schemas.sql"
)


@pytest.fixture
def pg_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL não definida")
    return url


@pytest.fixture
def pg(pg_url):
    """Banco com os schemas da ingestão, core vazio e marts zerados."""
    conn = psycopg.connect(pg_url, autocommit=True)
    conn.execute(SCHEMA_SQL.read_text())
    conn.execute("DROP SCHEMA IF EXISTS marts_prev CASCADE")
    conn.execute("DROP SCHEMA IF EXISTS marts CASCADE")
    conn.execute("CREATE SCHEMA marts")
    conn.execute("DROP SCHEMA IF EXISTS marts_next CASCADE")
    conn.execute("CREATE SCHEMA marts_next")
    conn.execute(
        "TRUNCATE ingest.publishes, core.instruments, core.prices_daily, core.fundamentals, "
        "core.macro_series, core.dividends"
    )
    yield conn
    conn.close()
