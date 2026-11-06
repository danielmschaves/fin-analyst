"""Geradores de arquivos sintéticos no layout oficial (os reais nunca entram no repo)."""

from __future__ import annotations

import io
import zipfile
from dataclasses import replace

from fin_ingest.config import SourceConfig, load_sources


def cfg(name: str = "test", **overrides) -> SourceConfig:
    base = SourceConfig(
        name=name,
        base_url="https://fonte.test/",
        rate_per_sec=1000,
        burst=1000,
        concurrency=4,
        max_attempts=4,
        backoff_base=1.0,
        backoff_cap=8.0,
        breaker_threshold=10,
    )
    return replace(base, **overrides)


def source_cfg(name: str, **overrides) -> SourceConfig:
    return replace(
        load_sources()[name],
        base_url="https://fonte.test/",
        rate_per_sec=1000,
        burst=1000,
        **overrides,
    )


def _num(value: float, width: int) -> str:
    return str(round(value * 100)).rjust(width, "0")


def cotahist_line(
    ticker: str,
    day: str,  # AAAAMMDD
    close: float,
    codbdi: str = "02",
    tpmerc: str = "010",
    name: str = "EMPRESA",
    spec: str = "ON",
    fatcot: int = 1,
    high: float | None = None,
    low: float | None = None,
) -> str:
    high = close * 1.02 if high is None else high
    low = close * 0.98 if low is None else low
    fields = [
        "01",
        day,
        codbdi.rjust(2),
        ticker.ljust(12),
        tpmerc,
        name.ljust(12)[:12],
        spec.ljust(10)[:10],
        " " * 3,  # PRAZOT
        "R$".ljust(4),  # MODREF
        _num(close, 13),  # PREABE
        _num(high, 13),
        _num(low, 13),
        _num(close, 13),  # PREMED
        _num(close, 13),  # PREULT
        _num(close, 13),  # PREOFC
        _num(close, 13),  # PREOFV
        "00100",  # TOTNEG
        "1000".rjust(18, "0"),  # QUATOT
        _num(close * 1000, 18),  # VOLTOT
        "0" * 13,  # PREEXE
        "0",  # INDOPC
        "99991231",  # DATVEN
        str(fatcot).rjust(7, "0"),  # FATCOT
        "0" * 13,  # PTOEXE
        f"BR{ticker[:4]}ACNOR0"[:12].ljust(12),  # CODISI
        "000",  # DISMES
    ]
    line = "".join(fields)
    assert len(line) == 245, len(line)
    return line


def cotahist_zip(lines: list[str], name: str = "COTAHIST.TXT") -> bytes:
    header = "00COTAHIST.2026BOVESPA 20261031".ljust(245)
    trailer = "99COTAHIST.2026BOVESPA 20261031".ljust(245)
    text = "\n".join([header, *lines, trailer]) + "\n"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(name, text.encode("latin-1"))
    return buf.getvalue()


CVM_HEADER = (
    "CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;ESCALA_MOEDA;ORDEM_EXERC;"
    "DT_INI_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA;ST_CONTA_FIXA"
)


def cvm_row(
    cnpj,
    refer,
    ini,
    fim,
    conta,
    desc,
    valor,
    versao=1,
    ordem="ÚLTIMO",
    escala="MIL",
    nome="VALE S.A.",
):
    return f"{cnpj};{refer};{versao};{nome};4170;DF Consolidado;REAL;{escala};{ordem};{ini};{fim};{conta};{desc};{valor};S"


def cvm_zip(doc: str, year: int, dre_rows: list[str], dfc_rows: list[str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            f"{doc.lower()}_cia_aberta_DRE_con_{year}.csv",
            ("\n".join([CVM_HEADER, *dre_rows]) + "\n").encode("latin-1"),
        )
        zf.writestr(
            f"{doc.lower()}_cia_aberta_DFC_MI_con_{year}.csv",
            ("\n".join([CVM_HEADER, *dfc_rows]) + "\n").encode("latin-1"),
        )
    return buf.getvalue()
