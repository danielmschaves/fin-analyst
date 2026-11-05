import type { ProjectionInputs } from './contracts';
import { MONTHS } from './format';

/** Taxa mensal equivalente a uma taxa anual efetiva: (1 + a)^(1/12) − 1. */
export function monthlyRate(annualPct: number) {
  return (1 + annualPct / 100) ** (1 / 12) - 1;
}

/** Patrimônio mês a mês (índice 0 = hoje), com aporte no fim de cada mês. */
export function project(start: number, monthly: number, annualPct: number, months: number) {
  const r = monthlyRate(annualPct);
  const out = [start];
  for (let i = 1; i <= months; i++) out.push(out[i - 1]! * (1 + r) + monthly);
  return out;
}

export function contributions(start: number, monthly: number, months: number) {
  return Array.from({ length: months + 1 }, (_, i) => start + monthly * i);
}

/** Primeiro mês em que o patrimônio alcança a meta (null se não alcançar em 50 anos). */
export function monthsToGoal(
  start: number,
  monthly: number,
  annualPct: number | null,
  goal: number,
  max = 600,
) {
  const r = annualPct === null ? 0 : monthlyRate(annualPct);
  let v = start;
  for (let i = 0; i <= max; i++) {
    if (v >= goal) return i;
    v = v * (1 + r) + monthly;
  }
  return null;
}

/** Valor em reais de hoje, descontando o IPCA (a.a.) pelo número de meses. */
export function toRealValue(value: number, ipcaPct: number, months: number) {
  return value / (1 + ipcaPct / 100) ** (months / 12);
}

/** Taxa efetiva do cenário: sem reinvestir, os proventos (DY) saem da rentabilidade. */
export function effectiveRate(
  rate: number,
  inputs: Pick<ProjectionInputs, 'reinvestDividends' | 'dividendYield'>,
) {
  return inputs.reinvestDividends ? rate : rate - inputs.dividendYield;
}

export type ScenarioId = 'conservador' | 'base' | 'otimista';
export const SCENARIO_LABEL: Record<ScenarioId, string> = {
  conservador: 'Conservador',
  base: 'Base',
  otimista: 'Otimista',
};

export function scenarioRates(
  inputs: Pick<ProjectionInputs, 'baseRate' | 'spread'>,
): Record<ScenarioId, number> {
  return {
    conservador: inputs.baseRate - inputs.spread,
    base: inputs.baseRate,
    otimista: inputs.baseRate + inputs.spread,
  };
}

export type ScenarioResult = {
  id: ScenarioId | 'aportes';
  rate: number | null;
  final: number;
  real: number;
  gain: number | null;
  goalMonths: number | null;
};

export function runProjection(inputs: ProjectionInputs) {
  const rates = scenarioRates(inputs);
  const invested = contributions(inputs.start, inputs.monthly, inputs.months);
  const series = Object.fromEntries(
    (Object.keys(rates) as ScenarioId[]).map((id) => [
      id,
      project(inputs.start, inputs.monthly, effectiveRate(rates[id], inputs), inputs.months),
    ]),
  ) as Record<ScenarioId, number[]>;
  const totalInvested = invested[inputs.months]!;
  const results: ScenarioResult[] = [
    ...(Object.keys(rates) as ScenarioId[]).map((id) => {
      const final = series[id][inputs.months]!;
      return {
        id,
        rate: rates[id],
        final,
        real: toRealValue(final, inputs.ipca, inputs.months),
        gain: final - totalInvested,
        goalMonths: monthsToGoal(
          inputs.start,
          inputs.monthly,
          effectiveRate(rates[id], inputs),
          inputs.goal,
        ),
      };
    }),
    {
      id: 'aportes',
      rate: null,
      final: totalInvested,
      real: toRealValue(totalInvested, inputs.ipca, inputs.months),
      gain: null,
      goalMonths: monthsToGoal(inputs.start, inputs.monthly, null, inputs.goal),
    },
  ];
  return { rates, series, invested, totalInvested, results };
}

/** Quanto muda o patrimônio final com +R$ 100/mês e com +1 p.p. de rentabilidade (cenário base). */
export function sensitivity(inputs: ProjectionInputs) {
  const rate = effectiveRate(inputs.baseRate, inputs);
  const base = project(inputs.start, inputs.monthly, rate, inputs.months)[inputs.months]!;
  return {
    plus100:
      project(inputs.start, inputs.monthly + 100, rate, inputs.months)[inputs.months]! - base,
    plus1pp: project(inputs.start, inputs.monthly, rate + 1, inputs.months)[inputs.months]! - base,
  };
}

/** Rótulo do mês a partir da data de referência: (2026-10-31, 60) → "out/2031". */
export function monthLabel(referenceDate: string, offset: number, { short = false } = {}) {
  const y = Number(referenceDate.slice(0, 4));
  const m = Number(referenceDate.slice(5, 7)) - 1 + offset;
  const year = y + Math.floor(m / 12);
  const month = ((m % 12) + 12) % 12;
  return `${MONTHS[month]!.slice(0, 3)}/${short ? String(year).slice(2) : year}`;
}

/** "R$ 67 mil" (arredondado) ou "R$ 67,4 mil". */
export function formatThousands(value: number, decimals = 0) {
  return `R$ ${(value / 1000).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} mil`;
}
