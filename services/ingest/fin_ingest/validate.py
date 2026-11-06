"""Validação de linhas antes do silver: as inválidas vão para a quarentena com o motivo."""

from __future__ import annotations

import polars as pl

Rule = tuple[str, pl.Expr]  # (motivo, expressão que é True quando a linha é VÁLIDA)


def split_valid(df: pl.DataFrame, rules: list[Rule]) -> tuple[pl.DataFrame, pl.DataFrame]:
    """Devolve (válidas, inválidas). As inválidas ganham a coluna `_reason` com a primeira regra violada."""
    if df.is_empty():
        return df, df.with_columns(pl.lit(None, dtype=pl.Utf8).alias("_reason"))
    reason = pl.lit(None, dtype=pl.Utf8)
    for name, ok in reversed(rules):
        reason = pl.when(ok.fill_null(False).not_()).then(pl.lit(name)).otherwise(reason)
    marked = df.with_columns(reason.alias("_reason"))
    valid = marked.filter(pl.col("_reason").is_null()).drop("_reason")
    invalid = marked.filter(pl.col("_reason").is_not_null())
    return valid, invalid
