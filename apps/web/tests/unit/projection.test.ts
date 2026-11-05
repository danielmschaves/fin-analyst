import { describe, expect, it } from 'vitest';
import { defaultInputs as d } from '@/lib/mock/projection';
import {
  monthLabel,
  monthsToGoal,
  project,
  runProjection,
  sensitivity,
  toRealValue,
} from '@/lib/projection';

const r2 = (v: number) => Math.round(v * 100) / 100;

describe('lib/projection', () => {
  const run = runProjection(d);
  const by = Object.fromEntries(run.results.map((r) => [r.id, r]));

  it('valores em 60 meses: 61.056,84 · 67.367,68 · 74.270,01; aportes 46.188,02', () => {
    expect(r2(by.conservador!.final)).toBe(61056.84);
    expect(r2(by.base!.final)).toBe(67367.68);
    expect(r2(by.otimista!.final)).toBe(74270.01);
    expect(r2(run.totalInvested)).toBe(46188.02);
    expect(run.series.base).toHaveLength(61);
  });

  it('meta de R$ 50 mil em 48, 44 e 40 meses (out, jun e fev de 2030)', () => {
    expect([by.conservador!.goalMonths, by.base!.goalMonths, by.otimista!.goalMonths]).toEqual([
      48, 44, 40,
    ]);
    expect(monthLabel('2026-10-31', 48)).toBe('out/2030');
    expect(monthLabel('2026-10-31', 44)).toBe('jun/2030');
    expect(monthLabel('2026-10-31', 40)).toBe('fev/2030');
  });

  it('"só aportes" alcança a meta em jun/2032', () => {
    expect(by.aportes!.goalMonths).toBe(68);
    expect(monthLabel('2026-10-31', 68)).toBe('jun/2032');
    expect(monthLabel('2026-10-31', 60, { short: true })).toBe('out/31');
  });

  it('sensibilidade: +R$ 7.918,97 (+R$ 100/mês) e +R$ 2.232,95 (+1 p.p.)', () => {
    const s = sensitivity(d);
    expect(r2(s.plus100)).toBe(7918.97);
    expect(r2(s.plus1pp)).toBe(2232.95);
  });

  it('valores reais com IPCA de 4%', () => {
    expect(r2(by.conservador!.real)).toBe(50184.27);
    expect(r2(by.base!.real)).toBe(55371.32);
    expect(r2(by.otimista!.real)).toBe(61044.53);
    expect(r2(by.aportes!.real)).toBe(37963.19);
    expect(r2(toRealValue(104, 4, 12))).toBe(100);
  });

  it('rendimento = final − aportes', () => {
    expect(r2(by.conservador!.gain!)).toBe(14868.82);
    expect(r2(by.base!.gain!)).toBe(21179.66);
    expect(r2(by.otimista!.gain!)).toBe(28081.99);
  });

  it('sem reinvestir proventos, a rentabilidade cai pelo DY', () => {
    const noReinvest = runProjection({ ...d, reinvestDividends: false });
    const base = noReinvest.results.find((r) => r.id === 'base')!;
    expect(base.final).toBeCloseTo(project(d.start, d.monthly, 11.4 - 7.9, 60)[60]!, 6);
    expect(base.final).toBeLessThan(by.base!.final);
  });

  it('meta já alcançada = 0 meses; meta inalcançável = null', () => {
    expect(monthsToGoal(60000, 0, 10, 50000)).toBe(0);
    expect(monthsToGoal(100, 0, 0, 50000)).toBeNull();
  });
});
