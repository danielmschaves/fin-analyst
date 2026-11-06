from __future__ import annotations

import os

import boto3
import pytest
from moto import mock_aws

from fin_ingest.lake import Lake


class FakeSleep:
    """Registra as esperas em vez de dormir; o relógio avança junto."""

    def __init__(self) -> None:
        self.calls: list[float] = []
        self.now = 0.0

    def __call__(self, seconds: float) -> None:
        self.calls.append(seconds)
        self.now += seconds

    def clock(self) -> float:
        return self.now


@pytest.fixture
def fake_sleep() -> FakeSleep:
    return FakeSleep()


@pytest.fixture
def lake():
    with mock_aws():
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="lake")
        yield Lake(s3, "lake")


@pytest.fixture
def pg():
    """Postgres de teste (TEST_DATABASE_URL). Migra, limpa as tabelas e devolve a conexão."""
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL não definida")
    from fin_ingest import db

    conn = db.connect(url)
    db.migrate(conn)
    conn.execute(
        "TRUNCATE ingest.runs, ingest.units, ingest.watermarks, ingest.dlq, ingest.http_cache, "
        "ingest.api_calls, core.instruments, core.prices_daily, core.fundamentals, "
        "core.macro_series, core.dividends"
    )
    yield conn
    conn.close()
