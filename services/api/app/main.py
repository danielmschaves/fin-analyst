from fastapi import FastAPI

from .fixtures import load_portfolio
from .models import PortfolioSummary

app = FastAPI(title="fin-analyst API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/portfolio", response_model=PortfolioSummary, response_model_by_alias=True)
def portfolio() -> PortfolioSummary:
    """Fase 1: devolve o fixture de exemplo. Fase 2: lê os marts do dbt no Postgres."""
    return load_portfolio()
