# Fase 2 — dados reais atrás das mesmas interfaces

A fase 1 entregou todas as telas do Painel 2 com dados de exemplo. A fase 2 troca a origem dos dados
**sem mudar as telas**: as rotas leem dos repositórios em `apps/web/lib/repositories.ts`, e cada
repositório devolve os tipos de `apps/web/lib/contracts.ts`, que são o formato dos marts do dbt.

Referências: spec técnica ("Alinhamento com o design Painel 2" e "Modelo de dados e armazenamento") e
o layout do relatório B3 em [`docs/b3-relatorio-consolidado.md`](./b3-relatorio-consolidado.md).

## 1. A troca: `DATA_SOURCE=mock|db`

| Valor | O que faz | Onde |
| --- | --- | --- |
| `mock` (padrão) | Lê `apps/web/lib/mock/*` | dev, CI, previews |
| `db` | Lê os marts no Postgres (Neon) via Drizzle | produção, a partir do PR 15 |

Hoje `dataSource()` aceita só `mock` e falha com mensagem clara para qualquer outro valor. No PR 12,
`getPortfolioRepository()` e `getAssetRepository()` passam a devolver a implementação Postgres quando
`DATA_SOURCE=db`. As implementações ficam em `packages/db` (schema e migrations) e
`apps/web/lib/repositories/*.db.ts`. Toda query de carteira recebe o `user_id` da sessão na camada
de serviço, nunca do cliente.

## 2. Interfaces e os marts que as alimentam

| Interface (`lib/`) | Método | Tipo devolvido (`contracts.ts`) | Mart / tabela (dbt) |
| --- | --- | --- | --- |
| `PortfolioRepository` | `getSummary()` | `PortfolioSummary` | `mart_portfolio_summary` (view sobre `positions`, `dividends_received`, `macro_series`) |
| `AssetRepository` | `listAssets()` | `AssetSummary[]` | `mart_asset_index` (sobre `assets`) |
| | `getAsset(ticker)` | `AssetDetail \| null` | `mart_asset_card` (`assets` + `metrics_snapshot` + `scores` + posição do usuário) |
| | `getPriceHistory(ticker)` | `PricePoint[]` | `prices_daily` (5 anos, ajustado por proventos) |
| | `getIncomeStatement(ticker)` | `IncomeStatementQuarterly \| null` | `fundamentals_quarterly` pivotado (DRE resumida, R$ bi) |
| | `getPeers(ticker)` | `PeerRow[]` | `mart_peer_table` (inclui a linha `avg` do setor) |
| `ImportParser` | `parse(file)` | `ImportPreview` | `POST /imports/parse` na `services/api` |
| `AssistantProvider` | `ask()`, `suggestions()` | `AssistantAnswer` | Fase 3: API da Anthropic + servidor MCP do fin-analyst |

Regras que os marts precisam respeitar (já valem nos mocks):

- Datas em ISO `AAAA-MM-DD`, sem fuso. Valores em R$. Percentuais em pontos (`1.33` = 1,33%).
- `null` tem significado de tela: `price` null em renda fixa; `score` null para FIIs e renda fixa;
  `pe` null = "N/A" (lucro negativo); `dividendYield` null = "—" (sem proventos);
  `avgPrice` null = estado **"Preço médio indisponível · importe os meses anteriores"**.
- `PortfolioHistory.cdiMonthly` traz as taxas mensais; o acumulado é composto na web
  (`lib/portfolio.ts`).
- `IncomeStatementQuarterly`: custos e despesas negativos; lucro bruto, EBITDA, IR/CS (resíduo) e
  margem são calculados em `lib/fundamentals.ts`, não no mart.

## 3. Contrato verificado nos dois lados

O fixture da carteira existe uma vez só e é servido pela API:

```
apps/web/lib/mock/portfolio.ts  ──pnpm --filter web fixtures:export──▶  packages/fixtures/portfolio.json
services/api/app/models.py      ──python -m app.schema───────────────▶  packages/contracts/portfolio-summary.schema.json
```

- `services/api`: `GET /portfolio` devolve o fixture validado pelos modelos Pydantic (camelCase,
  `extra="forbid"`). `tests/test_portfolio.py` falha se o schema versionado ficar diferente dos
  modelos.
- `apps/web`: `tests/unit/contract.test.ts` valida o mock (tipado por `lib/contracts.ts`) contra o
  JSON Schema da API, sem campos a mais ou a menos, e confere que o fixture exportado é igual ao
  mock.

Mudou um campo? Altere `contracts.ts` **e** `models.py`, rode os dois comandos acima e commite os
JSONs. O CI quebra se um lado ficar para trás.

## 4. Parser do relatório B3 (PR 13)

`services/api` ganha `POST /imports/parse` (multipart, até 10 MB, só `.xlsx` na fase 2):

1. Identifica o relatório consolidado mensal pelos nomes das 5 abas; data de referência = último
   dia do mês do nome do arquivo (`lib/import.ts › referenceDateFromFileName` já faz isso na web).
2. Normaliza conforme `docs/b3-relatorio-consolidado.md`: `"-"`/`""` → null, datas `dd/mm/aaaa`,
   `Produto` → ticker, **descarta a coluna Conta**, renda fixa usa MTM e cai para CURVA.
3. Devolve `ImportPreview` (o mesmo tipo do mock), com avisos. A revisão passa a mostrar também
   proventos e negociações.
4. Idempotência por SHA-256 do arquivo; importar um mês já existente substitui o snapshot do mês.
5. PM reconstruído pelas Negociações de todos os meses importados (custo médio ponderado; vendas não
   mudam o PM). Sem histórico suficiente, `avgPrice = null`.

Testes com `tests/fixtures/relatorio-consolidado-sintetico.xlsx` (o arquivo real nunca entra no
repo).

## 5. Sequência

| PR | Escopo |
| --- | --- |
| 11 | Auth.js (Google/GitHub) + allowlist, `/login`, middleware, isolamento por `user_id` |
| 12 | Neon + `packages/db` (Drizzle), repositórios Postgres atrás de `DATA_SOURCE=db` |
| 13 | Parser B3 na `services/api`, PM reconstruído, `ImportParser` real |
| 14 | `services/ingest`: brapi, BCB (SGS) e CVM em containers; workflows diário e semanal |
| 15 | `services/transform` (dbt): staging, core e marts no formato de `contracts.ts`; produção em `db` |
| 16 | Classificação v1 (percentil no setor), `docs/score.md` |

## 6. Pontos em aberto herdados da fase 1

- **"Dados de 31/10/2026"**: 31/10/2026 é sábado. Os mocks mantêm a data da prancha; com dados
  reais, a data mostrada é a do último pregão.
- **Rodapé**: "cotações de fechamento (D-1)" — o pipeline é diário.
- **Assistente**: respostas são roteiros fixos (`lib/mock/assistant.ts`); o contrato
  `AssistantProvider` já prevê as conexões MCP ativas no pedido.
