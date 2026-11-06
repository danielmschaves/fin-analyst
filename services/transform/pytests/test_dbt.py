"""dbt de verdade sobre um core sintético: marts no formato dos contratos e publish com sentinela."""

from __future__ import annotations

import os

import pytest

from fin_transform.publish import PublishError, dbt_build, publish
from pytests.synthetic import LAST, seed_core

pytestmark = [pytest.mark.db, pytest.mark.dbt]

VARS = "{min_tickers_last_session: 10}"


@pytest.fixture
def built(pg, pg_url, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", pg_url)
    seed_core(pg)
    publish(pg, lambda: dbt_build(VARS))
    return pg


def q(conn, sql, *params):
    return conn.execute(sql, params).fetchall()


def test_asset_index_e_busca(built):
    rows = dict(q(built, "SELECT ticker, asset_class FROM marts.mart_asset_index"))
    assert len(rows) == 12 and rows["VALE3"] == "Ação" and rows["MXRF11"] == "FII"
    # índice trigram existe e responde à busca por nome
    idx = q(
        built,
        "SELECT indexname FROM pg_indexes WHERE schemaname='marts' AND tablename='mart_asset_index'",
    )
    assert any(name.endswith("_trgm") for (name,) in idx)
    hit = q(
        built,
        "SELECT ticker FROM marts.mart_asset_index WHERE search_text %% 'maxi renda' ORDER BY similarity(search_text, 'maxi renda') DESC LIMIT 1",
    )
    assert hit == [("MXRF11",)]


def test_price_history_diario_no_ultimo_ano_e_semanal_antes(built):
    (daily,) = q(
        built,
        "SELECT count(*) FROM marts.mart_price_history WHERE ticker='VALE3' AND date > %s::date - 365",
        LAST,
    )[0]
    (weekly,) = q(
        built,
        "SELECT count(*) FROM marts.mart_price_history WHERE ticker='VALE3' AND date <= %s::date - 365",
        LAST,
    )[0]
    assert 255 <= daily <= 263
    # jan/2023 até a janela diária (~2,8 anos) → um ponto por semana
    assert 143 <= weekly <= 150
    (last,) = q(built, "SELECT max(date) FROM marts.mart_price_history")[0]
    assert last == LAST


def test_returns_com_cotacao_e_janelas(built):
    r = q(
        built,
        "SELECT price, day_change_pct, r_5d, r_ytd, r_5a FROM marts.mart_asset_returns WHERE ticker='VALE3'",
    )[0]
    price, day, r5d, ytd, r5a = r
    assert price > 50 and day > 0 and r5d > 0 and ytd > 0
    assert r5a is None  # só 3 anos de histórico
    flat = q(built, "SELECT r_1a FROM marts.mart_asset_returns WHERE ticker='MXRF11'")[0][0]
    assert flat == 0


def test_fundamentals_trimestre_isolado_4t_e_depreciacao(built):
    rows = {
        r[0]: r[1:]
        for r in q(
            built,
            "SELECT quarter, revenue, cost, net_income, depreciation FROM marts.mart_fundamentals_quarterly WHERE ticker='VALE3' ORDER BY quarter_end",
        )
    }
    assert list(rows) == ["1T25", "2T25", "3T25", "4T25", "1T26", "2T26", "3T26"]
    assert rows["1T25"] == (51.0, -30.0, 5.0, 4.0)
    # 4T = anual − (1T+2T+3T): receita 210 − 156; custo −125 − (−90); lucro 22 − 15; DFC 17 − 12
    assert rows["4T25"] == (54.0, -35.0, 7.0, 5.0)
    assert rows["3T26"][3] == 4.0  # acumulado 12 − 8


def test_p1_sentinela_falha_e_marts_fica_intacto(built):
    before = q(built, "SELECT count(*) FROM marts.mart_price_history")
    built.execute("DELETE FROM core.prices_daily WHERE ticker <> 'VALE3'")  # mudaria os marts
    with pytest.raises(PublishError, match="marts não foi alterado"):
        publish(built, lambda: dbt_build(VARS[:-1] + ", poc_sentinel: true}"))
    assert q(built, "SELECT count(*) FROM marts.mart_price_history") == before


def test_volume_minimo_bloqueia_publicacao(built):
    with pytest.raises(PublishError):
        publish(built, lambda: dbt_build("{min_tickers_last_session: 300}"))
    assert os.environ["DATABASE_URL"]
