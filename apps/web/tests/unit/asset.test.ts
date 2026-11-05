import { describe, expect, it } from 'vitest';
import { maxPoint, positionResult, riseToAvgPrice, sliceWindow, windowReturn } from '@/lib/asset';
import { RETURN_WINDOWS } from '@/lib/contracts';
import { avgPrice, price, priceAnchors, qty, returns, vale3PriceHistory } from '@/lib/mock/vale3';

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

describe('lib/asset', () => {
  it('alta necessária para voltar ao PM: 6,4%', () => {
    expect(r1(riseToAvgPrice(price, avgPrice))).toBe(6.4);
  });

  it('resultado da posição: −R$ 192,50 (−6,0%)', () => {
    const r = positionResult(price, avgPrice, qty);
    expect(r.value).toBe(-192.5);
    expect(r1(r.pct)).toBe(-6.0);
  });

  describe('série de preço com seed fixa', () => {
    const series = vale3PriceHistory();
    const lastYear = series.slice(-251);

    it('é determinística', () => {
      expect(vale3PriceHistory()).toEqual(series);
    });

    it('o último ano tem 251 pregões e passa por todas as âncoras', () => {
      expect(lastYear).toHaveLength(251);
      for (const [i, p] of priceAnchors) expect(lastYear[i]!.close).toBe(p);
    });

    it('a máxima do ano é R$ 83,30 em junho', () => {
      const max = maxPoint(lastYear);
      expect(max.close).toBe(83.3);
      expect(max.date.slice(5, 7)).toBe('06');
    });

    it('o retorno de cada janela bate com o fixture', () => {
      for (const w of RETURN_WINDOWS) {
        expect(r2(windowReturn(sliceWindow(series, w)))).toBeCloseTo(returns[w], 1);
      }
    });

    it('termina no último pregão (sex, 30/10/2026) a R$ 60,25 e só tem dias úteis', () => {
      expect(series.at(-1)).toEqual({ date: '2026-10-30', close: 60.25 });
      for (const p of series.slice(0, -1)) {
        const wd = new Date(`${p.date}T12:00:00Z`).getUTCDay();
        expect(wd === 0 || wd === 6).toBe(false);
      }
    });
  });
});
