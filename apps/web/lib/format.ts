/**
 * Formatação pt-BR do Painel 2.
 * - Negativo com o sinal de menos tipográfico (−, U+2212), nunca o hífen.
 * - Espaço comum entre "R$" e o número (use `whitespace-nowrap` no componente).
 */

export const MINUS = '−';

type SignOption = { sign?: boolean };

function nf(decimals: number, minDecimals = decimals) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: decimals,
  });
}

/** Prefixo de sinal: "−" para negativo; "+" para positivo quando `sign`. Zero não leva sinal. */
function signPrefix(value: number, sign: boolean) {
  if (value < 0) return MINUS;
  if (sign && value > 0) return '+';
  return '';
}

function rounded(value: number, decimals: number) {
  const factor = 10 ** decimals;
  const r = Math.round(Math.abs(value) * factor) / factor;
  return r === 0 ? 0 : value < 0 ? -r : r;
}

/** 1234.5 → "1.234,50"; −3 → "−3,00" */
export function formatNumber(value: number, decimals = 2, { sign = false }: SignOption = {}) {
  const r = rounded(value, decimals);
  return signPrefix(r, sign) + nf(decimals).format(Math.abs(r));
}

/** Inteiro com separador de milhar: 1279.3 → "1.279" */
export function formatInteger(value: number, opts: SignOption = {}) {
  return formatNumber(value, 0, opts);
}

/** 16188.02 → "R$ 16.188,02"; −192.5 → "−R$ 192,50"; com sign: 14 → "+R$ 14,00" */
export function formatBRL(
  value: number,
  { sign = false, decimals = 2 }: SignOption & { decimals?: number } = {},
) {
  const r = rounded(value, decimals);
  return `${signPrefix(r, sign)}R$ ${nf(decimals).format(Math.abs(r))}`;
}

/** 1.33 → "+1,33%"; −16.27 → "−16,27%". `sign` é true por padrão (variações). */
export function formatPercent(
  value: number,
  { sign = true, decimals = 2 }: SignOption & { decimals?: number } = {},
) {
  const r = rounded(value, decimals);
  return `${signPrefix(r, sign)}${nf(decimals).format(Math.abs(r))}%`;
}

/** Diferença em pontos percentuais: −2.6 → "−2,6 p.p." */
export function formatPP(
  value: number,
  { decimals = 1, sign = true }: SignOption & { decimals?: number } = {},
) {
  const r = rounded(value, decimals);
  return `${signPrefix(r, sign)}${nf(decimals).format(Math.abs(r))} p.p.`;
}

/** 256.4e9 → "256,4 bi"; 25.4e6 → "25,4 mi"; 7919 → "7,9 mil" */
export function formatCompact(
  value: number,
  { decimals = 1, sign = false }: SignOption & { decimals?: number } = {},
) {
  const abs = Math.abs(value);
  const units: [number, string][] = [
    [1e12, 'tri'],
    [1e9, 'bi'],
    [1e6, 'mi'],
    [1e3, 'mil'],
  ];
  for (const [size, label] of units) {
    if (abs >= size) {
      const r = rounded(value / size, decimals);
      return `${signPrefix(r, sign)}${nf(decimals).format(Math.abs(r))} ${label}`;
    }
  }
  return formatNumber(value, decimals, { sign });
}

/** Múltiplo: 0.42 → "0,42x" */
export function formatMultiple(value: number, decimals = 2) {
  return `${formatNumber(value, decimals)}x`;
}

function toDate(value: Date | string) {
  if (value instanceof Date) return value;
  // "AAAA-MM-DD" é interpretado como data local (sem fuso).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** "2026-10-31" → "31/10/2026" */
export function formatDate(value: Date | string) {
  const d = toDate(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** "2026-10-01" → "01/10" */
export function formatDayMonth(value: Date | string) {
  return formatDate(value).slice(0, 5);
}

export const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/** "2026-10-31" → "out/26"; com `fullYear` → "out/2026" */
export function formatMonthShort(value: Date | string, { fullYear = false } = {}) {
  const d = toDate(value);
  const y = fullYear ? String(d.getFullYear()) : String(d.getFullYear()).slice(2);
  return `${MONTHS[d.getMonth()]!.slice(0, 3)}/${y}`;
}

/** Substitui o hífen de números negativos pelo sinal de menos tipográfico. */
export function typographicMinus(text: string) {
  return text.replace(/-(?=\d)/g, MINUS);
}
