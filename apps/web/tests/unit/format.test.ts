import { describe, expect, it } from 'vitest';
import {
  formatBRL,
  formatCompact,
  formatDate,
  formatDayMonth,
  formatInteger,
  formatMonthShort,
  formatMultiple,
  formatNumber,
  formatPercent,
  formatPP,
  MINUS,
} from '@/lib/format';

describe('format', () => {
  it('formata reais', () => {
    expect(formatBRL(16188.02)).toBe('R$ 16.188,02');
    expect(formatBRL(-192.5)).toBe('−R$ 192,50');
    expect(formatBRL(14, { sign: true })).toBe('+R$ 14,00');
    expect(formatBRL(0, { sign: true })).toBe('R$ 0,00');
  });

  it('formata percentuais com sinal', () => {
    expect(formatPercent(1.33)).toBe('+1,33%');
    expect(formatPercent(-16.27)).toBe('−16,27%');
    expect(formatPercent(8.83, { sign: false })).toBe('8,83%');
    expect(formatPercent(11.4, { decimals: 1 })).toBe('+11,4%');
  });

  it('usa o sinal de menos tipográfico, nunca o hífen', () => {
    expect(formatPercent(-1)).toContain(MINUS);
    expect(formatPercent(-1)).not.toContain('-');
    expect(MINUS).toBe('−');
  });

  it('não mostra "−0" quando o arredondamento zera', () => {
    expect(formatPercent(-0.001)).toBe('0,00%');
  });

  it('formata valores compactos', () => {
    expect(formatCompact(256.4e9)).toBe('256,4 bi');
    expect(formatCompact(25.4e6)).toBe('25,4 mi');
    expect(formatCompact(-11.8e9)).toBe('−11,8 bi');
  });

  it('formata datas', () => {
    expect(formatDate('2026-10-31')).toBe('31/10/2026');
    expect(formatDate(new Date(2026, 9, 31))).toBe('31/10/2026');
    expect(formatDayMonth('2026-10-01')).toBe('01/10');
    expect(formatMonthShort('2026-10-31')).toBe('out/26');
    expect(formatMonthShort('2031-10-31', { fullYear: true })).toBe('out/2031');
  });

  it('formata números, inteiros, p.p. e múltiplos', () => {
    expect(formatNumber(3850)).toBe('3.850,00');
    expect(formatInteger(1279.3)).toBe('1.279');
    expect(formatPP(-2.6)).toBe('−2,6 p.p.');
    expect(formatMultiple(-0.4)).toBe('−0,40x');
  });
});
