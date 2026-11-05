import type { ParsedPosition } from './contracts';
import { MONTHS } from './format';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ['.xlsx', '.pdf'] as const;

export type FileCheck = { ok: true } | { ok: false; title: string; detail: string };

/** Aceita .xlsx e .pdf, até 10 MB. */
export function validateFile(file: { name: string; size: number }): FileCheck {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return {
      ok: false,
      title: 'Arquivo não reconhecido',
      detail: 'Envie o relatório consolidado mensal da B3 (.xlsx ou .pdf).',
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      title: 'Arquivo maior que 10 MB',
      detail: 'O relatório mensal da B3 costuma ter menos de 1 MB. Confira se é o arquivo certo.',
    };
  }
  if (file.size === 0) {
    return {
      ok: false,
      title: 'Arquivo vazio',
      detail: 'Exporte o relatório de novo na Área do Investidor da B3.',
    };
  }
  return { ok: true };
}

/** "relatorio-consolidado-mensal-2026-outubro.xlsx" → "2026-10-31". */
export function referenceDateFromFileName(name: string): string | null {
  const m = /relatorio-consolidado-mensal-(\d{4})-([a-zç]+)/i.exec(name);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]!.toLowerCase() as (typeof MONTHS)[number]);
  if (month < 0) return null;
  const last = new Date(Number(m[1]), month + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

export type PositionChange =
  { kind: 'new' } | { kind: 'unchanged' } | { kind: 'quantity'; delta: number } | { kind: 'value' };

/**
 * Compara com o mês anterior. Ações e FIIs: muda quando a quantidade muda (preço não conta).
 * Renda fixa (sem preço unitário): muda quando o valor atualizado muda.
 */
export function diffPosition(
  prev: ParsedPosition | undefined,
  next: ParsedPosition,
): PositionChange {
  if (!prev) return { kind: 'new' };
  if (prev.quantity !== next.quantity)
    return { kind: 'quantity', delta: next.quantity - prev.quantity };
  if (next.price === null && Math.abs(prev.marketValue - next.marketValue) > 0.005)
    return { kind: 'value' };
  return { kind: 'unchanged' };
}

export function diffPositions(previous: ParsedPosition[], next: ParsedPosition[]) {
  const byTicker = new Map(previous.map((p) => [p.ticker, p]));
  const rows = next.map((p) => ({ position: p, change: diffPosition(byTicker.get(p.ticker), p) }));
  const nextTickers = new Set(next.map((p) => p.ticker));
  return {
    rows,
    newCount: rows.filter((r) => r.change.kind === 'new').length,
    changedCount: rows.filter((r) => r.change.kind === 'quantity' || r.change.kind === 'value')
      .length,
    removed: previous.filter((p) => !nextTickers.has(p.ticker)),
  };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
