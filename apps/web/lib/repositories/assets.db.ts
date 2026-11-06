import 'server-only';
import { unstable_cache } from 'next/cache';
import postgres from 'postgres';
import type {
  AssetClass,
  AssetDetail,
  AssetSummary,
  IncomeStatementQuarterly,
  PricePoint,
  ReturnWindow,
} from '../contracts';
import type { AssetRepository } from '../repositories';

/**
 * AssetRepository no Postgres (schema `marts`, publicado pelo `services/transform`).
 * Dados de mercado não dependem do usuário: o cache é compartilhado e invalidado pela tag
 * `market-data` (POST /api/revalidate depois de cada publicação).
 */
export const MARKET_TAG = 'market-data';
const TTL = 60 * 60; // segurança: mesmo sem revalidate, os dados se renovam em 1 h

type Sql = ReturnType<typeof postgres>;
let client: Sql | null = null;

export function sql(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não definida (DATA_SOURCE=db).');
    // `prepare: false`: compatível com o pooler do Neon (PgBouncer em modo transação).
    client = postgres(url, { max: 5, prepare: false, idle_timeout: 20 });
  }
  return client;
}

const cached = <A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string) =>
  unstable_cache(fn, ['assets-db', key], { tags: [MARKET_TAG], revalidate: TTL });

type IndexRow = { ticker: string; name: string; asset_class: string; sector: string | null };

const toSummary = (r: IndexRow): AssetSummary => ({
  ticker: r.ticker,
  name: r.name,
  assetClass: r.asset_class as AssetClass,
  ...(r.sector ? { sector: r.sector } : {}),
});

export async function searchIndex(db: Sql, query: string, limit: number): Promise<AssetSummary[]> {
  const q = query.trim();
  if (!q) {
    const rows = await db<IndexRow[]>`
      select ticker, name, asset_class, sector from marts.mart_asset_index
      order by ticker limit ${limit}`;
    return rows.map(toSummary);
  }
  const lower = q.toLowerCase();
  // Ticker exato → prefixo do ticker → parecido no texto (pg_trgm) → contém.
  const rows = await db<IndexRow[]>`
    select ticker, name, asset_class, sector
    from marts.mart_asset_index
    where ticker ilike ${q + '%'}
       or search_text like ${'%' + lower + '%'}
       or search_text % ${lower}
    order by (lower(ticker) = ${lower}) desc,
             (ticker ilike ${q + '%'}) desc,
             similarity(search_text, ${lower}) desc,
             ticker
    limit ${limit}`;
  return rows.map(toSummary);
}

const WINDOWS: [ReturnWindow, string][] = [
  ['5D', 'r_5d'],
  ['1M', 'r_1m'],
  ['6M', 'r_6m'],
  ['YTD', 'r_ytd'],
  ['1A', 'r_1a'],
  ['2A', 'r_2a'],
  ['5A', 'r_5a'],
];

type CardRow = IndexRow & {
  date: Date | null;
  price: number | null;
  day_change_pct: number | null;
} & Record<string, unknown>;

export async function assetCard(db: Sql, ticker: string): Promise<AssetDetail | null> {
  const [row] = await db<CardRow[]>`
    select i.ticker, i.name, i.asset_class, i.sector, r.*
    from marts.mart_asset_index i
    left join marts.mart_asset_returns r using (ticker)
    where i.ticker = ${ticker}`;
  if (!row) return null;
  const quote =
    row.price !== null && row.date
      ? { price: row.price, dayChangePct: row.day_change_pct ?? 0, date: isoDate(row.date) }
      : null;
  const returns = quote
    ? (Object.fromEntries(
        WINDOWS.map(([w, col]) => [w, (row[col] as number | null) ?? null]),
      ) as Record<ReturnWindow, number | null>)
    : null;
  return {
    ticker: row.ticker,
    name: row.name,
    legalName: row.name,
    assetClass: row.asset_class as AssetClass,
    sector: row.sector ?? '',
    industry: '',
    quote,
    returns,
    // PoC: indicadores, classificação e pares chegam no F2-5/F2-6.
    kpis: null,
    sectorKpis: null,
    score: null,
    pillars: [],
    // PoC híbrida: a carteira continua mock; a posição entra com `app.*` no F2-2/F2-3.
    position: null,
    summaries: {},
  };
}

export async function priceHistory(db: Sql, ticker: string): Promise<PricePoint[]> {
  const rows = await db<{ date: Date; close: number }[]>`
    select date, close::float8 as close from marts.mart_price_history
    where ticker = ${ticker} order by date`;
  return rows.map((r) => ({ date: isoDate(r.date), close: r.close }));
}

type QuarterRow = {
  quarter: string;
  revenue: number;
  cost: number | null;
  opex: number | null;
  financial_result: number | null;
  net_income: number;
  depreciation: number;
};

export async function incomeStatement(
  db: Sql,
  ticker: string,
): Promise<IncomeStatementQuarterly | null> {
  const rows = await db<QuarterRow[]>`
    select * from (
      select quarter, quarter_end, revenue, cost, opex, financial_result, net_income, depreciation
      from marts.mart_fundamentals_quarterly where ticker = ${ticker}
      order by quarter_end desc limit 8
    ) q order by quarter_end`;
  if (!rows.length) return null;
  const col = (k: keyof QuarterRow) => rows.map((r) => Number(r[k] ?? 0));
  return {
    ticker,
    unit: 'R$ bi',
    quarters: rows.map((r) => r.quarter),
    revenue: col('revenue'),
    cost: col('cost'),
    opex: col('opex'),
    financialResult: col('financial_result'),
    netIncome: col('net_income'),
    depreciation: col('depreciation'),
  };
}

export async function dataDate(db: Sql): Promise<string> {
  const [row] = await db<
    { d: Date | null }[]
  >`select max(last_date) as d from marts.mart_asset_index`;
  return row?.d ? isoDate(row.d) : '';
}

function isoDate(d: Date | string): string {
  return typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

const LIST_LIMIT = 5000;

// Funções cacheadas sem o RequestContext: dado de mercado é igual para todos os usuários,
// então o userId não entra na chave do cache.
const listCached = cached(() => searchIndex(sql(), '', LIST_LIMIT), 'list');
const searchCached = cached((q: string, limit: number) => searchIndex(sql(), q, limit), 'search');
const cardCached = cached((t: string) => assetCard(sql(), t), 'card');
const historyCached = cached((t: string) => priceHistory(sql(), t), 'history');
const incomeCached = cached((t: string) => incomeStatement(sql(), t), 'income');
const dataDateCached = cached(() => dataDate(sql()), 'data-date');

export const dbAssets: AssetRepository = {
  listAssets: () => listCached(),
  searchAssets: (_ctx, query, limit = 6) => searchCached(query.trim().slice(0, 64), limit),
  getAsset: (_ctx, ticker) => cardCached(ticker.toUpperCase()),
  getPriceHistory: (_ctx, ticker) => historyCached(ticker.toUpperCase()),
  getIncomeStatement: (_ctx, ticker) => incomeCached(ticker.toUpperCase()),
  async getPeers() {
    return [];
  },
  getDataDate: () => dataDateCached(),
};
