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
