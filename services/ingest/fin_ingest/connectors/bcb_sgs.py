"""Banco Central · SGS: séries temporais (CDI, Selic, IPCA), extração incremental por watermark."""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta

import polars as pl

from ..db import upsert_rows
from .base import Context, UnitResult


class BcbSgsConnector:
    source = "bcb_sgs"
    dataset = "macro_series"
    incremental = True  # toda execução busca só o que é novo (desde o watermark)

    def units(self, ctx: Context) -> list[str]:
        return list(ctx.cfg.options.get("series", {}).keys())

    def process(self, ctx: Context, unit: str) -> UnitResult:
        name = ctx.cfg.options["series"][unit]
        wm = ctx.state.get_watermark(f"last_date:{unit}")
        start = (
            (date.fromisoformat(wm) + timedelta(days=1))
            if wm
            else date.fromisoformat(ctx.cfg.options.get("start", "2020-01-01"))
        )
        end = ctx.args.get("today") or date.today()
        if start > end:
            return UnitResult()
        resp = ctx.client.get(
            f"{ctx.cfg.base_url}bcdata.sgs.{unit}/dados",
            params={
                "formato": "json",
                "dataInicial": f"{start:%d/%m/%Y}",
                "dataFinal": f"{end:%d/%m/%Y}",
            },
            ok_statuses=frozenset({404}),  # o SGS responde 404 quando não há dado no intervalo
        )
        if resp.status_code == 404:
            return UnitResult()
        data = resp.content
        bronze = ctx.lake.put_bronze(
            self.source,
            self.dataset,
            datetime.now().date().isoformat(),
            ctx.run_id,
            f"sgs_{unit}_{start}_{end}.json",
            data,
        )
        items = json.loads(data)
        df = pl.DataFrame(
            {
                "series": [name] * len(items),
                "ref_date": [datetime.strptime(i["data"], "%d/%m/%Y").date() for i in items],
                "value": [float(i["valor"]) for i in items],
            },
            schema={"series": pl.Utf8, "ref_date": pl.Date, "value": pl.Float64},
        )
        if df.is_empty():
            return UnitResult(bytes_in=bronze.size, sha256=bronze.sha256)
        for (y,), part in df.with_columns(pl.col("ref_date").dt.year().alias("_y")).group_by(
            ["_y"]
        ):
            key = {"series": name, "year": y}
            try:
                existing = ctx.lake.read_silver(self.dataset, key)
                part = pl.concat([existing, part.drop("_y")]).unique(
                    subset=["ref_date"], keep="last"
                )
            except Exception:  # noqa: BLE001 — partição ainda não existe
                part = part.drop("_y")
            ctx.lake.write_silver(self.dataset, key, part.sort("ref_date"))
        rows = upsert_rows(ctx.conn, "core.macro_series", ["series", "ref_date"], df)
        ctx.state.set_watermark(f"last_date:{unit}", str(df["ref_date"].max()))
        return UnitResult(rows=rows, bytes_in=bronze.size, sha256=bronze.sha256)
