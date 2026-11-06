"""brapi.dev · proventos em dinheiro por ticker, com orçamento diário de chamadas."""

from __future__ import annotations

import json
from datetime import date, datetime

import polars as pl

from ..db import upsert_rows
from .base import Context, UnitResult


def _date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        return None


class BrapiDividendsConnector:
    source = "brapi"
    dataset = "dividends"
    incremental = True

    def skip_reason(self, ctx: Context) -> str | None:
        return None if ctx.settings.brapi_token else "BRAPI_TOKEN ausente"

    def units(self, ctx: Context) -> list[str]:
        return list(ctx.args.get("tickers") or ctx.cfg.options.get("tickers", []))

    def process(self, ctx: Context, unit: str) -> UnitResult:
        resp = ctx.client.get(
            f"{ctx.cfg.base_url}quote/{unit}",
            params={"dividends": "true", "token": ctx.settings.brapi_token or ""},
        )
        data = resp.content
        bronze = ctx.lake.put_bronze(
            self.source,
            self.dataset,
            datetime.now().date().isoformat(),
            ctx.run_id,
            f"{unit}.json",
            data,
        )
        results = json.loads(data).get("results") or [{}]
        cash = ((results[0].get("dividendsData") or {}).get("cashDividends")) or []
        rows = [
            {
                "ticker": unit,
                "ex_date": _date(c.get("lastDatePrior")),
                "payment_date": _date(c.get("paymentDate")),
                "kind": (c.get("label") or "PROVENTO").upper(),
                "value": float(c.get("rate") or 0),
            }
            for c in cash
        ]
        df = pl.DataFrame(
            rows,
            schema={
                "ticker": pl.Utf8,
                "ex_date": pl.Date,
                "payment_date": pl.Date,
                "kind": pl.Utf8,
                "value": pl.Float64,
            },
        )
        df = df.filter(pl.col("ex_date").is_not_null() & (pl.col("value") > 0)).unique(
            subset=["ticker", "ex_date", "kind"], keep="last"
        )
        if not df.is_empty():
            ctx.lake.write_silver(self.dataset, {"ticker": unit}, df)
        n = upsert_rows(ctx.conn, "core.dividends", ["ticker", "ex_date", "kind"], df)
        return UnitResult(rows=n, bytes_in=bronze.size, sha256=bronze.sha256)
