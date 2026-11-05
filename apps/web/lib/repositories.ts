import 'server-only';
import type {
  AssetDetail,
  AssetSummary,
  IncomeStatementQuarterly,
  PeerRow,
  PortfolioSummary,
  PricePoint,
} from './contracts';
import { vale3Income, vale3Peers } from './mock/fundamentals';
import { weightPct } from './portfolio';
import { assetIndex } from './mock/assets';
import { portfolioSummary } from './mock/portfolio';
import { vale3, vale3PriceHistory } from './mock/vale3';

/** Interfaces de dados. Na fase 2, `DATA_SOURCE=db` troca as implementações por Postgres (marts do dbt). */
export interface PortfolioRepository {
  getSummary(): Promise<PortfolioSummary>;
}

export interface AssetRepository {
  listAssets(): Promise<AssetSummary[]>;
  /** null quando o ticker não existe. */
  getAsset(ticker: string): Promise<AssetDetail | null>;
  getPriceHistory(ticker: string): Promise<PricePoint[]>;
  /** DRE trimestral; null quando ainda não há demonstrativos. */
  getIncomeStatement(ticker: string): Promise<IncomeStatementQuarterly | null>;
  getPeers(ticker: string): Promise<PeerRow[]>;
}

export type DataSource = 'mock';

export function dataSource(value = process.env.DATA_SOURCE): DataSource {
  const v = value ?? 'mock';
  if (v !== 'mock') {
    throw new Error(`DATA_SOURCE="${v}" ainda não é suportado. Na fase 1 só existe "mock".`);
  }
  return v;
}

const mockPortfolio: PortfolioRepository = {
  async getSummary() {
    return portfolioSummary;
  },
};

const detailed: Record<string, AssetDetail> = { VALE3: vale3 };

/** Ativos sem dados de mercado no exemplo: só cadastro e, se houver, a posição (sem PM). */
function basicDetail(ticker: string): AssetDetail | null {
  const summary = assetIndex.find((a) => a.ticker === ticker);
  if (!summary) return null;
  const positions = portfolioSummary.positions;
  const pos = positions.find((p) => p.ticker === ticker);
  const rank =
    [...positions]
      .sort((a, b) => b.marketValue - a.marketValue)
      .findIndex((p) => p.ticker === ticker) + 1;
  return {
    ticker,
    name: summary.name,
    legalName: summary.name,
    assetClass: summary.assetClass,
    sector: summary.sector ?? '',
    industry: '',
    quote: null,
    returns: null,
    kpis: null,
    sectorKpis: null,
    score: pos?.score ?? null,
    pillars: [],
    position: pos
      ? {
          quantity: pos.quantity,
          avgPrice: null,
          marketValue: pos.marketValue,
          weightPct: weightPct(pos, positions),
          weightRank: rank,
        }
      : null,
    summaries: {},
  };
}

const mockAssets: AssetRepository = {
  async listAssets() {
    return assetIndex;
  },
  async getAsset(ticker) {
    const t = ticker.toUpperCase();
    return detailed[t] ?? basicDetail(t);
  },
  async getPriceHistory(ticker) {
    return ticker.toUpperCase() === 'VALE3' ? vale3PriceHistory() : [];
  },
  async getIncomeStatement(ticker) {
    return ticker.toUpperCase() === 'VALE3' ? vale3Income : null;
  },
  async getPeers(ticker) {
    return ticker.toUpperCase() === 'VALE3' ? vale3Peers : [];
  },
};

export function getPortfolioRepository(): PortfolioRepository {
  dataSource();
  return mockPortfolio;
}

export function getAssetRepository(): AssetRepository {
  dataSource();
  return mockAssets;
}
