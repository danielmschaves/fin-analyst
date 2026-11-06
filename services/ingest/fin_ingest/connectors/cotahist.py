"""B3 COTAHIST: cotações históricas do mercado inteiro em um arquivo (largura fixa, 245 colunas).

Unidades: `A2025` (arquivo anual, backfill) e `D30102026` (arquivo diário, ddMMaaaa).
Layout oficial (SerHist): registro 01 = cotação; 00 = header; 99 = trailer.
"""

from __future__ import annotations

import io
import zipfile
from datetime import date, datetime

import polars as pl

from ..db import ensure_year_partition, replace_rows
from ..http import NotModified
from ..validate import split_valid
from .base import Context, UnitResult

# (nome, início 1-indexado, fim inclusivo)
LAYOUT: list[tuple[str, int, int]] = [
    ("tipreg", 1, 2),
    ("data", 3, 10),
    ("codbdi", 11, 12),
    ("codneg", 13, 24),
    ("tpmerc", 25, 27),
    ("nomres", 28, 39),
    ("especi", 40, 49),
    ("preabe", 57, 69),
    ("premax", 70, 82),
    ("premin", 83, 95),
    ("premed", 96, 108),
    ("preult", 109, 121),
    ("totneg", 148, 152),
    ("quatot", 153, 170),
    ("voltot", 171, 188),
    ("fatcot", 211, 217),
    ("codisi", 231, 242),
]

PRICE_COLS = {
    "preabe": "open",
    "premax": "high",
    "premin": "low",
    "premed": "avg",
    "preult": "close",
}

RULES = [
    ("ticker vazio", pl.col("ticker").str.len_chars() > 0),
    ("data inválida", pl.col("trade_date").is_not_null()),
    ("fechamento não positivo", pl.col("close") > 0),
    ("máxima abaixo da mínima", pl.col("high") >= pl.col("low")),
]


def parse_cotahist(text: str) -> pl.DataFrame:
    """Converte o texto do arquivo em linhas tipadas (só registros 01)."""
    raw = pl.DataFrame(
        {"line": [ln for ln in text.splitlines() if ln.startswith("01")]}, schema={"line": pl.Utf8}
    )
    cols = [
        pl.col("line").str.slice(start - 1, end - start + 1).str.strip_chars().alias(name)
        for name, start, end in LAYOUT
    ]
    df = raw.select(cols)
    fat = pl.col("fatcot").cast(pl.Int64, strict=False).fill_null(1).clip(lower_bound=1)
    prices = [
        (pl.col(src).cast(pl.Int64, strict=False) / 100 / fat).alias(dst)
        for src, dst in PRICE_COLS.items()
    ]
    return df.select(
        pl.col("codneg").alias("ticker"),
        pl.col("data").str.strptime(pl.Date, "%Y%m%d", strict=False).alias("trade_date"),
        pl.col("codbdi"),
        pl.col("tpmerc"),
        pl.col("nomres").alias("name"),
        pl.col("especi").alias("specification"),
        pl.col("codisi").alias("isin"),
        *prices,
        pl.col("totneg").cast(pl.Int64, strict=False).alias("trades"),
        pl.col("quatot").cast(pl.Int64, strict=False).alias("quantity"),
        (pl.col("voltot").cast(pl.Int64, strict=False) / 100).alias("volume"),
    )


def asset_class(ticker: pl.Expr, codbdi: pl.Expr, spec: pl.Expr) -> pl.Expr:
    """Classe pelo CODBDI, especificação e sufixo do ticker."""
    return (
        pl.when(codbdi == "12")
        .then(pl.lit("FII"))
        .when(spec.str.starts_with("CI") | (codbdi == "14"))
        .then(pl.lit("ETF"))
        .when(spec.str.starts_with("DR"))
        .then(pl.lit("BDR"))
        .otherwise(pl.lit("Ação"))
    )


def unit_for_year(year: int) -> str:
    return f"A{year}"


def unit_for_date(d: date) -> str:
    return f"D{d:%d%m%Y}"


class CotahistConnector:
    source = "cotahist"
    dataset = "prices_daily"
    incremental = False

    def units(self, ctx: Context) -> list[str]:
        units: list[str] = []
        for y in ctx.args.get("years") or []:
            units.append(unit_for_year(int(y)))
        for d in ctx.args.get("dates") or []:
            units.append(unit_for_date(d if isinstance(d, date) else date.fromisoformat(str(d))))
        return units

    def process(self, ctx: Context, unit: str) -> UnitResult:
        url = f"{ctx.cfg.base_url}COTAHIST_{unit}.ZIP"
        try:
            resp = ctx.client.get(url, conditional=True)
        except NotModified:
            return UnitResult(not_modified=True)
        data = resp.content
        dt = datetime.now().date().isoformat()
        bronze = ctx.lake.put_bronze(
            self.source, self.dataset, dt, ctx.run_id, f"COTAHIST_{unit}.ZIP", data
        )

        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            text = zf.read(zf.namelist()[0]).decode("latin-1")

        df = parse_cotahist(text)
        opts = ctx.cfg.options
        df = df.filter(
            pl.col("tpmerc").is_in(opts.get("tpmerc", ["010"]))
            & pl.col("codbdi").is_in(opts.get("codbdi", ["02"]))
        )
        df = df.with_columns(
            asset_class(pl.col("ticker"), pl.col("codbdi"), pl.col("specification")).alias(
                "asset_class"
            )
        )
        valid, invalid = split_valid(df, RULES)

        quarantined = 0
        if not invalid.is_empty():
            year = invalid["trade_date"].drop_nulls().dt.year().min() or 0
            ctx.lake.put_quarantine(self.dataset, {"unit": unit, "year": year}, ctx.run_id, invalid)
            quarantined = invalid.height
        if valid.is_empty():
            return UnitResult(
                rows=0, quarantined=quarantined, bytes_in=bronze.size, sha256=bronze.sha256
            )

        # silver: uma partição por ano/mês, sobrescrita
        valid = valid.with_columns(
            pl.col("trade_date").dt.year().alias("_y"), pl.col("trade_date").dt.month().alias("_m")
        )
        for (y, m), part in valid.group_by(["_y", "_m"]):
            ctx.lake.write_silver(
                self.dataset, {"year": y, "month": f"{m:02d}"}, part.drop(["_y", "_m"])
            )

        # Postgres core: troca o recorte de datas do arquivo, ano a ano (partições)
        prices = valid.select(
            "ticker",
            "trade_date",
            "open",
            "high",
            "low",
            "avg",
            "close",
            "trades",
            "quantity",
            "volume",
        )
        prices = prices.unique(subset=["ticker", "trade_date"], keep="last")
        loaded = 0
        for (y,), part in prices.with_columns(pl.col("trade_date").dt.year().alias("_y")).group_by(
            ["_y"]
        ):
            ensure_year_partition(ctx.conn, "core.prices_daily", int(y))
            lo, hi = part["trade_date"].min(), part["trade_date"].max()
            loaded += replace_rows(
                ctx.conn,
                "core.prices_daily",
                "trade_date BETWEEN %s AND %s",
                (lo, hi),
                part.drop("_y"),
            )

        instruments = (
            valid.sort("trade_date")
            .group_by("ticker")
            .agg(
                pl.col("name").last(),
                pl.col("specification").last(),
                pl.col("isin").last(),
                pl.col("codbdi").last(),
                pl.col("asset_class").last(),
                pl.col("trade_date").min().alias("first_seen"),
                pl.col("trade_date").max().alias("last_seen"),
            )
        )
        _upsert_instruments(ctx, instruments)
        ctx.state.set_watermark("last_trade_date", str(prices["trade_date"].max()))
        return UnitResult(
            rows=loaded, quarantined=quarantined, bytes_in=bronze.size, sha256=bronze.sha256
        )


def _upsert_instruments(ctx: Context, df: pl.DataFrame) -> None:
    """Cadastro: mantém o menor first_seen e o maior last_seen entre execuções (sem varrer preços)."""
    if df.is_empty():
        return
    cols = [
        "ticker",
        "name",
        "specification",
        "isin",
        "codbdi",
        "asset_class",
        "first_seen",
        "last_seen",
    ]
    with ctx.conn.transaction(), ctx.conn.cursor() as cur:
        cur.executemany(
            """INSERT INTO core.instruments (ticker, name, specification, isin, codbdi, asset_class,
                 first_seen, last_seen) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT (ticker) DO UPDATE SET
                 name = CASE WHEN EXCLUDED.last_seen >= core.instruments.last_seen
                             THEN EXCLUDED.name ELSE core.instruments.name END,
                 specification = EXCLUDED.specification, isin = EXCLUDED.isin,
                 codbdi = EXCLUDED.codbdi, asset_class = EXCLUDED.asset_class,
                 first_seen = LEAST(core.instruments.first_seen, EXCLUDED.first_seen),
                 last_seen = GREATEST(core.instruments.last_seen, EXCLUDED.last_seen)""",
            list(df.select(cols).iter_rows()),
        )
