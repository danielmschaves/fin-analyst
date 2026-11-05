import type { IncomeStatementQuarterly, PeerKind, PeerRow } from '@/lib/contracts';

// R$ bi, 4T24 → 3T26. Dados de exemplo fictícios.
export const receita = [52.4, 45.9, 49.8, 53.1, 54.6, 46.7, 50.1, 52.2];
export const custo = [-33.0, -30.1, -31.6, -33.4, -35.2, -31.4, -33.0, -34.1];
export const despesas = [-3.1, -2.8, -3.0, -3.2, -3.6, -2.9, -3.1, -3.3];
export const financeiro = [-1.8, -0.9, -2.2, -1.4, -3.9, -11.8, -4.6, -5.2];
export const lucro = [6.2, 9.4, 7.1, 3.8, 4.8, -6.1, 1.9, 1.5];
export const depreciacao = 4.6; // R$ bi por trimestre

export const vale3Income: IncomeStatementQuarterly = {
  ticker: 'VALE3',
  unit: 'R$ bi',
  quarters: ['4T24', '1T25', '2T25', '3T25', '4T25', '1T26', '2T26', '3T26'],
  revenue: receita,
  cost: custo,
  opex: despesas,
  financialResult: financeiro,
  netIncome: lucro,
  depreciation: receita.map(() => depreciacao),
};

type Row = [
  string,
  number,
  number,
  number | null,
  number,
  number | null,
  number,
  number,
  PeerKind?,
];
// ticker, classif., market cap bi, P/L, ROE, DY, cresc. receita, DL/EBITDA
const rows: Row[] = [
  ['VALE3', 51, 256.4, 120.11, 0.26, 8.83, 1.18, 0.42, 'self'],
  ['Média do setor', 71, 51.9, 51.37, 5.43, 5.99, 0.38, 1.3, 'avg'],
  ['GGBR4', 93, 34.1, 18.57, 5.02, 2.5, -2.4, 0.9],
  ['USIM5', 84, 7.9, 4.38, 7.13, null, 3.1, 1.1],
  ['CMIN3', 66, 27.6, 10.72, 28.14, 12.38, 8.7, 0.3],
  ['KLBN11', 57, 24.3, 306.27, 2.89, 9.51, 6.2, 3.2],
  ['CSNA3', 56, 11.2, null, -12.29, null, -4.8, 3.6],
  ['FESA4', 50, 2.1, 11.35, 4.44, 11.67, -9.3, -0.4],
];

export const vale3Peers: PeerRow[] = rows.map(
  ([ticker, score, marketCap, pe, roe, dividendYield, revenueGrowth, netDebtEbitda, kind]) => ({
    ticker,
    kind: kind ?? 'peer',
    score,
    marketCap,
    pe,
    roe,
    dividendYield,
    revenueGrowth,
    netDebtEbitda,
  }),
);
