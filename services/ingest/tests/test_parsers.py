"""Parsers no layout oficial, com arquivos sintéticos."""

from __future__ import annotations

import io
import zipfile
from datetime import date

import polars as pl

from fin_ingest.connectors.cotahist import asset_class, parse_cotahist
from fin_ingest.connectors.cvm import read_statement, to_facts
from tests.helpers import cotahist_line, cotahist_zip, cvm_row, cvm_zip


def test_cotahist_layout_e_precos():
    text = (
        zipfile.ZipFile(
            io.BytesIO(
                cotahist_zip(
                    [
                        cotahist_line("VALE3", "20261030", 60.25, high=61.0, low=59.5),
                        cotahist_line("PETR4", "20261030", 38.5, fatcot=1),
                        cotahist_line("XPTO3", "20261030", 2000.0, fatcot=1000),
                    ]
                )
            )
        )
        .read("COTAHIST.TXT")
        .decode("latin-1")
    )
    df = parse_cotahist(text)
    assert df.height == 3  # header e trailer ignorados
    vale = df.filter(pl.col("ticker") == "VALE3").row(0, named=True)
    assert vale["trade_date"] == date(2026, 10, 30)
    assert (vale["close"], vale["high"], vale["low"]) == (60.25, 61.0, 59.5)
    assert vale["codbdi"] == "02" and vale["tpmerc"] == "010"
    assert vale["volume"] == 60250.0 and vale["quantity"] == 1000
    # fator de cotação: preço por lote de 1.000 vira preço unitário
    assert df.filter(pl.col("ticker") == "XPTO3")["close"].item() == 2.0


def test_cotahist_classe_do_ativo():
    df = pl.DataFrame(
        {
            "ticker": ["VALE3", "MXRF11", "BOVA11", "AAPL34"],
            "codbdi": ["02", "12", "14", "02"],
            "spec": ["ON NM", "CI", "CI", "DRN"],
        }
    )
    out = df.select(asset_class(pl.col("ticker"), pl.col("codbdi"), pl.col("spec")).alias("c"))[
        "c"
    ].to_list()
    assert out == ["Ação", "FII", "ETF", "BDR"]


CNPJ = "33.592.510/0001-54"


def test_cvm_versao_mais_recente_escala_e_exercicio():
    raw = "\n".join(
        [
            "CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;ESCALA_MOEDA;ORDEM_EXERC;DT_INI_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA;ST_CONTA_FIXA",
            cvm_row(
                CNPJ, "2026-09-30", "2026-07-01", "2026-09-30", "3.01", "Receita", "50000", versao=1
            ),
            cvm_row(
                CNPJ, "2026-09-30", "2026-07-01", "2026-09-30", "3.01", "Receita", "52200", versao=2
            ),
            cvm_row(
                CNPJ,
                "2026-09-30",
                "2025-07-01",
                "2025-09-30",
                "3.01",
                "Receita",
                "53100",
                versao=2,
                ordem="PENÚLTIMO",
            ),
            cvm_row(
                "61.532.644/0001-15",
                "2026-09-30",
                "2026-07-01",
                "2026-09-30",
                "3.01",
                "Receita",
                "1000",
                escala="UNIDADE",
                nome="ITAUSA",
            ),
        ]
    ).encode("latin-1")
    df = read_statement(raw)
    vale = df.filter(pl.col("cnpj") == "33592510000154")
    assert (
        vale.height == 1 and vale["value"].item() == 52_200_000
    )  # versão 2, MIL → ×1000, sem PENÚLTIMO
    assert df.filter(pl.col("cnpj") == "61532644000115")["value"].item() == 1000


def test_cvm_fatos_itr_trimestre_isolado_e_depreciacao():
    z = zipfile.ZipFile(
        io.BytesIO(
            cvm_zip(
                "ITR",
                2026,
                [
                    cvm_row(
                        CNPJ, "2026-09-30", "2026-07-01", "2026-09-30", "3.01", "Receita", "52200"
                    ),
                    cvm_row(
                        CNPJ, "2026-09-30", "2026-01-01", "2026-09-30", "3.01", "Receita", "149000"
                    ),
                    cvm_row(
                        CNPJ,
                        "2026-09-30",
                        "2026-07-01",
                        "2026-09-30",
                        "3.11",
                        "Lucro consolidado",
                        "1500",
                    ),
                    cvm_row(CNPJ, "2026-09-30", "2026-07-01", "2026-09-30", "3.99", "Outra", "1"),
                ],
                [
                    cvm_row(
                        CNPJ,
                        "2026-09-30",
                        "2026-01-01",
                        "2026-09-30",
                        "6.01.01.02",
                        "Depreciação, amortização e exaustão",
                        "13800",
                    ),
                    cvm_row(
                        CNPJ,
                        "2026-09-30",
                        "2026-01-01",
                        "2026-09-30",
                        "6.01.01.01",
                        "Lucro líquido",
                        "4000",
                    ),
                ],
            )
        )
    )
    facts = to_facts(
        read_statement(z.read("itr_cia_aberta_DRE_con_2026.csv")),
        read_statement(z.read("itr_cia_aberta_DFC_MI_con_2026.csv")),
        "ITR",
    )
    by = {(r["statement"], r["line"]): r for r in facts.iter_rows(named=True)}
    assert by[("DRE", "revenue")]["value"] == 52_200_000
    assert by[("DRE", "revenue")]["period_start"] == date(2026, 7, 1)  # só o trimestre isolado
    assert by[("DRE", "net_income")]["value"] == 1_500_000
    assert ("DRE", "3.99") not in by and len([k for k in by if k[0] == "DRE"]) == 2
    # DFC do ITR é acumulado no ano; o trimestre sai por diferença no dbt
    dep = by[("DFC", "depreciation")]
    assert dep["value"] == 13_800_000 and dep["period_start"] == date(2026, 1, 1)
    assert set(facts["doc"].to_list()) == {"ITR"}
