import type { AssetSummary } from './contracts';

/** Parece um ticker da B3? (4 letras + 1–2 dígitos, ex.: VALE3, TAEE11) */
export function looksLikeTicker(query: string) {
  return /^[A-Za-z]{4}\d{1,2}$/.test(query.trim());
}

/** Busca por ticker ou nome; ticker exato primeiro, depois prefixo, depois nome. */
export function searchAssets(index: AssetSummary[], query: string, limit = 6): AssetSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return index.slice(0, limit);
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  const nq = norm(q);
  const scored = index
    .map((a) => {
      const t = a.ticker.toLowerCase();
      const n = norm(a.name);
      const score =
        t === q
          ? 0
          : t.startsWith(q)
            ? 1
            : n.startsWith(nq)
              ? 2
              : n.includes(nq) || t.includes(q)
                ? 3
                : 9;
      return { a, score };
    })
    .filter((x) => x.score < 9)
    .sort((x, y) => x.score - y.score || x.a.ticker.localeCompare(y.a.ticker));
  return scored.slice(0, limit).map((x) => x.a);
}

/** Destino de um texto digitado na barra de comando. */
export function resolveCommand(
  index: AssetSummary[],
  query: string,
): { kind: 'asset'; ticker: string } | { kind: 'ask'; question: string } | { kind: 'none' } {
  const q = query.trim();
  if (!q) return { kind: 'none' };
  const exact = index.find((a) => a.ticker.toLowerCase() === q.toLowerCase());
  if (exact) return { kind: 'asset', ticker: exact.ticker };
  if (looksLikeTicker(q)) return { kind: 'asset', ticker: q.toUpperCase() };
  return { kind: 'ask', question: q };
}
