import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn() }));

/**
 * Repositório db contra um Postgres com os marts no formato que o dbt publica.
 * Roda quando DATABASE_URL_TEST existe (CI: service postgres:16); senão, pula.
 */
const url = process.env.DATABASE_URL_TEST;
const d = url ? describe : describe.skip;

d('AssetRepository (db)', () => {
  const db = url ? postgres(url, { max: 1, onnotice: () => {} }) : (null as never);

  beforeAll(async () => {
    await db.unsafe(`
      create extension if not exists pg_trgm;
      drop schema if exists marts cascade;
      create schema marts;
      create table marts.mart_asset_index (ticker text primary key, name text, asset_class text,
        sector text, last_date date, last_price float8, search_text text);
      insert into marts.mart_asset_index values
        ('VALE3', 'Vale', 'Ação', null, '2026-10-30', 61.2, 'vale3 vale'),
        ('VALE5', 'Vale Pna', 'Ação', null, '2026-10-30', 50.0, 'vale5 vale pna'),
        ('MXRF11', 'Maxi Renda', 'FII', null, '2026-10-30', 9.8, 'mxrf11 maxi renda'),
        ('PETR4', 'Petrobras', 'Ação', null, '2026-10-29', 38.5, 'petr4 petrobras');
      create table marts.mart_asset_returns (ticker text primary key, date date, price float8,
        day_change_pct float8, r_5d float8, r_1m float8, r_6m float8, r_ytd float8, r_1a float8,
        r_2a float8, r_5a float8);
      insert into marts.mart_asset_returns values
        ('VALE3', '2026-10-30', 61.2, 1.5, 0.4, -2.1, 5.0, 8.2, 12.3, null, null);
      create table marts.mart_price_history (ticker text, date date, close float8);
      insert into marts.mart_price_history values
        ('VALE3', '2026-10-30', 61.2), ('VALE3', '2026-10-29', 60.3), ('VALE3', '2024-03-08', 70.0);
      create table marts.mart_fundamentals_quarterly (ticker text, quarter_end date, quarter text,
        revenue float8, cost float8, opex float8, financial_result float8, net_income float8,
        depreciation float8);
      insert into marts.mart_fundamentals_quarterly
        select 'VALE3', (date '2024-03-31' + make_interval(months => 3 * g))::date, 'Q' || g,
               50 + g, -30, -5, -1, 5, 4
        from generate_series(0, 9) g;
    `);
  });

  afterAll(async () => {
    await db?.end();
  });

  it('busca: ticker exato, prefixo, nome parecido e limite', async () => {
    const { searchIndex } = await import('@/lib/repositories/assets.db');
    expect((await searchIndex(db, 'vale3', 6)).map((a) => a.ticker)).toEqual(['VALE3', 'VALE5']);
    expect((await searchIndex(db, 'maxi', 6))[0]).toEqual({
      ticker: 'MXRF11',
      name: 'Maxi Renda',
      assetClass: 'FII',
    });
    expect((await searchIndex(db, 'petrobas', 6))[0]?.ticker).toBe('PETR4'); // erro de digitação
    expect(await searchIndex(db, '', 2)).toHaveLength(2);
  });

  it('cartão do ativo: cotação e retornos com janelas sem histórico em null; sem kpis', async () => {
    const { assetCard } = await import('@/lib/repositories/assets.db');
    const vale = await assetCard(db, 'VALE3');
    expect(vale?.quote).toEqual({ price: 61.2, dayChangePct: 1.5, date: '2026-10-30' });
    expect(vale?.returns).toMatchObject({ YTD: 8.2, '1A': 12.3, '2A': null, '5A': null });
    expect(vale?.kpis).toBeNull();
    const petr = await assetCard(db, 'PETR4');
    expect(petr?.quote).toBeNull();
    expect(petr?.returns).toBeNull();
    expect(await assetCard(db, 'XPTO3')).toBeNull();
  });

  it('histórico em ordem de data e DRE dos últimos 8 trimestres', async () => {
    const { priceHistory, incomeStatement, dataDate } =
      await import('@/lib/repositories/assets.db');
    expect((await priceHistory(db, 'VALE3')).map((p) => p.date)).toEqual([
      '2024-03-08',
      '2026-10-29',
      '2026-10-30',
    ]);
    const income = await incomeStatement(db, 'VALE3');
    expect(income?.quarters).toEqual(['Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9']);
    expect(income?.revenue.at(-1)).toBe(59);
    expect(await incomeStatement(db, 'PETR4')).toBeNull();
    expect(await dataDate(db)).toBe('2026-10-30');
  });
});
