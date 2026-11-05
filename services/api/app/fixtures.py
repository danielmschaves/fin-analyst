import json
import os
from functools import lru_cache
from pathlib import Path

from .models import PortfolioSummary


def fixtures_dir() -> Path:
    """`FIXTURES_DIR` (no Docker) ou `packages/fixtures` no monorepo."""
    env = os.environ.get("FIXTURES_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[3] / "packages" / "fixtures"


@lru_cache
def load_portfolio() -> PortfolioSummary:
    data = json.loads((fixtures_dir() / "portfolio.json").read_text(encoding="utf-8"))
    return PortfolioSummary.model_validate(data)
