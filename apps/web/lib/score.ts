export type ScoreLabel = 'Fraco' | 'Médio' | 'Forte';

/** Fraco 0–39 · Médio 40–59 · Forte 60–100. Nunca "Compra"/"Venda". */
export function scoreLabel(score: number): ScoreLabel {
  if (score >= 60) return 'Forte';
  if (score >= 40) return 'Médio';
  return 'Fraco';
}

/** Nível de cor 1–5 (`--score-1..5`), em faixas de 20. */
export function scoreLevel(score: number): 1 | 2 | 3 | 4 | 5 {
  const clamped = Math.max(0, Math.min(100, score));
  return Math.min(5, Math.floor(clamped / 20) + 1) as 1 | 2 | 3 | 4 | 5;
}

export function scoreColorVar(score: number) {
  return `var(--score-${scoreLevel(score)})`;
}
