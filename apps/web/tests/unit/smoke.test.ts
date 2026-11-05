import { describe, expect, it } from 'vitest';

describe('smoke', () => {
  it('formats a number in pt-BR', () => {
    expect(new Intl.NumberFormat('pt-BR').format(1234.5)).toBe('1.234,5');
  });
});
