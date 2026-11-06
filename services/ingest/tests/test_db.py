"""Integração com Postgres (TEST_DATABASE_URL): R3, R4, R5, R6, R8 e os conectores de ponta a ponta.

HTTP vem do respx (sem rede), S3 do moto e o banco é um postgres:16 local ou do CI.
"""

from __future__ import annotations

import json
from dataclasses import replace
from datetime import date

import httpx
import polars as pl
import pytest
import respx

from fin_ingest import db
from fin_ingest.config import Settings
from fin_ingest.connectors.base import Context
from fin_ingest.connectors.bcb_sgs import BcbSgsConnector
from fin_ingest.connectors.cotahist import CotahistConnector
from fin_ingest.connectors.cvm import CvmConnector
from fin_ingest.http import ResilientClient
from fin_ingest.runner import run
from tests.helpers import cotahist_line, cotahist_zip, cvm_row, cvm_zip, source_cfg

pytestmark = pytest.mark.db

BASE = "https://fonte.test/"
SETTINGS = Settings("", None, "lake", None, None, "auto", None)


def make_ctx(pg, lake, connector, cfg, fake_sleep, args=None) -> Context:
    state = db.State(pg, connector.source, connector.dataset)
    args = args or {}
    run_id = state.start_run(args)
    client = ResilientClient(
        cfg,
        cache=db.DbHttpCache(pg),
        budget=db.DbBudget(pg),
        sleep=fake_sleep,
        clock=fake_sleep.clock,
        rand=lambda: 0.5,
    )
    return Context(SETTINGS, cfg, client, lake, pg, state, run_id, args)


def checksum(pg, table: str) -> tuple[int, str]:
    row = pg.execute(
        f"SELECT count(*), md5(string_agg(t::text, '|' ORDER BY t::text)) FROM {table} t"
    ).fetchone()
    return row[0], row[1]


def year_zip(year: int, extra: list[str] | None = None) -> bytes:
    lines = [
        cotahist_line("VALE3", f"{year}1029", 60.0, name="VALE"),
        cotahist_line("VALE3", f"{year}1030", 61.0, name="VALE"),
        cotahist_line("PETR4", f"{year}1030", 38.5, name="PETROBRAS", spec="PN N2"),
        cotahist_line("MXRF11", f"{year}1030", 9.8, codbdi="12", name="MAXI RENDA", spec="CI"),
        cotahist_line(
            "PETR4F", f"{year}1030", 38.5, codbdi="96", tpmerc="020"
        ),  # fracionário: filtrado
        *(extra or []),
    ]
    return cotahist_zip(lines)


# ───────────────────────── migrations e carga ─────────────────────────


def test_migrate_idempotente(pg):
    db.migrate(pg)
    db.migrate(pg)
    schemas = {
        r[0] for r in pg.execute("SELECT schema_name FROM information_schema.schemata").fetchall()
    }
    assert {"ingest", "core", "marts", "marts_next"} <= schemas


def test_r6_replace_rows_idempotente(pg):
    db.ensure_year_partition(pg, "core.prices_daily", 2026)
    df = pl.DataFrame(
        {
            "ticker": ["VALE3", "PETR4"],
            "trade_date": [date(2026, 10, 30)] * 2,
            "close": [61.0, 38.5],
        }
    )
    for _ in range(2):
        db.replace_rows(pg, "core.prices_daily", "trade_date = %s", (date(2026, 10, 30),), df)
    first = checksum(pg, "core.prices_daily")
    db.replace_rows(pg, "core.prices_daily", "trade_date = %s", (date(2026, 10, 30),), df)
    assert checksum(pg, "core.prices_daily") == first
    assert first[0] == 2


def test_replace_rows_falha_mantem_recorte_antigo(pg):
    db.ensure_year_partition(pg, "core.prices_daily", 2026)
    good = pl.DataFrame({"ticker": ["VALE3"], "trade_date": [date(2026, 10, 30)], "close": [61.0]})
    db.replace_rows(pg, "core.prices_daily", "trade_date = %s", (date(2026, 10, 30),), good)
    bad = pl.DataFrame({"ticker": [None], "trade_date": [date(2026, 10, 30)], "close": [1.0]})
    with pytest.raises(Exception):  # noqa: B017 — ticker NOT NULL derruba o COPY
        db.replace_rows(pg, "core.prices_daily", "trade_date = %s", (date(2026, 10, 30),), bad)
    assert pg.execute("SELECT ticker FROM core.prices_daily").fetchall() == [("VALE3",)]


# ───────────────────────── COTAHIST de ponta a ponta ─────────────────────────


@respx.mock
def test_cotahist_ponta_a_ponta_e_reexecucao(pg, lake, fake_sleep):
    respx.get(f"{BASE}COTAHIST_A2026.ZIP").respond(
        200, content=year_zip(2026), headers={"ETag": '"v1"'}
    )
    cfg = source_cfg("cotahist")
    conn = CotahistConnector()

    report = run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {"years": [2026]}))
    assert report.status == "success" and report.rows_loaded == 4
    assert pg.execute("SELECT count(*) FROM core.prices_daily_y2026").fetchone()[0] == 4
    inst = dict(pg.execute("SELECT ticker, asset_class FROM core.instruments").fetchall())
    assert inst == {"VALE3": "Ação", "PETR4": "Ação", "MXRF11": "FII"}
    assert lake.read_silver("prices_daily", {"year": 2026, "month": "10"}).height == 4
    before = checksum(pg, "core.prices_daily")

    # R5 · retomada: unidade concluída é pulada sem chamar a fonte
    report = run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {"years": [2026]}))
    assert report.units_skipped == 1 and report.api_calls == 0

    # R6/R7 · --force: requisição condicional; 304 não toca no banco
    respx.get(f"{BASE}COTAHIST_A2026.ZIP").respond(304)
    report = run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {"years": [2026]}), force=True)
    assert report.status == "success" and report.rows_loaded == 0
    assert respx.calls.last.request.headers["If-None-Match"] == '"v1"'

    # R6 · mesmo arquivo de novo (sem ETag): mesmas linhas, mesmo checksum; bronze deduplicado
    pg.execute("TRUNCATE ingest.http_cache")
    respx.get(f"{BASE}COTAHIST_A2026.ZIP").respond(200, content=year_zip(2026))
    run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {"years": [2026]}), force=True)
    assert checksum(pg, "core.prices_daily") == before
    objects, _ = lake.size("bronze/cotahist/")
    assert objects == 2  # um arquivo + manifest, apesar de três downloads


@respx.mock
def test_r8_quarentena_carrega_o_resto(pg, lake, fake_sleep):
    bad = cotahist_line("ERRO3", "20261030", 10.0, high=9.0, low=11.0)  # máxima < mínima
    respx.get(f"{BASE}COTAHIST_A2026.ZIP").respond(200, content=year_zip(2026, [bad]))
    conn = CotahistConnector()
    report = run(
        conn, make_ctx(pg, lake, conn, source_cfg("cotahist"), fake_sleep, {"years": [2026]})
    )
    assert report.status == "success"
    assert (report.rows_loaded, report.rows_quarantined) == (4, 1)
    assert (
        pg.execute("SELECT count(*) FROM core.prices_daily WHERE ticker = 'ERRO3'").fetchone()[0]
        == 0
    )
    objects, _ = lake.size("quarantine/prices_daily/")
    assert objects == 1


@respx.mock
def test_r3_r5_falha_vai_para_dlq_e_retomada_reprocessa(pg, lake, fake_sleep):
    respx.get(f"{BASE}COTAHIST_A2025.ZIP").respond(200, content=year_zip(2025))
    route26 = respx.get(f"{BASE}COTAHIST_A2026.ZIP")
    route26.side_effect = httpx.ReadTimeout("lento")
    cfg = source_cfg("cotahist", max_attempts=3, breaker_threshold=10)
    conn = CotahistConnector()

    report = run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {"years": [2025, 2026]}))
    assert report.status == "failed"  # 1 de 2 unidades falhou: acima do limiar de 20%
    assert (report.units_done, report.units_failed) == (1, 1)
    assert route26.call_count == 3  # tentativas com backoff
    assert fake_sleep.calls == [0.5, 1.0]
    dlq = pg.execute("SELECT unit, attempts FROM ingest.dlq").fetchall()
    assert dlq == [("A2026", 1)]
    st = db.State(pg, "cotahist", "prices_daily")
    assert (st.unit_status("A2025"), st.unit_status("A2026")) == ("done", "failed")
    status = pg.execute(
        "SELECT status FROM ingest.runs ORDER BY started_at DESC LIMIT 1"
    ).fetchone()
    assert status == ("failed",)

    # próxima execução (sem argumentos): só a unidade da DLQ volta; 2025 não é baixado de novo
    route26.side_effect = None
    route26.respond(200, content=year_zip(2026))
    report = run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {}))
    assert report.status == "success" and report.units_done == 1
    assert pg.execute("SELECT count(*) FROM ingest.dlq").fetchone()[0] == 0
    assert pg.execute("SELECT count(*) FROM core.prices_daily").fetchone()[0] == 8


@respx.mock
def test_r4_circuito_aberto_degrada_sem_perder_o_que_entrou(pg, lake, fake_sleep):
    respx.get(f"{BASE}COTAHIST_A2024.ZIP").respond(200, content=year_zip(2024))
    respx.get(f"{BASE}COTAHIST_A2025.ZIP").respond(503)
    r26 = respx.get(f"{BASE}COTAHIST_A2026.ZIP").respond(200, content=year_zip(2026))
    cfg = source_cfg("cotahist", max_attempts=6, breaker_threshold=3)
    conn = CotahistConnector()
    report = run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {"years": [2024, 2025, 2026]}))
    assert report.status == "degraded"
    assert (report.units_done, report.units_failed) == (1, 1)
    assert r26.call_count == 0  # a fonte parou de ser chamada
    assert pg.execute("SELECT count(*) FROM core.prices_daily").fetchone()[0] == 4
    assert [r[0] for r in pg.execute("SELECT unit FROM ingest.dlq").fetchall()] == ["A2025"]


# ───────────────────────── CVM ─────────────────────────

VALE = "33.592.510/0001-54"
OUTRA = "11.111.111/0001-11"


@respx.mock
def test_cvm_core_so_com_cnpjs_configurados(pg, lake, fake_sleep):
    dre = [
        cvm_row(VALE, "2026-09-30", "2026-07-01", "2026-09-30", "3.01", "Receita", "52200"),
        cvm_row(VALE, "2026-09-30", "2026-07-01", "2026-09-30", "3.11", "Lucro", "1500"),
        cvm_row(
            OUTRA, "2026-09-30", "2026-07-01", "2026-09-30", "3.01", "Receita", "10", nome="OUTRA"
        ),
    ]
    dfc = [
        cvm_row(
            VALE, "2026-09-30", "2026-01-01", "2026-09-30", "6.01.01.02", "Depreciação", "13800"
        )
    ]
    respx.get(f"{BASE}ITR/DADOS/itr_cia_aberta_2026.zip").respond(
        200, content=cvm_zip("ITR", 2026, dre, dfc)
    )
    respx.get(f"{BASE}DFP/DADOS/dfp_cia_aberta_2026.zip").respond(404)
    conn = CvmConnector()
    cfg = source_cfg("cvm")
    report = run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {"years": [2026]}))
    # DFP do ano corrente ainda não existe: uma unidade falha (404) e vai para a DLQ
    assert (report.units_done, report.units_failed) == (1, 1)
    rows = pg.execute("SELECT line, value::bigint FROM core.fundamentals ORDER BY line").fetchall()
    assert rows == [
        ("depreciation", 13_800_000),
        ("net_income", 1_500_000),
        ("revenue", 52_200_000),
    ]
    # silver guarda todas as companhias
    silver = lake.read_silver("fundamentals", {"doc": "ITR", "year": 2026})
    assert set(silver["cnpj"].to_list()) == {"33592510000154", "11111111000111"}


# ───────────────────────── BCB SGS incremental ─────────────────────────


@respx.mock
def test_bcb_incremental_por_watermark(pg, lake, fake_sleep):
    route = respx.get(f"{BASE}bcdata.sgs.4391/dados")
    route.respond(
        200,
        content=json.dumps(
            [{"data": "01/09/2026", "valor": "1.10"}, {"data": "01/10/2026", "valor": "1.08"}]
        ),
    )
    conn = BcbSgsConnector()
    cfg = source_cfg("bcb_sgs")
    report = run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {"today": date(2026, 10, 31)}))
    assert report.status == "success" and report.rows_loaded == 2
    assert route.calls.last.request.url.params["dataInicial"] == "01/01/2020"

    # segunda execução pede só a partir do dia seguinte ao watermark; 404 = nada novo
    route.respond(404)
    report = run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {"today": date(2026, 11, 5)}))
    assert report.status == "success" and report.rows_loaded == 0
    assert route.calls.last.request.url.params["dataInicial"] == "02/10/2026"
    assert pg.execute("SELECT count(*) FROM core.macro_series").fetchone()[0] == 2

    route.respond(200, content=json.dumps([{"data": "01/11/2026", "valor": "1.05"}]))
    run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {"today": date(2026, 11, 30)}))
    assert pg.execute("SELECT count(*) FROM core.macro_series").fetchone()[0] == 3
    assert lake.read_silver("macro_series", {"series": "cdi_mensal", "year": 2026}).height == 3


def test_ledger_registra_execucao(pg, lake, fake_sleep):
    conn = BcbSgsConnector()
    cfg = replace(source_cfg("bcb_sgs"), options={"series": {}})
    report = run(conn, make_ctx(pg, lake, conn, cfg, fake_sleep, {}))
    row = pg.execute(
        "SELECT status, finished_at IS NOT NULL FROM ingest.runs WHERE run_id = %s",
        (report.run_id,),
    ).fetchone()
    assert row == ("success", True)
