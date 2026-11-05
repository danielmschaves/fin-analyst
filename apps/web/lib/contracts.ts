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
