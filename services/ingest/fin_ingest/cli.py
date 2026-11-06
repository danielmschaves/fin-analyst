"""CLI de ingestão. Cada job do orquestrador (GitHub Actions hoje) é um comando daqui."""

from __future__ import annotations

from datetime import date, timedelta

import typer

from . import db as dbmod
from .config import Settings, load_sources
from .connectors.base import Context
from .connectors.bcb_sgs import BcbSgsConnector
from .connectors.brapi import BrapiDividendsConnector
from .connectors.cotahist import CotahistConnector
from .connectors.cvm import CvmConnector
from .http import ResilientClient
from .lake import Lake, make_s3_client
from .runner import run as run_connector

app = typer.Typer(
    help="Ingestão do fin-analyst: fontes → lake (R2) → Postgres core.", no_args_is_help=True
)
db_app = typer.Typer(help="Banco: schemas, papéis e tabelas.", no_args_is_help=True)
app.add_typer(db_app, name="db")

CONNECTORS = {
    "cotahist": CotahistConnector,
    "cvm": CvmConnector,
    "bcb_sgs": BcbSgsConnector,
    "brapi": BrapiDividendsConnector,
}


def previous_business_day(today: date) -> date:
    d = today - timedelta(days=1)
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d


@db_app.command("migrate")
def migrate() -> None:
    """Aplica as migrations (idempotente)."""
    conn = dbmod.connect(Settings.from_env().database_url)
    for name in dbmod.migrate(conn):
        typer.echo(f"aplicada: {name}")


@app.command("run")
def run(
    source: str = typer.Argument(..., help=f"Fonte: {', '.join(CONNECTORS)}"),
    year: list[int] = typer.Option([], "--year", help="Ano(s) de arquivo (COTAHIST/CVM)."),
    on_date: list[str] = typer.Option([], "--date", help="Data(s) AAAA-MM-DD (COTAHIST diário)."),
    daily: bool = typer.Option(False, "--daily", help="COTAHIST do último dia útil (D-1)."),
    force: bool = typer.Option(False, "--force", help="Reprocessa unidades já concluídas."),
    base_url: str | None = typer.Option(
        None, "--base-url", help="Sobrescreve a URL da fonte (drills)."
    ),
) -> None:
    """Executa uma fonte. Sai com 1 se o status for `failed` (ou `degraded` numa fonte crítica)."""
    if source not in CONNECTORS:
        raise typer.BadParameter(f"fonte desconhecida: {source}")
    settings = Settings.from_env()
    cfg = load_sources()[source]
    if base_url:
        from dataclasses import replace

        cfg = replace(cfg, base_url=base_url)
    conn = dbmod.connect(settings.database_url)
    connector = CONNECTORS[source]()
    state = dbmod.State(conn, connector.source, connector.dataset)
    dates = list(on_date)
    if daily:
        dates.append(previous_business_day(date.today()).isoformat())
    args = {"years": year, "dates": dates, "force": force}
    run_id = state.start_run(args)
    client = ResilientClient(cfg, cache=dbmod.DbHttpCache(conn), budget=dbmod.DbBudget(conn))
    lake = Lake(make_s3_client(settings), settings.s3_bucket)
    ctx = Context(settings, cfg, client, lake, conn, state, run_id, args)
    try:
        report = run_connector(connector, ctx, force=force)
    finally:
        client.close()
    typer.echo(
        f"{source}: {report.status} · unidades {report.units_done}/{report.units_total}"
        f" (puladas {report.units_skipped}, falhas {report.units_failed}) · linhas {report.rows_loaded}"
        f" · quarentena {report.rows_quarantined} · bytes {report.bytes_in} · chamadas {report.api_calls}"
    )
    for err in report.errors:
        typer.echo(f"  erro: {err}", err=True)
    if report.status == "failed" or (report.status == "degraded" and cfg.critical):
        raise typer.Exit(1)


@app.command("status")
def status(limit: int = 20) -> None:
    """Últimas execuções do ledger."""
    conn = dbmod.connect(Settings.from_env().database_url)
    rows = conn.execute(
        """SELECT started_at, source, dataset, status, units_done, units_total, rows_loaded,
                  extract(epoch FROM finished_at - started_at)::int AS seconds
           FROM ingest.runs ORDER BY started_at DESC LIMIT %s""",
        (limit,),
    ).fetchall()
    for r in rows:
        typer.echo(" · ".join(str(x) for x in r))
