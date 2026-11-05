import 'server-only';
import type {
  AssetDetail,
  AssetSummary,
  AssistantProvider,
  ImportParser,
  IncomeStatementQuarterly,
  PeerRow,
  PortfolioSummary,
  PositionSnapshot,
  PricePoint,
  ProjectionInputs,
  RequestContext,
} from './contracts';
import { mockAssistantProvider } from './mock/assistant';
import { REFERENCE_DATE, assetIndex } from './mock/assets';
import { vale3Income, vale3Peers } from './mock/fundamentals';
import { mockImportParser, septemberSnapshot } from './mock/import';
import { portfolioSummary } from './mock/portfolio';
import { defaultInputs } from './mock/projection';
import { vale3, vale3PriceHistory } from './mock/vale3';
import { totalValue, weightPct } from './portfolio';

/**
 * Interfaces de dados. Toda chamada recebe o `RequestContext` da sessão (lib/session.ts).
 * `DATA_SOURCE=db` (F2-2) troca as implementações por Postgres: schema `marts` + tabelas `app.*`.
 */
export interface PortfolioRepository {
  getSummary(ctx: RequestContext): Promise<PortfolioSummary>;
  /** Último snapshot importado antes de `beforeDate` (base da comparação na importação). */
  getPreviousSnapshot(ctx: RequestContext, beforeDate: string): Promise<PositionSnapshot | null>;
  /** Premissas iniciais de /projecoes (patrimônio, rentabilidade 12M e DY vêm da carteira). */
  getProjectionDefaults(ctx: RequestContext): Promise<ProjectionInputs>;
}

export interface AssetRepository {
  listAssets(ctx: RequestContext): Promise<AssetSummary[]>;
  /** null quando o ticker não existe. */
  getAsset(ctx: RequestContext, ticker: string): Promise<AssetDetail | null>;
  getPriceHistory(ctx: RequestContext, ticker: string): Promise<PricePoint[]>;
  /** DRE trimestral; null quando ainda não há demonstrativos. */
  getIncomeStatement(ctx: RequestContext, ticker: string): Promise<IncomeStatementQuarterly | null>;
  getPeers(ctx: RequestContext, ticker: string): Promise<PeerRow[]>;
  /** Data dos dados de mercado (último pregão). */
  getDataDate(ctx: RequestContext): Promise<string>;
}

export type DataSource = 'mock';

export function dataSource(value = process.env.DATA_SOURCE): DataSource {
  const v = value ?? 'mock';
  if (v !== 'mock') {
    throw new Error(`DATA_SOURCE="${v}" ainda não é suportado. "db" chega no F2-2.`);
  }
  return v;
}

/* ───────────────────────── Implementação mock (ignora o usuário) ───────────────────────── */

const mockPortfolio: PortfolioRepository = {
  async getSummary() {
    return portfolioSummary;
  },
  async getPreviousSnapshot(_ctx, beforeDate) {
    return septemberSnapshot.referenceDate < beforeDate ? septemberSnapshot : null;
  },
  async getProjectionDefaults() {
    const s = portfolioSummary;
    return {
      ...defaultInputs,
      start: totalValue(s.positions),
      baseRate: s.return12mPct,
      dividendYield: s.dividendYieldPct,
    };
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
  async getAsset(_ctx, ticker) {
    const t = ticker.toUpperCase();
    return detailed[t] ?? basicDetail(t);
  },
  async getPriceHistory(_ctx, ticker) {
    return ticker.toUpperCase() === 'VALE3' ? vale3PriceHistory() : [];
  },
  async getIncomeStatement(_ctx, ticker) {
    return ticker.toUpperCase() === 'VALE3' ? vale3Income : null;
  },
  async getPeers(_ctx, ticker) {
    return ticker.toUpperCase() === 'VALE3' ? vale3Peers : [];
  },
  async getDataDate() {
    return REFERENCE_DATE;
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

export function getImportParser(): ImportParser {
  dataSource();
  return mockImportParser;
}

export function getAssistantProvider(): AssistantProvider {
  dataSource();
  return mockAssistantProvider;
}
