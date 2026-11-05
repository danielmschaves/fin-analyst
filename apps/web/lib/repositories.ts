import 'server-only';
import type { AssetSummary, PortfolioSummary } from './contracts';
import { assetIndex } from './mock/assets';
import { portfolioSummary } from './mock/portfolio';

/** Interfaces de dados. Na fase 2, `DATA_SOURCE=db` troca as implementações por Postgres (marts do dbt). */
export interface PortfolioRepository {
  getSummary(): Promise<PortfolioSummary>;
}

export interface AssetRepository {
  listAssets(): Promise<AssetSummary[]>;
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

const mockAssets: AssetRepository = {
  async listAssets() {
    return assetIndex;
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
