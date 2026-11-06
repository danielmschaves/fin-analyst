"""Core sintético para o dbt: N ativos com pregões em dias úteis e a DRE/DFC da VALE3."""

from __future__ import annotations

from datetime import date, timedelta

import psycopg

LAST = date(2026, 10, 30)
VALE = "33592510000154"


def business_days(start: date, end: date):
    d = start
    while d <= end:
        if d.weekday() < 5:
            yield d
        d += timedelta(days=1)


def seed_core(conn: psycopg.Connection, n_tickers: int = 12, years: int = 3) -> None:
    start = date(LAST.year - years, 1, 2)
    days = list(business_days(start, LAST))
    tickers = ["VALE3", "MXRF11"] + [f"TST{i:02d}3"[:6] for i in range(n_tickers - 2)]
    for y in range(start.year, LAST.year + 1):
        conn.execute(
            f"CREATE TABLE IF NOT EXISTS core.prices_daily_y{y} PARTITION OF core.prices_daily "
            f"FOR VALUES FROM ('{y}-01-01') TO ('{y + 1}-01-01')"
        )
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO core.instruments VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            [
                (
                    t,
                    "VALE" if t == "VALE3" else ("MAXI RENDA" if t == "MXRF11" else f"EMPRESA {t}"),
                    "CI" if t == "MXRF11" else "ON",
                    None,
                    "12" if t == "MXRF11" else "02",
                    "FII" if t == "MXRF11" else "Ação",
                    start,
                    LAST,
                )
                for t in tickers
            ],
        )
        with cur.copy("COPY core.prices_daily (ticker, trade_date, close) FROM STDIN") as copy:
            for t in tickers:
                for i, d in enumerate(days):
                    # VALE3 sobe 0,1 por pregão a partir de 50; os outros ficam em 10
                    copy.write_row((t, d, 50 + 0.1 * i if t == "VALE3" else 10.0))
        # Fatos (R$): ITR 1T–3T de 2025 e 2026 em 3 meses; DFP 2025 anual; DFC acumulado.
        rows = []
        for fy in (2025, 2026):
            for q in (1, 2, 3):
                ps, pe = date(fy, 3 * q - 2, 1), _q_end(fy, q)
                rows += [
                    (VALE, "VALE", "ITR", "DRE", ps, pe, "revenue", 50e9 + q * 1e9),
                    (VALE, "VALE", "ITR", "DRE", ps, pe, "cost", -30e9),
                    (VALE, "VALE", "ITR", "DRE", ps, pe, "net_income", 5e9),
                    (VALE, "VALE", "ITR", "DFC", date(fy, 1, 1), pe, "depreciation", 4e9 * q),
                ]
        rows += [
            (VALE, "VALE", "DFP", "DRE", date(2025, 1, 1), date(2025, 12, 31), "revenue", 210e9),
            (VALE, "VALE", "DFP", "DRE", date(2025, 1, 1), date(2025, 12, 31), "cost", -125e9),
            (VALE, "VALE", "DFP", "DRE", date(2025, 1, 1), date(2025, 12, 31), "net_income", 22e9),
            (
                VALE,
                "VALE",
                "DFP",
                "DFC",
                date(2025, 1, 1),
                date(2025, 12, 31),
                "depreciation",
                17e9,
            ),
        ]
        cur.executemany("INSERT INTO core.fundamentals VALUES (%s,%s,%s,%s,%s,%s,%s,%s)", rows)


def _q_end(fy: int, q: int) -> date:
    return date(fy, 3 * q, {3: 31, 6: 30, 9: 30, 12: 31}[3 * q])
