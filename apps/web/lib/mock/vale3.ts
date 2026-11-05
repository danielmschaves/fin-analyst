import { bridgeSeries, startPriceFromReturn, tradingDates } from '@/lib/asset';
import type { AssetDetail, PricePoint } from '@/lib/contracts';
import { REFERENCE_DATE } from './assets';

export const price = 60.25;
export const day = -2.85;
export const avgPrice = 64.1;
export const qty = 50;

export const kpis = {
  marketCap: 256.4e9,
  vol3m: 25.4e6,
  beta: 0.6,
  dy: 8.83,
  revGrowth: 1.18,
  pl: 120.11,
  pvp: 1.42,
  roe: 0.26,
};
export const returns = {
  '5D': -6.42,
  '1M': -16.44,
  '6M': -25.78,
  YTD: -16.27,
  '1A': -3.0,
  '2A': 10.89,
  '5A': 32.58,
};
export const score = 51;
export const pillars = { Resultado: 51, Caixa: 69, Balanço: 52, Valuation: 40, Mercado: 85 };

/** Âncoras da série de 1 ano: [pregão, preço]; 251 pregões, seed fixa. */
export const priceAnchors: [number, number][] = [
  [0, 62.11],
  [42, 71.95],
  [125, 81.17],
  [143, 83.3],
  [229, 72.1],
  [245, 64.38],
  [250, 60.25],
];
export const PRICE_SEED = 20261031;

export const vale3: AssetDetail = {
  ticker: 'VALE3',
  name: 'Vale',
  legalName: 'Vale S.A.',
  assetClass: 'Ação',
  sector: 'Mineração',
  industry: 'Metais e mineração',
  quote: { price, dayChangePct: day, date: REFERENCE_DATE },
  returns,
  kpis: {
    marketCap: kpis.marketCap,
    avgVolume3m: kpis.vol3m,
    beta: kpis.beta,
    dividendYield: kpis.dy,
    revenueGrowth: kpis.revGrowth,
    pe: kpis.pl,
    pb: kpis.pvp,
    roe: kpis.roe,
  },
  sectorKpis: { dividendYield: 5.99, revenueGrowth: 0.38, pe: 51.37, roe: 5.43 },
  score,
  pillars: Object.entries(pillars).map(([name, s]) => ({ name, score: s })),
  position: { quantity: qty, avgPrice, marketValue: 3012.5, weightPct: 18.61, weightRank: 3 },
  summaries: {
    fundamentals: 'Receita estável, lucro em queda: margem líquida de 2,9% no 3T26.',
    peers: '2ª menor classificação entre os pares, com DY acima da média do setor.',
    peersCount: 6,
  },
};

/**
 * 5 anos de pregões (1.256 pontos). O último ano (índices 1005–1255) passa pelas `priceAnchors`;
 * o início de 2A e 5A sai dos retornos do fixture.
 */
export function vale3PriceHistory(): PricePoint[] {
  const offset = 1005; // pregão 0 do último ano
  const anchors: [number, number][] = [
    [0, startPriceFromReturn(price, returns['5A'])],
    [offset + 250 - 502, startPriceFromReturn(price, returns['2A'])],
    ...priceAnchors.map(([i, p]) => [offset + i, p] as [number, number]),
  ];
  const closes = bridgeSeries(anchors, PRICE_SEED, { cap: 83.3 });
  const dates = tradingDates(REFERENCE_DATE, closes.length);
  return closes.map((close, i) => ({ date: dates[i]!, close }));
}
