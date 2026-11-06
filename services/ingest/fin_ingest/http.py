"""Cliente HTTP comum a todas as fontes.

- timeouts de conexão e leitura;
- retry em erro de rede, 429 e 5xx com backoff exponencial e jitter completo, respeitando Retry-After;
- token bucket (taxa por fonte) e limite de concorrência;
- circuit breaker por fonte: N falhas seguidas → `SourceDegraded`;
- requisições condicionais (ETag / Last-Modified) → `NotModified` quando nada mudou;
- orçamento diário de chamadas → `BudgetExceeded`.

`sleep`, `clock` e `rand` são injetáveis para os testes não esperarem de verdade.
"""

from __future__ import annotations

import random
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from email.utils import parsedate_to_datetime
from typing import Protocol

import httpx

from .config import SourceConfig

RETRYABLE_STATUS = {408, 425, 429, 500, 502, 503, 504}


class IngestHTTPError(Exception):
    """Erro de HTTP da fonte."""


class NotModified(IngestHTTPError):
    """304: o recurso não mudou desde a última requisição condicional."""


class SourceDegraded(IngestHTTPError):
    """Circuito aberto: a fonte falhou repetidamente nesta execução."""


class BudgetExceeded(IngestHTTPError):
    """O orçamento diário de chamadas da fonte acabou."""


class RetriesExhausted(IngestHTTPError):
    """Tentativas esgotadas para a mesma requisição."""


class ClientError(IngestHTTPError):
    """4xx não retentável (ex.: 404, 401)."""

    def __init__(self, status: int, url: str):
        super().__init__(f"HTTP {status} em {url}")
        self.status = status


def backoff_delay(attempt: int, base: float, cap: float, rand: Callable[[], float]) -> float:
    """Jitter completo: random(0, min(cap, base * 2^attempt)). `attempt` começa em 0."""
    return rand() * min(cap, base * (2**attempt))


def parse_retry_after(value: str | None, now: datetime | None = None) -> float | None:
    """Retry-After em segundos ou como data HTTP. None quando ausente ou inválido."""
    if not value:
        return None
    value = value.strip()
    if value.isdigit():
        return float(value)
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    now = now or datetime.now(UTC)
    return max(0.0, (when - now).total_seconds())


class TokenBucket:
    """Limita a taxa de requisições: `rate` por segundo, rajada de até `capacity`."""

    def __init__(self, rate: float, capacity: int, clock=time.monotonic, sleep=time.sleep):
        self.rate = rate
        self.capacity = max(1, capacity)
        self.tokens = float(self.capacity)
        self.clock = clock
        self.sleep = sleep
        self.updated = clock()
        self.lock = threading.Lock()

    def acquire(self) -> float:
        """Consome um token, esperando se preciso. Devolve quanto esperou."""
        with self.lock:
            now = self.clock()
            self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
            self.updated = now
            waited = 0.0
            if self.tokens < 1:
                waited = (1 - self.tokens) / self.rate
                self.sleep(waited)
                self.tokens = 1.0
                self.updated = self.clock()
            self.tokens -= 1
            return waited


class CircuitBreaker:
    """Abre depois de `threshold` falhas seguidas; um sucesso zera a contagem."""

    def __init__(self, threshold: int):
        self.threshold = threshold
        self.failures = 0
        self.open = False

    def check(self, source: str) -> None:
        if self.open:
            raise SourceDegraded(f"circuito aberto para {source}")

    def success(self) -> None:
        self.failures = 0

    def failure(self) -> None:
        self.failures += 1
        if self.failures >= self.threshold:
            self.open = True


class HttpCache(Protocol):
    def get(self, key: str) -> tuple[str | None, str | None]: ...
    def put(self, key: str, etag: str | None, last_modified: str | None) -> None: ...


class Budget(Protocol):
    def consume(self, source: str, day: date) -> int: ...


class MemoryCache:
    def __init__(self) -> None:
        self.data: dict[str, tuple[str | None, str | None]] = {}

    def get(self, key: str) -> tuple[str | None, str | None]:
        return self.data.get(key, (None, None))

    def put(self, key: str, etag: str | None, last_modified: str | None) -> None:
        self.data[key] = (etag, last_modified)


class MemoryBudget:
    def __init__(self) -> None:
        self.calls: dict[tuple[str, date], int] = {}

    def consume(self, source: str, day: date) -> int:
        k = (source, day)
        self.calls[k] = self.calls.get(k, 0) + 1
        return self.calls[k]


@dataclass
class HttpEvent:
    """Uma tentativa de requisição (vai para o ledger e para os testes)."""

    url: str
    attempt: int
    status: int | None
    error: str | None
    waited: float


@dataclass
class ResilientClient:
    cfg: SourceConfig
    cache: HttpCache = field(default_factory=MemoryCache)
    budget: Budget = field(default_factory=MemoryBudget)
    transport: httpx.BaseTransport | None = None
    sleep: Callable[[float], None] = time.sleep
    clock: Callable[[], float] = time.monotonic
    rand: Callable[[], float] = random.random
    today: Callable[[], date] = date.today

    def __post_init__(self) -> None:
        self.bucket = TokenBucket(self.cfg.rate_per_sec, self.cfg.burst, self.clock, self.sleep)
        self.breaker = CircuitBreaker(self.cfg.breaker_threshold)
        self.semaphore = threading.BoundedSemaphore(self.cfg.concurrency)
        self.events: list[HttpEvent] = []
        self.calls = 0
        self.client = httpx.Client(
            transport=self.transport,
            timeout=httpx.Timeout(self.cfg.read_timeout, connect=self.cfg.connect_timeout),
            follow_redirects=True,
            headers={"User-Agent": "fin-analyst-ingest/0.1"},
        )

    def close(self) -> None:
        self.client.close()

    def _consume_budget(self) -> None:
        used = self.budget.consume(self.cfg.name, self.today())
        self.calls += 1
        if self.cfg.daily_budget is not None and used > self.cfg.daily_budget:
            raise BudgetExceeded(
                f"orçamento diário de {self.cfg.name} esgotado ({self.cfg.daily_budget})"
            )

    def get(
        self,
        url: str,
        params: dict | None = None,
        conditional: bool = False,
        ok_statuses: frozenset[int] = frozenset(),
    ) -> httpx.Response:
        """GET com todas as proteções. `ok_statuses` são status 4xx tratados como resposta válida."""
        headers: dict[str, str] = {}
        cache_key = url if not params else f"{url}?{httpx.QueryParams(params)}"
        if conditional:
            etag, last_modified = self.cache.get(cache_key)
            if etag:
                headers["If-None-Match"] = etag
            if last_modified:
                headers["If-Modified-Since"] = last_modified

        last_error: str | None = None
        for attempt in range(self.cfg.max_attempts):
            self.breaker.check(self.cfg.name)
            self._consume_budget()
            waited = self.bucket.acquire()
            status: int | None = None
            retry_after: float | None = None
            try:
                with self.semaphore:
                    resp = self.client.get(url, params=params, headers=headers)
                status = resp.status_code
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = f"{type(exc).__name__}: {exc}"
                resp = None

            if resp is not None:
                if status == 304:
                    self.breaker.success()
                    self.events.append(HttpEvent(url, attempt, status, None, waited))
                    raise NotModified(url)
                if status < 400 or status in ok_statuses:
                    self.breaker.success()
                    self.events.append(HttpEvent(url, attempt, status, None, waited))
                    if conditional and status < 400:
                        self.cache.put(
                            cache_key, resp.headers.get("ETag"), resp.headers.get("Last-Modified")
                        )
                    return resp
                if status not in RETRYABLE_STATUS:
                    self.events.append(HttpEvent(url, attempt, status, "não retentável", waited))
                    raise ClientError(status, url)
                last_error = f"HTTP {status}"
                retry_after = parse_retry_after(resp.headers.get("Retry-After"))

            self.breaker.failure()
            self.events.append(HttpEvent(url, attempt, status, last_error, waited))
            if attempt == self.cfg.max_attempts - 1:
                break
            self.breaker.check(self.cfg.name)
            delay = backoff_delay(attempt, self.cfg.backoff_base, self.cfg.backoff_cap, self.rand)
            if retry_after is not None:
                delay = max(delay, retry_after)
            self.sleep(delay)

        raise RetriesExhausted(
            f"{url}: {self.cfg.max_attempts} tentativas; último erro: {last_error}"
        )
