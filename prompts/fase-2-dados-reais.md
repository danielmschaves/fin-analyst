# fin-analyst · Fase 2: dados reais, acesso e pipeline

> Repositório: https://github.com/danielmschaves/fin-analyst.
> **Pré-requisito:** fase 1 mergeada (GitHub #1–#11, PRs 0–10 do plano) + #13 (fontes Geist/Faustina self-hosted). O app tem o Painel 2, as 5 telas, o assistente e `/conexoes` com dados mock atrás de `PortfolioRepository`, `AssetRepository`, `ImportParser` e `AssistantProvider`; contratos em `apps/web/lib/contracts.ts`; `DATA_SOURCE=mock`; contrato web × API verificado por `packages/contracts` (JSON Schema) e `packages/fixtures`.

### 0. Anexos e precedência
| Fonte | Para quê |
|---|---|
| Spec técnica | Arquitetura, modelo de dados, camadas do dbt, fontes, acesso. Leia antes "Alinhamento com o design Painel 2". |
| Canvas Painel 2 | Visual de qualquer estado novo. |
| No repo: `CLAUDE.md`, `docs/phase-2.md`, `docs/b3-relatorio-consolidado.md`, `tests/fixtures/relatorio-consolidado-sintetico.xlsx` | Convenções, contratos, layout B3. |

Em conflito: **este prompt → `CLAUDE.md` → canvas (visual) / spec (dados e arquitetura)**.

### 1. Objetivo
Trocar os mocks por dados reais **sem mudar nenhuma tela**. Estados novos (primeiro mês, evolução
insuficiente, carteira vazia) seguem o Painel 2. Ao fim: login em produção, importação dos meus
relatórios mensais B3 e navegação com cotações de fechamento (D-1) e fundamentos da CVM. As regras de
trabalho são as da fase 1: um PR por vez, testes no próprio PR, CI verde e espera pelo merge.

### 2. Decisões
- **`apps/web`**
  - Lê do Postgres via Drizzle: só o schema `marts` e as tabelas que o app escreve (schema `app`).
  - Nunca chama a API Python para renderizar uma página.
  - Todo acesso a dados passa por `RequestContext { userId, role }`, que vem da sessão e nunca do cliente.
- **`services/api`** (FastAPI)
  - Só `GET /health` e `POST /imports/parse`.
  - Chamada só do servidor do web, com o header `X-Internal-Secret: INTERNAL_API_SECRET`.
  - Lê o arquivo pelo `blobUrl` do Vercel Blob.
  - Deploy: segundo projeto Vercel (Root Directory `services/api`). Docker para o Compose e o CI. Sem DuckDB.
- **Uploads**
  - Vão direto do navegador para o Vercel Blob (store privado; client upload; até 10 MB), com nome = SHA-256.
  - O arquivo bruto expira em 30 dias depois do parse.
- **`services/ingest`** (Python 3.12, Docker): um módulo por conector (`extract → Parquet zstd no Blob → raw.* no Postgres`).
- **`services/transform`** (dbt-core + dbt-postgres, Docker)
  - Camadas: staging (views) → core (incremental) → marts.
  - Os marts têm a forma de `lib/contracts.ts`.
- **`packages/db`**
  - Drizzle: schema `app` (users, imports, positions_snapshot, positions_fixed_income, dividends_received, trades_monthly) e migrations.
  - Seed a partir de `packages/fixtures/*.json`.
- **Infra**
  - Neon via Vercel Marketplace, com branch por preview.
  - `infra/docker-compose.yml` sobe postgres:16, api, ingest e transform.
  - GitHub Actions: diário às 19h BRT (`0 22 * * 1-5` UTC: preços, proventos, macro → `dbt build`) e semanal aos domingos (CVM → `dbt build`).
  - Se um teste do dbt falhar, os marts não são publicados (build em schema de staging + swap) e o workflow abre uma issue.
- **Fontes**
  - brapi.dev para cotações, proventos e ^BVSP (COTAHIST no backfill);
  - CVM Dados Abertos: cadastro, FCA valores mobiliários (ticker ↔ CNPJ) e DFP/ITR;
  - classificação setorial B3, para setor e pares;
  - BCB SGS: CDI 4391 (mensal), Selic 4390, IPCA 433.
  - Antes de cada conector, registre limites, termos e licença em `docs/sources.md`.
- **CI sem rede externa:** conectores testados com respostas gravadas (fixtures). Testes do web nos modos `mock` e `db` (serviço postgres:16 no job).

### 3. Sequência de PRs

**F2-0 · `refactor(data): tudo pelos repositórios`** (sem mudança visual)
- `RequestContext` em todas as interfaces. O que hoje importa `lib/mock/*` passa a usar repositório ou provider:
  - `(app)/layout`: usuário, `assetIndex`, data;
  - `/ativos`, `/projecoes` (`defaultInputs`);
  - assistente e conexões;
  - wizard de importação (diff contra o snapshot anterior, vindo do servidor).
- Novos métodos: `AssetRepository.getDataDate()`, `PortfolioRepository.getPreviousSnapshot()`, `ProjectionDefaults` vindos do repositório.
- Contratos ajustados (itens 9, 11 e 21 de `prompts/fase-2-inconsistencias.md`); mocks, schema Pydantic e JSONs regenerados.
- Textos de mock derivados dos dados (item 7 das inconsistências). `fixtures:export` passa a exportar todos os fixtures.
- Alinhar a estratégia de merge (item 26 das inconsistências).
- Testes: a suíte inteira e os 75 e2e passam **sem atualizar snapshots**; testes de contrato atualizados; teste de que nenhum arquivo em `app/` ou `components/` importa `lib/mock`.

**F2-1 · `feat(auth)`**
- Auth.js v5 (Google e GitHub, sessão JWT), `ALLOWED_EMAILS` e `ADMIN_EMAILS` (admin/viewer).
- `middleware.ts` protege tudo, exceto `/login`, `/api/auth/*` e os assets estáticos.
- `/login` no Painel 2. Menu do usuário com nome, e-mail da sessão e "Sair".
- `/design`: dev, CI e preview liberados; em produção, só `admin`.
- Provider `e2e` (Credentials) só com `AUTH_E2E=1` e fora de produção. O Playwright loga no `globalSetup`.
- Testes:
  - sem sessão → `/login`; e-mail fora da allowlist recusado;
  - papéis;
  - `/design` em produção (viewer 404, admin 200);
  - provider e2e desligado em produção;
  - os 75 e2e continuam verdes, agora logados.

**F2-2 · `feat(db)`**
- Neon + `packages/db` (schema `app`, migrations e seed vindo de `packages/fixtures`).
- Repositórios Postgres atrás de `DATA_SOURCE=mock|db`. Os de mercado leem `marts.*`, populados pelo seed até o F2-5.
- CI em dois modos: Vitest e e2e com `DATA_SOURCE=db` contra postgres:16 com seed.
- **Teste de paridade mock × db** (saídas iguais).
- **Teste de isolamento**: dois usuários no seed; A não vê dados de B em nenhuma interface.

**F2-3 · `feat(import)`**
- Parser em `services/api` (`POST /imports/parse`) seguindo `docs/b3-relatorio-consolidado.md` (5 abas, descarta a coluna Conta, MTM → CURVA). pytest contra a fixture sintética.
- Remove `GET /portfolio`. O contrato API (JSON Schema + ajv) passa a cobrir `ImportPreview`.
- Upload direto para o Blob. Um route handler chama a API e grava em `app.*` ao confirmar.
- Só .xlsx; um .pdf mostra o toast "Envie o .xlsx do relatório consolidado".
- A revisão mostra também a contagem de proventos e negociações. No primeiro mês, a comparação diz "primeiro mês importado".
- PM reconstruído pelas Negociações de todos os meses importados (custo médio ponderado; vendas não mudam o PM). Sem histórico → estado "Preço médio indisponível".
- Idempotência: o mesmo SHA-256 não duplica; um mês repetido substitui o snapshot do mês; vários arquivos de uma vez (processados em ordem de mês).

**F2-4 · `feat(ingest)`**
- Conectores brapi, BCB, CVM e classificação B3, gravando Parquet no Blob e `raw.*`.
- `infra/docker-compose.yml`; workflows diário e semanal (sem publicar marts ainda).
- `docs/sources.md` completo.
- Testes com respostas gravadas.

**F2-5 · `feat(transform)`**
- Projeto dbt com testes (`unique`, `not_null`, `relationships`, `accepted_values`) e source freshness.
- Marts (tabela única na seção B.3); os de carteira como views filtradas por `user_id` na consulta.
- Balanço e DFC preenchem as abas que já existem.
- Publicação com swap só se `dbt build` passar; falha abre uma issue.
- Liga `DATA_SOURCE=db` em produção. Classificação ainda null.

**F2-6 · `feat(score)`**
- Classificação v1: percentil no setor por pilar (Resultado, Caixa, Balanço, Valuation, Mercado), faixas Fraco/Médio/Forte da fase 1.
- `mart_scores` com `model_version`; fórmula em `docs/score.md`; testes de faixa.

Fase 3: assistente real (API da Anthropic + servidor MCP do fin-analyst), Open Finance e tela Comparar.

### B.3 Interfaces → fonte no modo `db`
| Interface.método | Contrato | Fonte |
|---|---|---|
| `PortfolioRepository.getSummary(ctx)` | `PortfolioSummary` | `marts.mart_portfolio_summary` + `mart_portfolio_evolution` (views; TWR mensal contra CDI e ^BVSP) |
| `.getPreviousSnapshot(ctx, month)` | `ParsedPosition[]` | `app.positions_snapshot` |
| `AssetRepository.listAssets(ctx)` | `AssetSummary[]` | `marts.mart_asset_index` |
| `.getAsset(ctx, ticker)` | `AssetDetail \| null` | `marts.mart_asset_card` + `mart_asset_returns` (mercado) + posição/PM de `app.*` (por usuário) |
| `.getPriceHistory(ctx, ticker)` | `PricePoint[]` | `marts.mart_price_history` (5 anos, ajustado) |
| `.getIncomeStatement` / `getBalanceSheet` / `getCashFlow` | DRE/BP/DFC trimestrais | `marts.mart_fundamentals_quarterly` |
| `.getPeers(ctx, ticker)` | `PeerRow[]` | `marts.mart_peer_table` (inclui `avg`) |
| `.getDataDate()` | `string` | último pregão em `mart_price_history` |
| `ImportParser.parse(input, ctx)` | `ImportPreview` | `services/api POST /imports/parse` |
| `AssistantProvider` | — | mock (`db`: estado "chega na fase 3") |

### B.4 Variáveis de ambiente
- **Vercel (web):** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `ALLOWED_EMAILS`, `ADMIN_EMAILS`, `DATABASE_URL` (pooled), `BLOB_READ_WRITE_TOKEN`, `INTERNAL_API_URL`, `INTERNAL_API_SECRET`, `DATA_SOURCE`.
- **Vercel (api):** `INTERNAL_API_SECRET`, `BLOB_READ_WRITE_TOKEN`.
- **GitHub Actions:** `DATABASE_URL_UNPOOLED` (migrations e dbt), `BRAPI_TOKEN`, `BLOB_READ_WRITE_TOKEN`. Só no CI: `AUTH_E2E=1`.
- `CRON_SECRET` sai: não há endpoint de job.

### 4. Critérios de aceite
- Sem login, qualquer rota leva a `/login`; e-mail fora da allowlist é recusado; o teste de isolamento passa.
- O relatório de outubro importa as 5 abas; o patrimônio na data do relatório bate com o total do relatório; reimportar não duplica.
- Com `DATA_SOURCE=db` e o seed, os screenshots da fase 1 passam sem atualização.
- O workflow diário roda sozinho; uma falha de teste do dbt bloqueia a publicação e abre uma issue.
- Fundamentos com ≥ 8 trimestres de DRE, Balanço e DFC para os ativos da carteira.
- copy-check, axe e 360 px sem rolagem horizontal continuam verdes.

Ao fim de cada PR: o link, o que entrou, os testes, screenshots quando houver tela, os desvios e as dúvidas.
