import type {
  AssetClass,
  PortfolioHistory,
  PortfolioPosition,
  PortfolioSummary,
} from './contracts';
import { MONTHS } from './format';

export const CLASS_ORDER: AssetClass[] = ['Ação', 'FII', 'Renda Fixa'];
export const CLASS_LABEL: Record<AssetClass, string> = {
  Ação: 'Ações',
  FII: 'FIIs',
  'Renda Fixa': 'Renda fixa',
};

const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

export function totalValue(positions: PortfolioPosition[]) {
  return Math.round(positions.reduce((s, p) => s + p.marketValue, 0) * 100) / 100;
}

export function weightPct(position: PortfolioPosition, positions: PortfolioPosition[]) {
  return (position.marketValue / totalValue(positions)) * 100;
}

export type ClassAllocation = { assetClass: AssetClass; label: string; value: number; pct: number };

export function allocationByClass(positions: PortfolioPosition[]): ClassAllocation[] {
  const total = totalValue(positions);
  return CLASS_ORDER.map((c) => {
    const value = positions
      .filter((p) => p.assetClass === c)
      .reduce((s, p) => s + p.marketValue, 0);
    return { assetClass: c, label: CLASS_LABEL[c], value, pct: (value / total) * 100 };
  }).filter((a) => a.value > 0);
}

export function allocationByAsset(positions: PortfolioPosition[]) {
  const total = totalValue(positions);
  return [...positions]
    .sort((a, b) => b.marketValue - a.marketValue)
    .map((p) => ({
      ticker: p.ticker,
      assetClass: p.assetClass,
      pct: (p.marketValue / total) * 100,
    }));
}

/** As duas maiores posições de renda variável e o peso somado (ex.: "PETR4 e VALE3 somam 42%"). */
export function topVariableIncome(positions: PortfolioPosition[], n = 2) {
  const total = totalValue(positions);
  const top = [...positions]
    .filter((p) => p.assetClass !== 'Renda Fixa')
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, n);
  return {
    tickers: top.map((p) => p.ticker),
    pct: (top.reduce((s, p) => s + p.marketValue, 0) / total) * 100,
  };
}

/** CDI acumulado (%) a partir das taxas mensais, compostas. */
export function compoundCumulative(monthly: number[]) {
  const out: number[] = [];
  let acc = 1;
  for (const r of monthly) {
    acc *= 1 + r / 100;
    out.push((acc - 1) * 100);
  }
  return out;
}

/** Retorno de cada mês (%) a partir de uma série acumulada. Índice 0 = 0. */
export function monthlyFromCumulative(cumulative: number[]) {
  return cumulative.map((c, i) =>
    i === 0 ? 0 : ((1 + c / 100) / (1 + cumulative[i - 1]! / 100) - 1) * 100,
  );
}

/** Data (fim de mês) do ponto `i` da série. */
export function monthDate(startDate: string, i: number) {
  const [y, m] = startDate.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + i + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function monthName(startDate: string, i: number) {
  return MONTHS[Number(monthDate(startDate, i).slice(5, 7)) - 1]!;
}

export type EvolutionPoint = {
  index: number;
  date: string;
  carteira: number;
  cdi: number;
  ibov: number;
};

export function evolutionSeries(history: PortfolioHistory): EvolutionPoint[] {
  const cdi = compoundCumulative(history.cdiMonthly);
  return history.portfolioCumulative.map((c, i) => ({
    index: i,
    date: monthDate(history.startDate, i),
    carteira: c,
    cdi: cdi[i]!,
    ibov: history.ibovCumulative[i]!,
  }));
}

/** Rebaseia a série a partir do ponto `from` (para "6M"). */
export function rebase(points: EvolutionPoint[], from: number): EvolutionPoint[] {
  const base = points[from]!;
  const f = (v: number, b: number) => ((1 + v / 100) / (1 + b / 100) - 1) * 100;
  return points.slice(from).map((p) => ({
    ...p,
    carteira: f(p.carteira, base.carteira),
    cdi: f(p.cdi, base.cdi),
    ibov: f(p.ibov, base.ibov),
  }));
}

/** Maior distância (negativa) da carteira para o CDI, no acumulado. */
export function maxGapToCdi(points: EvolutionPoint[]) {
  let worst = points[0]!;
  for (const p of points) if (p.carteira - p.cdi < worst.carteira - worst.cdi) worst = p;
  return {
    index: worst.index,
    gapPP: round(worst.carteira - worst.cdi),
    carteira: worst.carteira,
    cdi: worst.cdi,
  };
}

/** Meses (após a base) em que o acumulado da carteira ficou acima do CDI. */
export function monthsAboveCdi(points: EvolutionPoint[]) {
  return points.filter((p) => p.index > 0 && p.carteira > p.cdi).map((p) => p.index);
}

/** Pior mês de uma série acumulada: índice e retorno do mês (%). */
export function worstMonth(cumulative: number[]) {
  const monthly = monthlyFromCumulative(cumulative);
  let idx = 1;
  for (let i = 1; i < monthly.length; i++) if (monthly[i]! < monthly[idx]!) idx = i;
  return { index: idx, returnPct: monthly[idx]! };
}

export function dividendsTotal(summary: PortfolioSummary) {
  return Math.round(summary.dividends.reduce((s, d) => s + d.amount, 0) * 100) / 100;
}

/** Quanto dos proventos representa do resultado do mês (%). */
export function dividendsShareOfResult(summary: PortfolioSummary) {
  return (dividendsTotal(summary) / summary.month.result) * 100;
}

/** Proventos anuais estimados pelo DY da carteira. */
export function annualDividendsEstimate(summary: PortfolioSummary) {
  return (totalValue(summary.positions) * summary.dividendYieldPct) / 100;
}

export function cdi12m(summary: PortfolioSummary) {
  const cdi = compoundCumulative(summary.history.cdiMonthly);
  return cdi[cdi.length - 1]!;
}
