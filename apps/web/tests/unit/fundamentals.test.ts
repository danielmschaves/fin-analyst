import { describe, expect, it } from 'vitest';
import {
  annualize,
  dreLines,
  ebitda,
  grossProfit,
  lastChange,
  lossQuarter,
  netMargin,
  peerRanks,
  revenueGrowth12m,
  taxesAndOther,
} from '@/lib/fundamentals';
import { vale3Income as s, vale3Peers } from '@/lib/mock/fundamentals';

const r1 = (v: number) => Math.round(v * 10) / 10;

describe('lib/fundamentals', () => {
  it('lucro bruto = receita + custo', () => {
    expect(grossProfit(s)).toEqual([19.4, 15.8, 18.2, 19.7, 19.4, 15.3, 17.1, 18.1]);
  });

  it('EBITDA = lucro bruto + despesas + 4,6', () => {
    expect(ebitda(s)).toEqual([20.9, 17.6, 19.8, 21.1, 20.4, 17.0, 18.6, 19.4]);
  });

  it('IR/CS como resíduo', () => {
    expect(taxesAndOther(s)).toEqual([-8.3, -2.7, -5.9, -11.3, -7.1, -6.7, -7.5, -8.1]);
  });

  it('margem líquida cai de 11,8% para 2,9%', () => {
    const m = netMargin(s).map(r1);
    expect(m[0]).toBe(11.8);
    expect(m.at(-1)).toBe(2.9);
    expect(m).toEqual([11.8, 20.5, 14.3, 7.2, 8.8, -13.1, 3.8, 2.9]);
  });

  it('variação t/t: receita +4,2%, lucro −21,1%, margem −0,9 p.p.', () => {
    const byId = Object.fromEntries(dreLines(s).map((l) => [l.id, lastChange(l)]));
    expect(r1(byId.receita!.value)).toBe(4.2);
    expect(r1(byId.lucro!.value)).toBe(-21.1);
    expect(byId.margem).toMatchObject({ unit: 'pp' });
    expect(r1(byId.margem!.value)).toBe(-0.9);
    expect(r1(byId.custo!.value)).toBe(-3.3);
    expect(r1(byId.despesas!.value)).toBe(-6.5);
    expect(r1(byId.financeiro!.value)).toBe(-13.0);
    expect(r1(byId.ir!.value)).toBe(-8.0);
    expect(r1(byId['lucro-bruto']!.value)).toBe(5.8);
    expect(r1(byId.ebitda!.value)).toBe(4.3);
  });

  it('receita cresce 1,2% em 12 meses', () => {
    expect(r1(revenueGrowth12m(s))).toBe(1.2);
  });

  it('prejuízo do 1T26 veio do financeiro, com EBITDA de 17,0', () => {
    expect(lossQuarter(s)).toEqual({ quarter: '1T26', financial: -11.8, ebitda: 17.0 });
  });

  it('visão anual: 2025 e últimos 12 meses', () => {
    const a = annualize(s);
    expect(a.quarters).toEqual(['2025', '12M']);
    expect(a.revenue).toEqual([203.4, 203.6]);
    expect(a.netIncome).toEqual([25.1, 2.1]);
  });

  it('pares: 2ª menor classificação e 2º maior P/L', () => {
    const r = peerRanks(vale3Peers);
    expect(r.scoreRankFromBottom).toBe(2);
    expect(r.peRankFromTop).toBe(2);
    expect(r.peersCount).toBe(6);
    expect(r.avg?.dividendYield).toBe(5.99);
  });
});
