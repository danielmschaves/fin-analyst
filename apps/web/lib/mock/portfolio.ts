import type {
  AssetClass,
  DividendReceived,
  PortfolioPosition,
  PortfolioSummary,
} from '@/lib/contracts';
import { REFERENCE_DATE } from './assets';

// Posição em 31/10/2026, total 16.188,02. Dados de exemplo fictícios.
type Row = [string, string, AssetClass, number, number | null, number, number, number | null];
const rows: Row[] = [
  ['PETR4', 'Petrobras', 'Ação', 100, 38.5, 3850.0, +2.1, 74],
  ['VALE3', 'Vale', 'Ação', 50, 60.25, 3012.5, -16.4, 51],
  ['ITSA4', 'Itaúsa', 'Ação', 200, 10.0, 2000.0, +0.8, 68],
  ['TAEE11', 'Taesa', 'Ação', 30, 35.0, 1050.0, +1.5, 71],
  ['MXRF11', 'Maxi Renda', 'FII', 150, 9.8, 1470.0, +0.4, null],
  ['HGLG11', 'CSHG Logística', 'FII', 10, 160.0, 1600.0, -0.6, null],
  ['CDB DI', 'CDB pós-fixado', 'Renda Fixa', 3, null, 3205.52, +0.9, null],
];

export const positions: PortfolioPosition[] = rows.map(
  ([ticker, name, assetClass, quantity, price, marketValue, monthChangePct, score]) => ({
    ticker,
    name,
    assetClass,
    quantity,
    price,
    marketValue,
    monthChangePct,
    score,
  }),
);

export const dividends: DividendReceived[] = [
  { paymentDate: '2026-10-01', ticker: 'ITSA4', eventType: 'JCP', amount: 14.0 },
  { paymentDate: '2026-10-14', ticker: 'MXRF11', eventType: 'Rendimento', amount: 13.5 },
  { paymentDate: '2026-10-14', ticker: 'HGLG11', eventType: 'Rendimento', amount: 11.0 },
  { paymentDate: '2026-10-15', ticker: 'TAEE11', eventType: 'Dividendos', amount: 21.3 },
];

export const portfolioSummary: PortfolioSummary = {
  referenceDate: REFERENCE_DATE,
  positions,
  month: { result: 212.4, returnPct: 1.33, cdiPct: 0.89, ibovPct: -1.12 },
  return12mPct: 11.4,
  dividendYieldPct: 7.9,
  dividends,
  history: {
    startDate: '2025-10-31',
    // acumulado %, out/25 → out/26
    portfolioCumulative: [0, 0.8, 2.1, 1.5, 3.0, 4.2, 5.9, 6.6, 5.1, 7.0, 8.4, 9.94, 11.4],
    cdiMonthly: [0, 0.92, 0.95, 0.97, 0.9, 0.94, 0.91, 0.96, 0.93, 0.95, 0.94, 0.91, 0.89],
    ibovCumulative: [0, 1.9, 3.5, 6.0, 4.2, 2.8, 5.5, 8.1, 6.0, 3.9, 5.2, 7.5, 6.3],
  },
};
