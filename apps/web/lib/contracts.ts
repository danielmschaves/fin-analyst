/**
 * Contratos de dados do fin-analyst.
 * Na fase 1 são preenchidos por `lib/mock/*`; na fase 2, são o formato que os marts do dbt devolvem.
 * Datas em ISO "AAAA-MM-DD" (sem fuso); valores monetários em R$; percentuais em pontos (1,33 = 1,33%).
 */

export type AssetClass = 'Ação' | 'FII' | 'Renda Fixa';

/** Linha de `mart_asset_index`: o que a busca (⌘K) e a lista de ativos precisam. */
export type AssetSummary = {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  sector?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
};

/** Linha de `mart_portfolio_positions` (posição em `referenceDate`). */
export type PortfolioPosition = {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  /** Preço unitário; renda fixa não tem (null). */
  price: number | null;
  marketValue: number;
  /** Variação no mês, em %. */
  monthChangePct: number;
  /** Classificação 0–100; FIIs e renda fixa não são classificados (null). */
  score: number | null;
};

export type DividendEventType = 'JCP' | 'Rendimento' | 'Dividendos';

/** Linha de `dividends_received`. */
export type DividendReceived = {
  paymentDate: string;
  ticker: string;
  eventType: DividendEventType;
  amount: number;
};

/** Resultado do mês de referência. */
export type PortfolioMonth = {
  result: number;
  returnPct: number;
  cdiPct: number;
  ibovPct: number;
};

/**
 * Séries mensais de `mart_portfolio_summary`, do mês inicial (índice 0 = base) ao de referência.
 * `portfolioCumulative` e `ibovCumulative` são acumulados em %; `cdiMonthly` é a taxa de cada mês.
 */
export type PortfolioHistory = {
  startDate: string;
  portfolioCumulative: number[];
  cdiMonthly: number[];
  ibovCumulative: number[];
};

export type PortfolioSummary = {
  referenceDate: string;
  positions: PortfolioPosition[];
  month: PortfolioMonth;
  return12mPct: number;
  dividendYieldPct: number;
  dividends: DividendReceived[];
  history: PortfolioHistory;
};

export type ReturnWindow = '5D' | '1M' | '6M' | 'YTD' | '1A' | '2A' | '5A';
export const RETURN_WINDOWS: ReturnWindow[] = ['5D', '1M', '6M', 'YTD', '1A', '2A', '5A'];

/** Linha de `metrics_snapshot` (últimos 12 meses). Percentuais em pontos. */
export type AssetKpis = {
  marketCap: number;
  avgVolume3m: number;
  beta: number;
  dividendYield: number;
  revenueGrowth: number;
  pe: number | null;
  pb: number;
  roe: number;
};

export type Pillar = { name: string; score: number };

/** Sua posição no ativo. `avgPrice` é null enquanto o PM não pode ser reconstruído. */
export type AssetPosition = {
  quantity: number;
  avgPrice: number | null;
  marketValue: number;
  weightPct: number;
  /** Posição no ranking de peso da carteira (1 = maior). */
  weightRank: number;
};

/** `mart_asset_card`. Campos de mercado ficam null quando o ativo ainda não tem dados. */
export type AssetDetail = {
  ticker: string;
  name: string;
  legalName: string;
  assetClass: AssetClass;
  sector: string;
  industry: string;
  quote: { price: number; dayChangePct: number; date: string } | null;
  returns: Record<ReturnWindow, number> | null;
  kpis: AssetKpis | null;
  /** Médias do setor para comparação. */
  sectorKpis: Partial<AssetKpis> | null;
  score: number | null;
  pillars: Pillar[];
  position: AssetPosition | null;
  /** Frases das seções de resumo (na fase 2, geradas a partir dos marts). */
  summaries: { fundamentals?: string; peers?: string; peersCount?: number };
};

export type PricePoint = { date: string; close: number };
