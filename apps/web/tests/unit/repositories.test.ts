import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const ctx = { userId: 'u_test', role: 'viewer' as const };

describe('repositórios', () => {
  it('DATA_SOURCE padrão é mock e valores desconhecidos falham com mensagem clara', async () => {
    const { dataSource } = await import('@/lib/repositories');
    expect(dataSource(undefined)).toBe('mock');
    expect(dataSource('db')).toBe('db');
    expect(() => dataSource('postgres')).toThrow(/não é suportado/);
  });

  it('todas as chamadas recebem o RequestContext', async () => {
    const { getAssetRepository, getPortfolioRepository } = await import('@/lib/repositories');
    const portfolio = getPortfolioRepository();
    const assets = getAssetRepository();
    expect((await portfolio.getSummary(ctx)).positions).toHaveLength(7);
    expect(await assets.getDataDate(ctx)).toBe('2026-10-31');
    expect((await assets.listAssets(ctx)).length).toBeGreaterThan(7);
    expect((await assets.getAsset(ctx, 'vale3'))?.ticker).toBe('VALE3');
    expect(await assets.getAsset(ctx, 'XPTO3')).toBeNull();
  });

  it('busca no repositório: ticker exato primeiro, nome sem acento e limite', async () => {
    const { getAssetRepository } = await import('@/lib/repositories');
    const repo = getAssetRepository();
    expect((await repo.searchAssets(ctx, 'vale3'))[0]?.ticker).toBe('VALE3');
    expect((await repo.searchAssets(ctx, '', 3)).length).toBe(3);
    expect(await repo.searchAssets(ctx, 'zzzz')).toEqual([]);
  });

  it('snapshot anterior: setembro antes de outubro; nada antes de setembro', async () => {
    const { getPortfolioRepository } = await import('@/lib/repositories');
    const repo = getPortfolioRepository();
    expect((await repo.getPreviousSnapshot(ctx, '2026-10-31'))?.referenceDate).toBe('2026-09-30');
    expect(await repo.getPreviousSnapshot(ctx, '2026-09-30')).toBeNull();
  });

  it('premissas de projeção vêm da carteira', async () => {
    const { getPortfolioRepository } = await import('@/lib/repositories');
    const d = await getPortfolioRepository().getProjectionDefaults(ctx);
    expect(d).toMatchObject({
      start: 16188.02,
      baseRate: 11.4,
      dividendYield: 7.9,
      monthly: 500,
      goal: 50000,
    });
  });
});
