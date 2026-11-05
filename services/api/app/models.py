"""Modelos da API. Espelham `apps/web/lib/contracts.ts` (camelCase no JSON)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

AssetClass = Literal["Ação", "FII", "Renda Fixa"]
DividendEventType = Literal["JCP", "Rendimento", "Dividendos"]


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class PortfolioPosition(Model):
    ticker: str
    name: str
    asset_class: AssetClass
    quantity: float
    price: float | None
    market_value: float
    month_change_pct: float
    score: int | None


class DividendReceived(Model):
    payment_date: str
    ticker: str
    event_type: DividendEventType
    amount: float


class PortfolioMonth(Model):
    result: float
    return_pct: float
    cdi_pct: float
    ibov_pct: float


class PortfolioHistory(Model):
    start_date: str
    portfolio_cumulative: list[float]
    cdi_monthly: list[float]
    ibov_cumulative: list[float]


class PortfolioSummary(Model):
    """`mart_portfolio_summary` + posições, proventos e séries do mês de referência."""

    reference_date: str
    positions: list[PortfolioPosition]
    month: PortfolioMonth
    # to_camel geraria "return12MPct"; o contrato usa "return12mPct".
    return12m_pct: float = Field(alias="return12mPct")
    dividend_yield_pct: float
    dividends: list[DividendReceived]
    history: PortfolioHistory
