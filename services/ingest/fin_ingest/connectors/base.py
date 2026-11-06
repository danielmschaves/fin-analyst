from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

import psycopg

from ..config import Settings, SourceConfig
from ..db import State
from ..http import ResilientClient
from ..lake import Lake


@dataclass
class UnitResult:
    rows: int = 0
    quarantined: int = 0
    bytes_in: int = 0
    sha256: str | None = None
    not_modified: bool = False


@dataclass
class Context:
    settings: Settings
    cfg: SourceConfig
    client: ResilientClient
    lake: Lake
    conn: psycopg.Connection
    state: State
    run_id: str
    args: dict[str, Any] = field(default_factory=dict)


class Connector(Protocol):
    source: str
    dataset: str
    #: True → toda execução reprocessa a unidade (fontes incrementais por watermark).
    incremental: bool

    def units(self, ctx: Context) -> list[str]: ...

    def process(self, ctx: Context, unit: str) -> UnitResult: ...
