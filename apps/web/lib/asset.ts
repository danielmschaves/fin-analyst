import type { PricePoint, ReturnWindow } from './contracts';
import { gaussian, mulberry32 } from './random';

/** Alta necessária (%) para o preço voltar ao preço médio. */
export function riseToAvgPrice(price: number, avgPrice: number) {
  return (avgPrice / price - 1) * 100;
}

export function positionResult(price: number, avgPrice: number, quantity: number) {
  const value = (price - avgPrice) * quantity;
  return { value: Math.round(value * 100) / 100, pct: (price / avgPrice - 1) * 100 };
}

/** Número de pregões de cada janela (YTD conta a partir de 2/1 do ano da data de referência). */
export const WINDOW_SESSIONS: Record<ReturnWindow, number> = {
  '5D': 5,
  '1M': 21,
  '6M': 125,
  YTD: 208,
  '1A': 250,
  '2A': 502,
  '5A': 1255,
};

/**
 * Série de preços sintética que passa exatamente pelas âncoras (ponte browniana com seed fixa).
 * `cap` limita os pontos entre âncoras para que a máxima continue sendo a âncora mais alta.
 */
export function bridgeSeries(
  anchors: [number, number][],
  seed: number,
  { volatility = 0.012, cap }: { volatility?: number; cap?: number } = {},
): number[] {
  const rand = mulberry32(seed);
  const sorted = [...anchors].sort((a, b) => a[0] - b[0]);
  const first = sorted[0]![0];
  const out: number[] = [];
  for (let k = 0; k < sorted.length - 1; k++) {
    const [i0, p0] = sorted[k]!;
    const [i1, p1] = sorted[k + 1]!;
    const n = i1 - i0;
    // passeio aleatório em log, depois "puxado" para terminar em p1
    const walk = [0];
    for (let j = 1; j <= n; j++) walk.push(walk[j - 1]! + gaussian(rand) * volatility);
    const l0 = Math.log(p0);
    const l1 = Math.log(p1);
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const v = Math.exp(l0 + (l1 - l0) * t + walk[j]! - t * walk[n]!);
      out[i0 - first + j] = j === 0 ? p0 : v;
    }
  }
  const [lastI, lastP] = sorted[sorted.length - 1]!;
  out[lastI - first] = lastP;
  const anchorIdx = new Set(sorted.map(([i]) => i - first));
  return out.map((v, i) => {
    let r = Math.round(v * 100) / 100;
    // Reflete (em vez de cortar) o que passaria da máxima, para não formar um platô.
    if (cap !== undefined && !anchorIdx.has(i) && r >= cap)
      r = Math.round((2 * cap - r - 0.05) * 100) / 100;
    return r;
  });
}

/** Datas de pregão (seg–sex) terminando em `endDate`, `count` pontos. */
export function tradingDates(endDate: string, count: number): string[] {
  const [y, m, d] = endDate.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  const out: string[] = [];
  while (out.length < count) {
    const wd = date.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return out.reverse();
}

/** Recorta a série para a janela escolhida. */
export function sliceWindow(series: PricePoint[], window: ReturnWindow) {
  return series.slice(Math.max(0, series.length - 1 - WINDOW_SESSIONS[window]));
}

export function maxPoint(series: PricePoint[]) {
  return series.reduce((m, p) => (p.close > m.close ? p : m), series[0]!);
}

export function windowReturn(series: PricePoint[]) {
  return (series[series.length - 1]!.close / series[0]!.close - 1) * 100;
}

/** Preço no início de cada janela a partir do retorno: p0 = p / (1 + r). */
export function startPriceFromReturn(price: number, returnPct: number) {
  return Math.round((price / (1 + returnPct / 100)) * 100) / 100;
}
