"""Lake (S3 via moto): bronze deduplicado por sha256, silver sobrescrito por partição, quarentena."""

from __future__ import annotations

import polars as pl


def test_bronze_deduplica_pelo_conteudo(lake):
    first = lake.put_bronze("cotahist", "prices_daily", "2026-10-31", "run-1", "A.ZIP", b"conteudo")
    again = lake.put_bronze("cotahist", "prices_daily", "2026-11-01", "run-2", "A.ZIP", b"conteudo")
    other = lake.put_bronze("cotahist", "prices_daily", "2026-11-01", "run-2", "B.ZIP", b"outro")
    assert not first.duplicate and again.duplicate and not other.duplicate
    assert again.key == first.key and again.sha256 == first.sha256
    manifest = lake.s3.get_object(Bucket="lake", Key=f"{first.key}.manifest.json")["Body"].read()
    assert first.sha256.encode() in manifest
    objects, _ = lake.size("bronze/cotahist/")
    assert objects == 4  # 2 arquivos + 2 manifests


def test_silver_sobrescreve_a_particao(lake):
    part = {"year": 2026, "month": "10"}
    lake.write_silver("prices_daily", part, pl.DataFrame({"ticker": ["A", "B"]}))
    lake.write_silver("prices_daily", part, pl.DataFrame({"ticker": ["A"]}))
    assert lake.read_silver("prices_daily", part)["ticker"].to_list() == ["A"]
    assert lake.size("silver/prices_daily/year=2026/month=10/")[0] == 1


def test_quarentena_guarda_o_motivo(lake):
    assert lake.put_quarantine("x", {"year": 2026}, "r", pl.DataFrame()) is None
    key = lake.put_quarantine(
        "x", {"year": 2026}, "r", pl.DataFrame({"_reason": ["fechamento não positivo"]})
    )
    assert key == "quarantine/x/year=2026/r.parquet"
