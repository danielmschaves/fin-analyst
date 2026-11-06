"""Configuração das fontes (sources.yaml) e do ambiente (variáveis)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

DEFAULT_SOURCES = Path(__file__).resolve().parent / "sources.yaml"


@dataclass(frozen=True)
class SourceConfig:
    name: str
    base_url: str
    rate_per_sec: float = 1.0
    burst: int = 1
    concurrency: int = 1
    connect_timeout: float = 5.0
    read_timeout: float = 30.0
    max_attempts: int = 6
    backoff_base: float = 1.0
    backoff_cap: float = 60.0
    breaker_threshold: int = 5
    error_rate_threshold: float = 0.2
    dlq_max_attempts: int = 5
    daily_budget: int | None = None
    freshness_sla_hours: int = 48
    critical: bool = False
    options: dict[str, Any] = field(default_factory=dict)


def load_sources(path: Path | str | None = None) -> dict[str, SourceConfig]:
    data = yaml.safe_load(
        Path(path or os.environ.get("INGEST_SOURCES", DEFAULT_SOURCES)).read_text()
    )
    defaults = data.get("defaults", {})
    fields = SourceConfig.__dataclass_fields__
    out: dict[str, SourceConfig] = {}
    for name, raw in data["sources"].items():
        merged = {**defaults, **raw}
        out[name] = SourceConfig(name=name, **{k: v for k, v in merged.items() if k in fields})
    return out


@dataclass(frozen=True)
class Settings:
    database_url: str
    s3_endpoint: str | None
    s3_bucket: str
    s3_access_key_id: str | None
    s3_secret_access_key: str | None
    s3_region: str
    brapi_token: str | None

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            database_url=os.environ.get("DATABASE_URL", ""),
            s3_endpoint=os.environ.get("S3_ENDPOINT") or None,
            s3_bucket=os.environ.get("S3_BUCKET", "fin-analyst-lake"),
            s3_access_key_id=os.environ.get("S3_ACCESS_KEY_ID") or None,
            s3_secret_access_key=os.environ.get("S3_SECRET_ACCESS_KEY") or None,
            s3_region=os.environ.get("S3_REGION", "auto"),
            brapi_token=os.environ.get("BRAPI_TOKEN") or None,
        )
