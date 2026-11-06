"""CVM Dados Abertos: DFP (anual) e ITR (trimestral) das companhias abertas.

Unidades: `ITR2025`, `DFP2024`. O arquivo do ano inteiro (todas as companhias) vai para o bronze e
para o silver (prova de volume); o core recebe só os CNPJs configurados.

Guardamos os fatos como reportados:
- ITR · DRE do trimestre isolado (3 meses) e DFC acumulado no ano;
- DFP · DRE e DFC do ano.
O 4º trimestre (anual − 9 meses) e a depreciação por trimestre (diferença de acumulados) saem no dbt.
"""

from __future__ import annotations

import io
import re
import zipfile
from datetime import datetime

import polars as pl

from ..db import replace_rows
from ..http import NotModified
from ..validate import split_valid
from .base import Context, UnitResult

DRE_LINES = {
    "3.01": "revenue",
    "3.02": "cost",
    "3.04": "opex",
    "3.06": "financial",
    "3.11": "net_income",
}
DEPRECIATION = r"(?i)deprecia|amortiza|exaust"

RULES = [
    ("cnpj inválido", pl.col("cnpj").str.len_chars() == 14),
    ("período inválido", pl.col("period_end") >= pl.col("period_start")),
    ("valor ausente", pl.col("value").is_not_null()),
]


def parse_unit(unit: str) -> tuple[str, int]:
    m = re.fullmatch(r"(ITR|DFP)(\d{4})", unit)
    if not m:
        raise ValueError(f"unidade inválida: {unit}")
    return m.group(1), int(m.group(2))


def read_statement(raw: bytes) -> pl.DataFrame:
    """CSV da CVM (;, latin-1) → colunas tipadas, só a versão mais recente e o exercício ÚLTIMO."""
    df = pl.read_csv(
        io.StringIO(raw.decode("latin-1")),
        separator=";",
        infer_schema=False,
        quote_char='"',
    )
    df = df.filter(pl.col("ORDEM_EXERC").str.to_uppercase().str.starts_with("ÚLTIMO"))
    df = df.with_columns(
        pl.col("CNPJ_CIA").str.replace_all(r"\D", "").alias("cnpj"),
        pl.col("DENOM_CIA").alias("company"),
        pl.col("VERSAO").cast(pl.Int64, strict=False).alias("versao"),
        pl.col("DT_REFER").str.strptime(pl.Date, "%Y-%m-%d", strict=False).alias("dt_refer"),
        pl.col("DT_INI_EXERC")
        .str.strptime(pl.Date, "%Y-%m-%d", strict=False)
        .alias("period_start"),
        pl.col("DT_FIM_EXERC").str.strptime(pl.Date, "%Y-%m-%d", strict=False).alias("period_end"),
        pl.col("CD_CONTA").alias("cd_conta"),
        pl.col("DS_CONTA").alias("ds_conta"),
        (
            pl.col("VL_CONTA").cast(pl.Float64, strict=False)
            * pl.when(pl.col("ESCALA_MOEDA").str.to_uppercase() == "MIL").then(1000).otherwise(1)
        ).alias("value"),
    )
    latest = df.group_by(["cnpj", "dt_refer"]).agg(pl.col("versao").max().alias("_v"))
    df = df.join(latest, on=["cnpj", "dt_refer"]).filter(pl.col("versao") == pl.col("_v"))
    return df.select(
        "cnpj", "company", "dt_refer", "period_start", "period_end", "cd_conta", "ds_conta", "value"
    )


def to_facts(dre: pl.DataFrame, dfc: pl.DataFrame, doc: str) -> pl.DataFrame:
    """Linhas normalizadas (receita, custo, … , depreciação) no formato de `core.fundamentals`."""
    if doc == "ITR":
        # trimestre isolado: o ITR traz o trimestre (3 meses) e o acumulado; ficamos com 3 meses
        months = pl.col("period_end").dt.month() - pl.col("period_start").dt.month()
        dre = dre.filter(months == 2)
    dre_facts = dre.filter(pl.col("cd_conta").is_in(list(DRE_LINES))).with_columns(
        pl.col("cd_conta").replace(DRE_LINES).alias("line"), pl.lit("DRE").alias("statement")
    )
    dep = (
        dfc.filter(
            pl.col("cd_conta").str.starts_with("6.01.01")
            & pl.col("ds_conta").str.contains(DEPRECIATION)
        )
        .group_by(["cnpj", "company", "period_start", "period_end"])
        .agg(pl.col("value").sum())
        .with_columns(pl.lit("depreciation").alias("line"), pl.lit("DFC").alias("statement"))
    )
    cols = ["cnpj", "company", "statement", "period_start", "period_end", "line", "value"]
    out = pl.concat([dre_facts.select(cols), dep.select(cols)], how="vertical")
    out = out.group_by(["cnpj", "statement", "period_start", "period_end", "line"]).agg(
        pl.col("company").last(), pl.col("value").sum()
    )
    return out.with_columns(pl.lit(doc).alias("doc")).select(
        "cnpj", "company", "doc", "statement", "period_start", "period_end", "line", "value"
    )


class CvmConnector:
    source = "cvm"
    dataset = "fundamentals"
    incremental = False

    def units(self, ctx: Context) -> list[str]:
        units = []
        for y in ctx.args.get("years") or []:
            units += [f"ITR{y}", f"DFP{y}"]
        return units

    def process(self, ctx: Context, unit: str) -> UnitResult:
        doc, year = parse_unit(unit)
        url = f"{ctx.cfg.base_url}{doc}/DADOS/{doc.lower()}_cia_aberta_{year}.zip"
        try:
            resp = ctx.client.get(url, conditional=True)
        except NotModified:
            return UnitResult(not_modified=True)
        data = resp.content
        dt = datetime.now().date().isoformat()
        bronze = ctx.lake.put_bronze(
            self.source, self.dataset, dt, ctx.run_id, url.rsplit("/", 1)[-1], data
        )

        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            names = zf.namelist()

            def member(kind: str) -> bytes:
                name = f"{doc.lower()}_cia_aberta_{kind}_con_{year}.csv"
                if name not in names:
                    raise FileNotFoundError(f"{name} não está em {url}")
                return zf.read(name)

            dre = read_statement(member("DRE"))
            dfc = read_statement(member("DFC_MI"))

        facts = to_facts(dre, dfc, doc)
        valid, invalid = split_valid(facts, RULES)
        # silver: todas as companhias (volume completo), sobrescrito por documento e ano
        ctx.lake.write_silver(self.dataset, {"doc": doc, "year": year}, valid)
        quarantined = 0
        if not invalid.is_empty():
            ctx.lake.put_quarantine(self.dataset, {"doc": doc, "year": year}, ctx.run_id, invalid)
            quarantined = invalid.height

        cnpjs = list(ctx.cfg.options.get("cnpjs", {}).keys())
        core = valid.filter(pl.col("cnpj").is_in(cnpjs)) if cnpjs else valid
        rows = replace_rows(
            ctx.conn,
            "core.fundamentals",
            "doc = %s AND extract(year FROM period_end) = %s AND cnpj = ANY(%s)",
            (doc, year, cnpjs or core["cnpj"].unique().to_list()),
            core,
        )
        return UnitResult(
            rows=rows, quarantined=quarantined, bytes_in=bronze.size, sha256=bronze.sha256
        )
