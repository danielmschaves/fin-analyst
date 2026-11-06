# Fase 2 — dados reais atrás das mesmas interfaces

A fase 1 entregou todas as telas do Painel 2 com dados de exemplo. A fase 2 troca a origem dos dados
**sem mudar as telas**: as rotas leem dos repositórios em `apps/web/lib/repositories.ts`, e cada
repositório devolve os tipos de `apps/web/lib/contracts.ts`, que são o formato dos marts do dbt.

- Prompt da fase (sequência F2-0 … F2-6, decisões e critérios de aceite):
  [`prompts/fase-2-dados-reais.md`](../prompts/fase-2-dados-reais.md).
- Inconsistências encontradas depois da fase 1 e como foram resolvidas:
  [`prompts/fase-2-inconsistencias.md`](../prompts/fase-2-inconsistencias.md).
- **PoC da plataforma de dados** (vem antes do F2-1; critérios e arquitetura mínima):
  [`docs/poc-plataforma-dados.md`](./poc-plataforma-dados.md).
- Spec técnica ("Alinhamento com o design Painel 2" e "Modelo de dados e armazenamento") e o layout
  do relatório B3 em [`docs/b3-relatorio-consolidado.md`](./b3-relatorio-consolidado.md).

## 1. A troca: `DATA_SOURCE=mock|db`

| Valor | O que faz | Onde |
| --- | --- | --- |
| `mock` (padrão) | Lê `apps/web/lib/mock/*` | dev, CI (um dos modos) |
| `db` | Lê o schema `marts` e as tabelas `app.*` no Postgres (Neon) via Drizzle | CI (outro modo, com seed), produção a partir do F2-5 |

Hoje `dataSource()` aceita só `mock` e falha com mensagem clara para qualquer outro valor.

- **F2-0:** todas as interfaces passam a receber um `RequestContext { userId, role }`, que vem da sessão e nunca do cliente. Nenhuma tela importa `lib/mock` direto; tudo passa pelos repositórios.
- **F2-2:** `DATA_SOURCE=db` devolve as implementações Postgres (`packages/db` + `apps/web/lib/repositories/*.db.ts`).

## 2. Interfaces e a fonte no modo `db`

| Interface.método | Contrato (`contracts.ts`) | Fonte |
| --- | --- | --- |
| `PortfolioRepository.getSummary(ctx)` | `PortfolioSummary` | `marts.mart_portfolio_summary` + `mart_portfolio_evolution` (views; rentabilidade mensal time-weighted contra CDI e ^BVSP) |
| `.getPreviousSnapshot(ctx, month)` | `ParsedPosition[]` | `app.positions_snapshot` |
| `AssetRepository.listAssets(ctx)` | `AssetSummary[]` | `marts.mart_asset_index` |
| `.getAsset(ctx, ticker)` | `AssetDetail \| null` | `marts.mart_asset_card` + `mart_asset_returns` (mercado) + posição e PM de `app.*` (por usuário) |
| `.getPriceHistory(ctx, ticker)` | `PricePoint[]` | `marts.mart_price_history` (5 anos, ajustado por proventos) |
| `.getIncomeStatement` / `getBalanceSheet` / `getCashFlow` | DRE, BP e DFC trimestrais | `marts.mart_fundamentals_quarterly` |
| `.getPeers(ctx, ticker)` | `PeerRow[]` | `marts.mart_peer_table` (inclui a linha `avg` do setor) |
| `.getDataDate()` | `string` | último pregão em `mart_price_history` |
| `ImportParser.parse(input, ctx)` | `ImportPreview` | `services/api` · `POST /imports/parse` |
| `AssistantProvider` | `AssistantAnswer` | mock; com `db`, estado "o assistente com seus dados chega na fase 3" |

Regras que os marts precisam respeitar (já valem nos mocks):

- **Formato:** datas em ISO `AAAA-MM-DD`, sem fuso. Valores em R$. Percentuais em pontos (`1.33` = 1,33%).
- **`null` tem significado de tela:**
  - `price` null em renda fixa;
  - `score` null para FIIs e renda fixa (e para todos até o F2-6);
  - `pe` null = "N/A" (lucro negativo);
  - `dividendYield` null = "—" (sem proventos);
  - `avgPrice` null = estado **"Preço médio indisponível · importe os meses anteriores"**.
- **Contratos ajustados no F2-0** para caber os dados reais:
  - `monthChangePct` e `PortfolioMonth` aceitam null no primeiro mês importado;
  - `depreciation` passa a ser por trimestre;
  - `ImportPreview` ganha `dividendsCount`, `tradesCount` e `previousSnapshot`.
- **Cálculos ficam na web:** `PortfolioHistory.cdiMonthly` traz as taxas mensais e o acumulado é composto em `lib/portfolio.ts`. Lucro bruto, EBITDA, IR/CS (resíduo) e margem são calculados em `lib/fundamentals.ts`, não no mart.
- **Patrimônio:** quantidades do último snapshot × fechamento D-1; renda fixa pelo valor do relatório.

## 3. Contrato verificado nos dois lados

```
apps/web/lib/mock/*            ──pnpm --filter web fixtures:export──▶  packages/fixtures/*.json  (seed do banco)
services/api/app/models.py     ──python -m app.schema───────────────▶  packages/contracts/*.schema.json
```

- **Fase 1:** `GET /portfolio` serve `packages/fixtures/portfolio.json`, e `tests/unit/contract.test.ts` valida o mock contra o JSON Schema da API.
- **F2-2:** o seed do Postgres lê `packages/fixtures/*.json`. Um **teste de paridade mock × db** garante que os repositórios devolvem as mesmas saídas, e um **teste de isolamento** garante que um usuário não vê dados de outro.
- **F2-3:** `GET /portfolio` sai da API. O contrato API passa a cobrir `ImportPreview`, o payload de `POST /imports/parse`.

Mudou um campo? Altere `contracts.ts` **e** `models.py`, regenere os JSONs e commite. O CI quebra se
um lado ficar para trás.

## 4. Importação real (F2-3)

1. O navegador envia o arquivo **direto para o Vercel Blob** (store privado, até 10 MB, nome = SHA-256). Um upload pelo servidor não serve, porque o corpo de uma Vercel Function é limitado a ~4,5 MB.
2. Um route handler do web chama `POST /imports/parse` com `{ blobUrl, name, size, sha256 }` e o header `X-Internal-Secret`. Só `.xlsx`; um `.pdf` mostra "Envie o .xlsx do relatório consolidado".
3. A API identifica o relatório pelas 5 abas e normaliza conforme `docs/b3-relatorio-consolidado.md`:
   - `"-"` e `""` viram null; datas no formato `dd/mm/aaaa`;
   - `Produto` → ticker; **a coluna Conta é descartada**;
   - renda fixa usa MTM e, sem MTM, CURVA.
4. A revisão mostra posições, proventos e negociações. A comparação é contra o snapshot anterior; no primeiro mês, "primeiro mês importado".
5. Idempotência:
   - o mesmo SHA-256 não duplica;
   - um mês repetido substitui o snapshot do mês;
   - vários arquivos de uma vez são processados em ordem de mês.
6. O PM é reconstruído pelas Negociações de todos os meses importados (custo médio ponderado; vendas não mudam o PM). Sem histórico suficiente, `avgPrice = null`.
7. O arquivo bruto expira em 30 dias; ficam só os dados normalizados.

Testes com `tests/fixtures/relatorio-consolidado-sintetico.xlsx` (o arquivo real nunca entra no
repo).

## 5. Sequência

| PR | Escopo |
| --- | --- |
| F2-0 | Refactor: tudo pelos repositórios, `RequestContext`, contratos ajustados, sem mudança visual |
| F2-1 | Auth.js (Google/GitHub), `ALLOWED_EMAILS`/`ADMIN_EMAILS`, `/login`, middleware, `/design` só admin em produção |
| F2-2 | Neon + `packages/db` (Drizzle, schema `app`, seed), repositórios Postgres, CI em `mock` e `db`, paridade e isolamento |
| F2-3 | Parser B3 na `services/api`, upload via Blob, PM reconstruído, `ImportParser` real |
| F2-4 | `services/ingest`: brapi, BCB (SGS), CVM e classificação B3; workflows diário e semanal |
| F2-5 | `services/transform` (dbt): staging, core, marts e Balanço/DFC; produção em `db` |
| F2-6 | Classificação v1 (percentil no setor), `mart_scores`, `docs/score.md` |

## 6. Variáveis de ambiente

- **Vercel (web):** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`,
  `AUTH_GITHUB_SECRET`, `ALLOWED_EMAILS`, `ADMIN_EMAILS`, `DATABASE_URL` (pooled),
  `BLOB_READ_WRITE_TOKEN`, `INTERNAL_API_URL`, `INTERNAL_API_SECRET`, `DATA_SOURCE`.
- **Vercel (api, segundo projeto com Root Directory `services/api`):** `INTERNAL_API_SECRET`,
  `BLOB_READ_WRITE_TOKEN`.
- **GitHub Actions:** `DATABASE_URL_UNPOOLED` (migrations e dbt), `BRAPI_TOKEN`,
  `BLOB_READ_WRITE_TOKEN`. Só no CI: `AUTH_E2E=1` (provider de login dos e2e, desligado em produção).

## 7. Pontos em aberto herdados da fase 1

- **"Dados de 31/10/2026"**: 31/10/2026 é sábado. Os mocks mantêm a data da prancha; com dados
  reais, `getDataDate()` devolve o último pregão.
- **Rodapé**: "cotações de fechamento (D-1)" — o pipeline é diário.
- **Assistente**: respostas são roteiros fixos (`lib/mock/assistant.ts`); o contrato
  `AssistantProvider` já prevê as conexões MCP ativas no pedido. Fica mock até a fase 3.
