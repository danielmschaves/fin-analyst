"""Executa um conector: ledger, retomada por unidade, DLQ, circuito e limiar de erro."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from .connectors.base import Connector, Context
from .http import BudgetExceeded, SourceDegraded


@dataclass
class RunReport:
    run_id: str
    source: str
    dataset: str
    status: str
    units_total: int = 0
    units_done: int = 0
    units_failed: int = 0
    units_skipped: int = 0
    rows_loaded: int = 0
    rows_quarantined: int = 0
    bytes_in: int = 0
    api_calls: int = 0
    errors: list[str] = field(default_factory=list)

    def metrics(self) -> dict[str, int]:
        return {
            k: getattr(self, k)
            for k in (
                "units_total",
                "units_done",
                "units_failed",
                "units_skipped",
                "rows_loaded",
                "rows_quarantined",
                "bytes_in",
                "api_calls",
            )
        }

    def summary_line(self) -> str:
        return (
            f"| {self.source}/{self.dataset} | {self.status} | {self.units_done}/{self.units_total}"
            f" | {self.units_skipped} | {self.units_failed} | {self.rows_loaded} | {self.rows_quarantined}"
            f" | {self.bytes_in} | {self.api_calls} |"
        )


def run(
    connector: Connector, ctx: Context, force: bool = False, retry_dlq: bool = True
) -> RunReport:
    report = RunReport(ctx.run_id, connector.source, connector.dataset, "running")
    skip = getattr(connector, "skip_reason", None)
    reason = skip(ctx) if skip else None
    if reason:
        report.status = "skipped"
        report.errors.append(reason)
        ctx.state.finish_run(ctx.run_id, "skipped", report.metrics(), reason)
        _write_step_summary(report)
        return report
    units = list(dict.fromkeys(connector.units(ctx)))
    if retry_dlq:
        units += [u for u in ctx.state.dlq_units(ctx.cfg.dlq_max_attempts) if u not in units]
    report.units_total = len(units)
    degraded = False

    for unit in units:
        status = ctx.state.unit_status(unit)
        if not force and not connector.incremental and status in {"done", "not_modified"}:
            report.units_skipped += 1  # retomada: unidade já concluída numa execução anterior
            continue
        ctx.state.set_unit(unit, "running", ctx.run_id)
        try:
            result = connector.process(ctx, unit)
        except (SourceDegraded, BudgetExceeded) as exc:
            # circuito aberto ou orçamento esgotado: para a fonte, mas não perde o que já entrou
            ctx.state.set_unit(unit, "failed", ctx.run_id, error=str(exc))
            ctx.state.dlq_put(unit, str(exc))
            report.units_failed += 1
            report.errors.append(f"{unit}: {exc}")
            degraded = True
            break
        except Exception as exc:  # noqa: BLE001 — falha de uma unidade não derruba a execução
            ctx.state.set_unit(unit, "failed", ctx.run_id, error=f"{type(exc).__name__}: {exc}")
            ctx.state.dlq_put(unit, f"{type(exc).__name__}: {exc}")
            report.units_failed += 1
            report.errors.append(f"{unit}: {type(exc).__name__}: {exc}")
            continue
        final = "not_modified" if result.not_modified else "done"
        ctx.state.set_unit(unit, final, ctx.run_id, rows=result.rows, sha256=result.sha256)
        ctx.state.dlq_remove(unit)
        report.units_done += 1
        report.rows_loaded += result.rows
        report.rows_quarantined += result.quarantined
        report.bytes_in += result.bytes_in

    report.api_calls = ctx.client.calls
    attempted = report.units_done + report.units_failed
    error_rate = report.units_failed / attempted if attempted else 0.0
    if degraded:
        report.status = "degraded"
    elif report.units_failed == 0:
        report.status = "success"
    elif error_rate <= ctx.cfg.error_rate_threshold:
        report.status = "partial"
    else:
        report.status = "failed"
    ctx.state.finish_run(
        ctx.run_id, report.status, report.metrics(), "\n".join(report.errors)[:4000] or None
    )
    _write_step_summary(report)
    return report


def _write_step_summary(report: RunReport) -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    header_needed = not os.path.exists(path) or os.path.getsize(path) == 0
    with open(path, "a", encoding="utf-8") as f:
        if header_needed:
            f.write(
                "| fonte/dataset | status | unidades | puladas | falhas | linhas | quarentena"
                " | bytes | chamadas |\n|---|---|---|---|---|---|---|---|---|\n"
            )
        f.write(report.summary_line() + "\n")
