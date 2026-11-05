import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('repositórios', () => {
  it('DATA_SOURCE padrão é mock e valores desconhecidos falham com mensagem clara', async () => {
    const { dataSource, getPortfolioRepository } = await import('@/lib/repositories');
    expect(dataSource(undefined)).toBe('mock');
    expect(() => dataSource('db')).toThrow(/ainda não é suportado/);
    const summary = await getPortfolioRepository().getSummary();
    expect(summary.positions).toHaveLength(7);
  });
});
