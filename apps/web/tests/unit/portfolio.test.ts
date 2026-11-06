import { describe, expect, it } from 'vitest';
import { portfolioSummary as s } from '@/lib/mock/portfolio';
import {
  allocationByAsset,
  allocationByClass,
  annualDividendsEstimate,
  cdi12m,
  dividendsShareOfResult,
  dividendsTotal,
  evolutionSeries,
  maxGapToCdi,
  monthName,
  monthsAboveCdi,
  rebase,
  topVariableIncome,
  totalValue,
  worstMonth,
} from '@/lib/portfolio';

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

describe('lib/portfolio', () => {
  it('patrimônio total', () => {
    expect(totalValue(s.positions)).toBe(16188.02);
  });

  it('% por classe: 61,2 / 19,0 / 19,8', () => {
    expect(allocationByClass(s.positions).map((a) => [a.label, r1(a.pct)])).toEqual([
      ['Ações', 61.2],
      ['FIIs', 19.0],
      ['Renda fixa', 19.8],
    ]);
  });

  it('% por ativo e concentração em PETR4 e VALE3 (42%)', () => {
    expect(allocationByAsset(s.positions).map((a) => [a.ticker, r1(a.pct)])).toEqual([
      ['PETR4', 23.8],
      ['CDB DI', 19.8],
      ['VALE3', 18.6],
      ['ITSA4', 12.4],
      ['HGLG11', 9.9],
      ['MXRF11', 9.1],
      ['TAEE11', 6.5],
    ]);
    const top = topVariableIncome(s.positions);
    expect(top.tickers).toEqual(['PETR4', 'VALE3']);
    expect(Math.round(top.pct)).toBe(42);
  });

  it('CDI acumulado em 12 meses: 11,76', () => {
    expect(r2(cdi12m(s))).toBe(11.76);
  });

  it('proventos: 59,80, que são 28% do resultado', () => {
    expect(dividendsTotal(s)).toBe(59.8);
    expect(Math.round(dividendsShareOfResult(s)!)).toBe(28);
    expect(dividendsShareOfResult({ ...s, month: null })).toBeNull();
    expect(Math.round(annualDividendsEstimate(s))).toBe(1279);
  });

  it('maior distância do CDI: −2,6 p.p. em junho (+5,1% contra +7,7%)', () => {
    const gap = maxGapToCdi(evolutionSeries(s.history));
    expect(gap.gapPP).toBe(-2.6);
    expect(monthName(s.history.startDate, gap.index)).toBe('junho');
    expect(r1(gap.carteira)).toBe(5.1);
    // O canvas diz 7,8%; composto dá 7,73% → 7,7% (a distância de −2,6 p.p. se mantém).
    expect(r1(gap.cdi)).toBe(7.7);
  });

  it('acima do CDI em 2 de 12 meses: dezembro e abril', () => {
    const months = monthsAboveCdi(evolutionSeries(s.history)).map((i) =>
      monthName(s.history.startDate, i),
    );
    expect(months).toEqual(['dezembro', 'abril']);
  });

  it('pior mês: −1,4% (jun) na carteira, −2,0% (jul) no Ibovespa', () => {
    const c = worstMonth(s.history.portfolioCumulative);
    expect([monthName(s.history.startDate, c.index), r1(c.returnPct)]).toEqual(['junho', -1.4]);
    const i = worstMonth(s.history.ibovCumulative);
    expect([monthName(s.history.startDate, i.index), r1(i.returnPct)]).toEqual(['julho', -2.0]);
  });

  it('rebase para 6M começa em zero', () => {
    const six = rebase(evolutionSeries(s.history), 6);
    expect(six).toHaveLength(7);
    expect(six[0]).toMatchObject({ carteira: 0, cdi: 0, ibov: 0 });
  });
});
