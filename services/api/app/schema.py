"""Gera o JSON Schema do contrato a partir dos modelos Pydantic.

Uso: python -m app.schema  (grava packages/contracts/portfolio-summary.schema.json)
"""

import json
from pathlib import Path

from .models import PortfolioSummary

CONTRACTS_DIR = Path(__file__).resolve().parents[3] / "packages" / "contracts"
SCHEMA_PATH = CONTRACTS_DIR / "portfolio-summary.schema.json"


def portfolio_schema() -> dict:
    return PortfolioSummary.model_json_schema(by_alias=True)


def render() -> str:
    return json.dumps(portfolio_schema(), indent=2, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    SCHEMA_PATH.write_text(render(), encoding="utf-8")
    print(f"schema gravado: {SCHEMA_PATH}")
