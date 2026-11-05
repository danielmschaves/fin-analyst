'use server';

import type { AssistantAnswer, ImportInput, ImportPreview, PositionSnapshot } from './contracts';
import { validateFile } from './import';
import { getAssistantProvider, getImportParser, getPortfolioRepository } from './repositories';
import { getRequestContext } from './session';

/* Server actions: o cliente nunca acessa repositórios nem mocks direto. */

export async function askAssistant(input: {
  question: string;
  context: string[];
  connections: string[];
}): Promise<{ answer: AssistantAnswer; suggestions: string[] }> {
  const ctx = await getRequestContext();
  const provider = getAssistantProvider();
  const answer = await provider.ask(input, ctx);
  return { answer, suggestions: provider.suggestions(input.context) };
}

export async function getAssistantSuggestions(context: string[]): Promise<string[]> {
  await getRequestContext();
  return getAssistantProvider().suggestions(context);
}

export type ImportPreviewResult =
  | { ok: true; preview: ImportPreview; previous: PositionSnapshot | null }
  | { ok: false; title: string; detail: string };

/** Lê o relatório e devolve a revisão + o snapshot anterior para a comparação. */
export async function previewImport(input: ImportInput): Promise<ImportPreviewResult> {
  const check = validateFile(input);
  if (!check.ok) return check;
  const ctx = await getRequestContext();
  const preview = await getImportParser().parse(input, ctx);
  const previous = await getPortfolioRepository().getPreviousSnapshot(ctx, preview.referenceDate);
  return { ok: true, preview, previous };
}

/** Confirma a importação. Mock: não grava nada; no F2-3 grava em `app.*` (idempotente por SHA-256). */
export async function confirmImport(input: {
  sha256: string;
  tickers: string[];
}): Promise<{ positions: number }> {
  await getRequestContext();
  return { positions: input.tickers.length };
}
