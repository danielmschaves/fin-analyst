"""Suíte de falhas do cliente HTTP (critérios R1–R4 e R7 da PoC). Sem rede e sem esperas reais."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from email.utils import format_datetime

import httpx
import pytest
import respx

from fin_ingest.http import (
    BudgetExceeded,
    ClientError,
    NotModified,
    ResilientClient,
    RetriesExhausted,
    SourceDegraded,
    TokenBucket,
    backoff_delay,
    parse_retry_after,
)
from tests.helpers import cfg

URL = "https://fonte.test/dados"


def client(fake_sleep, **overrides) -> ResilientClient:
    return ResilientClient(
        cfg(**overrides), sleep=fake_sleep, clock=fake_sleep.clock, rand=lambda: 0.5
    )


@respx.mock
def test_r1_respeita_retry_after_em_429(fake_sleep):
    respx.get(URL).mock(
        side_effect=[
            httpx.Response(429, headers={"Retry-After": "7"}),
            httpx.Response(200, text="ok"),
        ]
    )
    c = client(fake_sleep)
    assert c.get(URL).text == "ok"
    assert fake_sleep.calls == [7.0]  # esperou pelo menos o Retry-After (o backoff seria 0,5 s)
    assert [e.status for e in c.events] == [429, 200]


@respx.mock
def test_r1_retry_after_como_data_http(fake_sleep):
    when = datetime.now(UTC) + timedelta(seconds=30)
    assert 25 <= parse_retry_after(format_datetime(when, usegmt=True)) <= 30
    assert parse_retry_after("lixo") is None


@respx.mock
def test_r2_5xx_intermitente_recupera_com_backoff_e_jitter(fake_sleep):
    respx.get(URL).mock(
        side_effect=[httpx.Response(503), httpx.Response(502), httpx.Response(200, text="ok")]
    )
    c = client(fake_sleep)
    assert c.get(URL).text == "ok"
    # jitter completo com rand=0,5: 0,5 × min(cap, 1·2^0) e 0,5 × min(cap, 1·2^1)
    assert fake_sleep.calls == [0.5, 1.0]
    assert len(c.events) == 3


def test_r2_backoff_tem_teto_e_jitter():
    assert backoff_delay(10, base=1, cap=60, rand=lambda: 1.0) == 60
    assert backoff_delay(3, base=1, cap=60, rand=lambda: 0.0) == 0
    assert 0 <= backoff_delay(2, base=1, cap=60, rand=__import__("random").random) <= 4


@respx.mock
def test_r3_timeout_esgota_tentativas(fake_sleep):
    route = respx.get(URL).mock(side_effect=httpx.ReadTimeout("lento"))
    c = client(fake_sleep, max_attempts=3)
    with pytest.raises(RetriesExhausted, match="ReadTimeout"):
        c.get(URL)
    assert route.call_count == 3
    assert len(fake_sleep.calls) == 2  # espera entre tentativas, não depois da última


@respx.mock
def test_r4_circuit_breaker_abre_e_para_a_fonte(fake_sleep):
    respx.get(URL).mock(return_value=httpx.Response(500))
    c = client(fake_sleep, max_attempts=2, breaker_threshold=3)
    with pytest.raises(RetriesExhausted):
        c.get(URL)  # 2 falhas
    with pytest.raises(SourceDegraded):
        c.get(URL)  # 3ª falha abre o circuito
    calls = respx.calls.call_count
    with pytest.raises(SourceDegraded):
        c.get(URL)  # circuito aberto: nem chama a fonte
    assert respx.calls.call_count == calls


@respx.mock
def test_r4_sucesso_zera_o_circuito(fake_sleep):
    respx.get(URL).mock(
        side_effect=[
            httpx.Response(500),
            httpx.Response(200),
            httpx.Response(500),
            httpx.Response(200),
        ]
    )
    c = client(fake_sleep, breaker_threshold=2)
    c.get(URL)
    c.get(URL)
    assert c.breaker.open is False


@respx.mock
def test_r7_requisicao_condicional_304(fake_sleep):
    route = respx.get(URL).mock(
        side_effect=[
            httpx.Response(
                200,
                text="arquivo",
                headers={"ETag": '"v1"', "Last-Modified": "Fri, 30 Oct 2026 22:00:00 GMT"},
            ),
            httpx.Response(304),
        ]
    )
    c = client(fake_sleep)
    assert c.get(URL, conditional=True).text == "arquivo"
    with pytest.raises(NotModified):
        c.get(URL, conditional=True)
    second = route.calls[1].request
    assert second.headers["If-None-Match"] == '"v1"'
    assert second.headers["If-Modified-Since"] == "Fri, 30 Oct 2026 22:00:00 GMT"


@respx.mock
def test_4xx_nao_retentavel_e_status_aceito(fake_sleep):
    respx.get(URL).mock(return_value=httpx.Response(404))
    c = client(fake_sleep)
    with pytest.raises(ClientError):
        c.get(URL)
    assert len(c.events) == 1 and fake_sleep.calls == []
    assert c.get(URL, ok_statuses=frozenset({404})).status_code == 404


@respx.mock
def test_orcamento_diario(fake_sleep):
    respx.get(URL).mock(return_value=httpx.Response(200))
    c = ResilientClient(
        cfg(daily_budget=2),
        sleep=fake_sleep,
        clock=fake_sleep.clock,
        today=lambda: date(2026, 10, 30),
    )
    c.get(URL)
    c.get(URL)
    with pytest.raises(BudgetExceeded):
        c.get(URL)
    assert c.calls == 3


def test_token_bucket_limita_taxa(fake_sleep):
    bucket = TokenBucket(rate=2, capacity=2, clock=fake_sleep.clock, sleep=fake_sleep)
    waits = [bucket.acquire() for _ in range(4)]
    assert waits[:2] == [0.0, 0.0]  # rajada
    assert waits[2] == pytest.approx(0.5) and waits[3] == pytest.approx(0.5)  # 2 req/s
