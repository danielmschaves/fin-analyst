import type { IncomeStatementQuarterly, PeerRow } from './contracts';

const r1 = (v: number) => Math.round(v * 10) / 10;

export type DreLine = {
  id: string;
  label: string;
  values: number[];
  /** Subtotal (em negrito). */
  subtotal?: boolean;
  /** Linha em % (margem). */
  percent?: boolean;
};

/** Lucro bruto = receita + custo (custo vem negativo). */
export function grossProfit(s: IncomeStatementQuarterly) {
  return s.revenue.map((r, i) => r1(r + s.cost[i]!));
}

/** EBITDA = lucro bruto + despesas operacionais + depreciação. */
export function ebitda(s: IncomeStatementQuarterly) {
  return grossProfit(s).map((g, i) => r1(g + s.opex[i]! + s.depreciation));
}

/** IR/CS e outros = resíduo entre o lucro líquido e o resultado antes dos impostos. */
export function taxesAndOther(s: IncomeStatementQuarterly) {
  return grossProfit(s).map((g, i) =>
    r1(s.netIncome[i]! - (g + s.opex[i]! + s.financialResult[i]!)),
  );
}

/** Margem líquida (%) = lucro / receita. */
export function netMargin(s: IncomeStatementQuarterly) {
  return s.revenue.map((r, i) => (s.netIncome[i]! / r) * 100);
}

/** Variação contra o período anterior, em % sobre o valor absoluto anterior (custos que crescem ficam negativos). */
export function changePct(prev: number, cur: number) {
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export function dreLines(s: IncomeStatementQuarterly): DreLine[] {
  return [
    { id: 'receita', label: 'Receita líquida', values: s.revenue, subtotal: true },
    { id: 'custo', label: 'Custo dos produtos', values: s.cost },
    { id: 'lucro-bruto', label: 'Lucro bruto', values: grossProfit(s), subtotal: true },
    { id: 'despesas', label: 'Despesas operacionais', values: s.opex },
    { id: 'ebitda', label: 'EBITDA', values: ebitda(s), subtotal: true },
    { id: 'financeiro', label: 'Resultado financeiro', values: s.financialResult },
    { id: 'ir', label: 'IR/CS e outros', values: taxesAndOther(s) },
    { id: 'lucro', label: 'Lucro líquido', values: s.netIncome, subtotal: true },
    { id: 'margem', label: 'Margem líquida', values: netMargin(s), subtotal: true, percent: true },
  ];
}

/** Variação t/t da última coluna: % para valores, p.p. para margem. */
export function lastChange(line: DreLine) {
  const v = line.values;
  const prev = v[v.length - 2]!;
  const cur = v[v.length - 1]!;
  return line.percent
    ? { value: cur - prev, unit: 'pp' as const }
    : { value: changePct(prev, cur), unit: 'pct' as const };
}

/** Soma por ano fiscal ("2025") e últimos 12 meses. */
export function annualize(s: IncomeStatementQuarterly): IncomeStatementQuarterly {
  const years = [...new Set(s.quarters.map((q) => `20${q.slice(-2)}`))];
  const full = years.filter((y) => s.quarters.filter((q) => `20${q.slice(-2)}` === y).length === 4);
  const sumBy = (arr: number[], pred: (q: string) => boolean) =>
    r1(arr.reduce((acc, v, i) => (pred(s.quarters[i]!) ? acc + v : acc), 0));
  const ltm = new Set(s.quarters.slice(-4));
  const groups: [string, (q: string) => boolean][] = [
    ...full.map(
      (y) => [y, (q: string) => `20${q.slice(-2)}` === y] as [string, (q: string) => boolean],
    ),
    ['12M', (q: string) => ltm.has(q)],
  ];
  const map = (arr: number[]) => groups.map(([, pred]) => sumBy(arr, pred));
  return {
    ...s,
    quarters: groups.map(([label]) => label),
    revenue: map(s.revenue),
    cost: map(s.cost),
    opex: map(s.opex),
    financialResult: map(s.financialResult),
    netIncome: map(s.netIncome),
    depreciation: s.depreciation * 4,
  };
}

/** Crescimento da receita em 12 meses (últimos 4 trimestres contra os 4 anteriores). */
export function revenueGrowth12m(s: IncomeStatementQuarterly) {
  const last = s.revenue.slice(-4).reduce((a, b) => a + b, 0);
  const prev = s.revenue.slice(-8, -4).reduce((a, b) => a + b, 0);
  return (last / prev - 1) * 100;
}

/** Trimestre com prejuízo mais recente e o que o explica. */
export function lossQuarter(s: IncomeStatementQuarterly) {
  const idx = s.netIncome.findLastIndex((v) => v < 0);
  if (idx < 0) return null;
  return { quarter: s.quarters[idx]!, financial: s.financialResult[idx]!, ebitda: ebitda(s)[idx]! };
}

/** Posição (1 = menor) da classificação e (1 = maior) do P/L do ativo entre ele e os pares. */
export function peerRanks(peers: PeerRow[]) {
  const group = peers.filter((p) => p.kind !== 'avg');
  const self = group.find((p) => p.kind === 'self')!;
  const avg = peers.find((p) => p.kind === 'avg');
  const scoreRankFromBottom = [...group].sort((a, b) => a.score - b.score).indexOf(self) + 1;
  const withPe = group.filter((p) => p.pe !== null).sort((a, b) => b.pe! - a.pe!);
  const peRankFromTop = self.pe === null ? null : withPe.indexOf(self) + 1;
  return { self, avg, scoreRankFromBottom, peRankFromTop, peersCount: group.length - 1 };
}
