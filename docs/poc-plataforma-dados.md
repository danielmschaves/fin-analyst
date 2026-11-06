# PoC da plataforma de dados

**Status:** planejada · **Decisão:** pendente (preencher a seção 7 ao fim da PoC)

## Por que uma PoC

Premissa da fase 2: o backend precisa ser flexível e escalável, com uma estratégia consistente de
extração, armazenamento e disponibilização para o volume de dados × ativos, uso de API, backoff e
resiliência. Não basta "ligar o mock a dados reais". Antes de implementar a solução completa
(F2-1 … F2-7 em [`prompts/fase-2-dados-reais.md`](../prompts/fase-2-dados-reais.md)), a PoC prova a
arquitetura com escopo limitado, mas passando por todas as camadas.

**Decisões fechadas:**

| Tema | Decisão | Motivo |
| --- | --- | --- |
| Universo | B3 inteira (~1.000 tickers: ações, FIIs, ETFs, BDRs) + companhias da CVM | Pares e percentil por setor estatisticamente válidos |
| Preços diários | COTAHIST da B3 em lote (arquivo diário; arquivos anuais no backfill) | 1 download/dia cobre o mercado; sem limite de requisições |
| Lake | Cloudflare R2 (S3-compatível) | polars, DuckDB e pyarrow leem direto; sem custo de egress |
| Uploads de usuário | Vercel Blob (privado) | Já no stack; separado do lake |
| Orquestração | GitHub Actions, com cada job sendo um comando de CLI | Troca futura por Dagster/Prefect sem reescrever conectores |
| Princípio | Volume no lake; Postgres só serve (core recortado + marts) | Banco pequeno e rápido; reprocessamento a partir do lake |

**Camadas:**

```
fonte ─▶ bronze  (R2: como chegou + manifest sha256; imutável, replay)
      ─▶ silver  (R2: Parquet zstd tipado e validado, particionado)
      ─▶ Postgres core (carga idempotente por partição; dbt incremental)
      ─▶ marts_next ─(testes ok)─▶ swap ─▶ marts  (lidos pelo web)
```

## 1. Hipóteses que a PoC precisa provar
| # | Hipótese | Por que importa |
|---|---|---|
| H1 | O fluxo fonte → bronze (R2) → silver (Parquet) → Postgres core → marts → tela funciona ponta a ponta com dados reais | Valida as camadas e os contratos |
| H2 | O volume do **mercado inteiro** cabe no desenho: o lake guarda tudo e o Postgres fica pequeno e rápido | Valida "volume no lake, Postgres só serve" |
| H3 | A extração resiste a falhas de API (429, 5xx, timeout, queda) sem perder nem duplicar dados | Valida backoff, circuit breaker, checkpoints e idempotência |
| H4 | A publicação é atômica e segura: teste do dbt falhou → a tela continua com a versão anterior | Valida o gate de qualidade e o swap |
| H5 | A disponibilização é rápida e barata por request, sem agregação na hora | Valida marts, índices, resolução por janela e cache |
| H6 | O uso de API fica dentro do orçamento e tudo é observável (ledger, freshness) | Valida a operação sem supervisão |
| H7 | O custo e o tempo de execução cabem no stack (GH Actions, R2, Neon) e escalam linearmente | Base da decisão de seguir |

## 2. Escopo da PoC
**Dentro:**
- **Preços EOD do mercado inteiro (COTAHIST):** backfill de **2 anos** (arquivos anuais) + execução diária (D-1). Filtro: lote padrão, FII, ETF e BDR.
- **Fundamentos CVM (DFP/ITR):** download do arquivo inteiro (prova de volume), mas a carga em core só para **~20 companhias**: a carteira de exemplo mais os pares de VALE3. Só a DRE.
- **Macro:** BCB SGS só do **CDI (4391)**, incremental.
- **API com limite:** proventos da brapi para **~10 tickers**, com token bucket e orçamento. Se não houver `BRAPI_TOKEN`, o mesmo teste roda contra o BCB SGS.
- **Web:** `AssetRepository` em Postgres (`DATA_SOURCE=db`) para `/ativo/[ticker]` (cotação, retornos, gráfico) e `/ativo/[ticker]/fundamentos` (só DRE), mais o ⌘K buscando no universo inteiro. A carteira continua mock.

**Fora (fica para a solução completa):** auth, importação, tabelas `app.*`, classificação, pares e
setor, Balanço/DFC, KPIs de valuation, classificação setorial B3, universo inteiro de fundamentos,
Dagster, réplica de leitura.

## 3. Arquitetura mínima que precisa estar de pé
| Componente | Mínimo para a PoC | Prova |
|---|---|---|
| **R2** | 1 bucket com os prefixos `bronze/` e `silver/` (MinIO no CI e no Compose) | H1, H2 |
| **Neon Postgres** | 1 banco com os schemas `ingest`, `core`, `marts`, `marts_next`; papéis `ingest`, `transform`, `web` (só leitura em `marts`); `core.prices_daily` particionada por ano | H1, H2, H5 |
| **`services/ingest`** | CLI `ingest run <source> <dataset> [--date/--year/--since]`; `sources.yaml`; **cliente HTTP comum** (timeouts, retry com backoff e jitter, `Retry-After`, token bucket, semáforo, circuit breaker, ETag/If-Modified-Since); writer de bronze (com manifest sha256) e de silver (Parquet zstd particionado); validação de schema com quarentena; loader idempotente (delete+COPY por partição em transação); tabelas `ingest.runs`, `ingest.watermarks`, `ingest.dlq` e `ingest.http_cache` | H1, H3, H6 |
| **Conectores** | `cotahist` (diário e anual), `cvm_dfp_itr` (anual, condicional, filtro por CNPJ na carga), `bcb_sgs` (CDI), `brapi_dividends` (10 tickers) | H1–H3, H6 |
| **`services/transform` (dbt-postgres)** | Staging + core incremental (preços, DRE); 4 marts: `mart_asset_index`, `mart_price_history` (diário até 1A, semanal em 2A), `mart_asset_returns`, `mart_fundamentals_quarterly` (DRE); testes `unique`/`not_null`/`relationships`/freshness/volume por partição | H1, H4, H5 |
| **Publicação** | Script `publish`: `dbt build` em `marts_next`; se passar, swap `marts` ↔ `marts_next` numa transação (`marts_prev` guardado); depois, `POST /api/revalidate` | H4, H5 |
| **Web** | Repositório Postgres atrás de `DATA_SOURCE=db` (só os métodos de ativo + `getDataDate`); busca do ⌘K por server action com `pg_trgm`; `unstable_cache` com tag `market-data`; rota `/api/revalidate` com `REVALIDATE_SECRET` | H1, H5 |
| **Orquestração** | 2 workflows: `poc-daily` (cron; ingest → publish) e `poc-backfill` (manual, matriz por ano, retomável); `concurrency`, `timeout-minutes`, resumo do ledger no job summary; falha abre issue | H3, H6, H7 |
| **Local/CI** | `infra/docker-compose.yml` (postgres:16, MinIO, ingest, transform); **suíte de falhas** contra um servidor falso (respx/pytest) | H3 |
| **Deploy** | Preview da Vercel com Deployment Protection e as variáveis da PoC; sem auth no app | H1, H5 |

## 4. Critérios de aceite (metas)
**Funcional (H1)**
- F1. `/ativo/VALE3` e 3 tickers sorteados do universo (ação, FII, ETF) renderizam em `DATA_SOURCE=db` com cotação de D-1, retornos (5D…2A) e gráfico, sem erro.
- F2. `/ativo/VALE3/fundamentos` mostra ≥ 8 trimestres de DRE vindos da CVM; os valores de 3 linhas conferidos manualmente contra o DFP/ITR original.
- F3. O ⌘K encontra qualquer ticker do universo; "Dados de" mostra o último pregão.
- F4. Os testes de componente e e2e existentes continuam verdes em `mock`.

**Volume (H2)**
- V1. O backfill de 2 anos do mercado inteiro (~600 mil linhas) termina em **< 15 min** num runner padrão do GitHub.
- V2. A execução diária completa (ingest + dbt + publish) leva **< 10 min**.
- V3. Postgres com o recorte da PoC **< 500 MB**; tamanho do lake medido.
- V4. Relatório com a projeção linear para 20 anos de preços e o universo inteiro de fundamentos (tempo, armazenamento, custo).

**Resiliência (H3)** — provada com testes automatizados de injeção de falha e com 1 execução real interrompida.
- R1. Um 429 com `Retry-After: N` é respeitado (espera ≥ N) e a chamada termina com sucesso.
- R2. Um 5xx intermitente (falha 2×, depois 200) se recupera, com backoff exponencial e jitter registrado.
- R3. Um timeout é retentado até o limite; esgotado o limite, a entidade vai para a DLQ e é reprocessada na execução seguinte.
- R4. Uma fonte fora do ar abre o **circuit breaker**: a fonte é marcada `degraded` e as outras seguem e publicam.
- R5. Um backfill interrompido (cancelado no meio) é retomado do watermark **sem duplicar**: contagem e checksum por partição iguais aos de uma execução limpa.
- R6. Reexecutar o mesmo dia é **idempotente**: zero linhas novas e bronze deduplicado por sha256.
- R7. Um arquivo sem mudança volta 304 (ETag) e **não é baixado de novo**.
- R8. Uma linha inválida vai para a quarentena com o motivo, e o resto da partição é carregado.

**Publicação (H4)**
- P1. Um teste do dbt que falha de propósito deixa `marts` intacto, o web continua servindo a versão anterior e uma issue é aberta.
- P2. Durante o swap, leituras concorrentes (loop de queries) nunca veem estado parcial nem erro.
- P3. Rollback para `marts_prev` com um comando.

**Disponibilização (H5)**
- D1. p95 das queries de mart por ticker **< 50 ms** no Neon (medido com 1.000 consultas).
- D2. O payload do histórico de preços tem ≤ 260 pontos em qualquer janela.
- D3. p95 de carregamento de `/ativo/[ticker]` **< 1,5 s** (critério da spec) no preview.
- D4. Depois do publish, a nova data aparece na tela sem deploy (revalidate).
- D5. O ⌘K responde em **< 200 ms** com o universo inteiro.

**Uso de API e observabilidade (H6)**
- O1. Chamadas à brapi ≤ orçamento do `sources.yaml`; cada chamada contada no ledger.
- O2. `ingest.runs` registra cada execução (status, linhas, bytes, duração, erros); o job summary mostra o resumo.
- O3. Com a fonte parada por mais que o SLA, a freshness do dbt alerta.

**Custo (H7)**
- C1. Custo mensal estimado da PoC e projetado para a solução completa (R2, Neon, minutos do Actions) dentro de um teto a combinar no relatório.

## 5. Como medir e decidir
- Medições automatizadas num script `poc/measure.py` (tempos do ledger, tamanhos de schema e de bucket, latências de query) e no Playwright/Lighthouse para D3.
- **Relatório `docs/poc-plataforma-dados.md`:** tabela critério × meta × resultado × evidência (link de run, log ou query); riscos encontrados; ajustes recomendados.
- **Decisão:**
  - **go**: todos os critérios de H1, H3 e H4 atendidos, e H2, H5, H6 e H7 dentro de 20% das metas;
  - **ajustar**: há desvios com correção conhecida;
  - **no-go**: H3 ou H4 não atendidos.

## 6. Sequência
| Etapa | Conteúdo |
|---|---|
| PoC-1 · `feat(poc): plataforma de ingestão` | Compose, schemas e papéis, `services/ingest` (CLI, HTTP resiliente, lake, loader, ledger, watermarks, DLQ, quarentena), conectores, suíte de falhas, workflow de backfill |
| PoC-2 · `feat(poc): transform, publish e web db` | dbt mínimo + testes, publish com swap + rollback, repositório Postgres de ativo, busca `pg_trgm`, cache e revalidate, workflow diário, `poc/measure.py` |
| PoC-3 · `docs(poc): resultados` | Execuções reais (backfill de 2 anos, 3 dias de execução diária, falhas provocadas), relatório e decisão |
| Depois | Revisar `prompts/fase-2-dados-reais.md` com o aprendizado e seguir para F2-1 … F2-7 |

O código da PoC é escrito para virar a base do F2-4/F2-5/F2-6 (mesmos módulos), não para ser
descartado.

**O que preciso do usuário antes da PoC-2 rodar de verdade:**
- bucket R2 com chave de acesso;
- banco Neon (URL direta e URL pooled);
- (opcional) `BRAPI_TOKEN`;
- variáveis no preview da Vercel e nos GitHub Secrets (`R2_*`, `DATABASE_URL*`, `REVALIDATE_SECRET`).

A PoC-1 roda e testa inteira localmente com MinIO e postgres:16, sem credenciais.

## 7. Relatório de resultados (preencher na PoC-3)

| ID | Critério | Meta | Resultado | Evidência (run, log, query) | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Páginas de ativo em `db` | VALE3 + 3 sorteados sem erro | | | |
| F2 | DRE da CVM | ≥ 8 trimestres; 3 linhas conferidas | | | |
| F3 | ⌘K no universo e data do pregão | qualquer ticker | | | |
| F4 | Testes existentes em `mock` | verdes | | | |
| V1 | Backfill de 2 anos do mercado | < 15 min | | | |
| V2 | Execução diária completa | < 10 min | | | |
| V3 | Tamanho do Postgres (lake medido) | < 500 MB | | | |
| V4 | Projeção para 20 anos / universo inteiro | relatório | | | |
| R1 | 429 + `Retry-After` | espera ≥ N e sucesso | | | |
| R2 | 5xx intermitente | recupera com backoff e jitter | | | |
| R3 | Timeout → DLQ → reprocesso | entidade recuperada | | | |
| R4 | Circuit breaker | fonte `degraded`, resto publica | | | |
| R5 | Backfill interrompido e retomado | contagem e checksum iguais | | | |
| R6 | Reexecução do mesmo dia | 0 linhas novas | | | |
| R7 | ETag 304 | sem novo download | | | |
| R8 | Quarentena de linha inválida | resto carregado | | | |
| P1 | Teste do dbt falhando | `marts` intacto + issue | | | |
| P2 | Leituras durante o swap | sem estado parcial | | | |
| P3 | Rollback | 1 comando | | | |
| D1 | p95 de query de mart | < 50 ms | | | |
| D2 | Pontos do histórico | ≤ 260 | | | |
| D3 | p95 de `/ativo/[ticker]` | < 1,5 s | | | |
| D4 | Revalidate após o publish | nova data sem deploy | | | |
| D5 | ⌘K | < 200 ms | | | |
| O1 | Orçamento da brapi | ≤ configurado | | | |
| O2 | Ledger e job summary | toda execução registrada | | | |
| O3 | Freshness | alerta acima do SLA | | | |
| C1 | Custo mensal (PoC e projetado) | ≤ teto combinado | | | |

**Riscos encontrados:**

**Ajustes recomendados para F2-1 … F2-7:**

**Decisão:** go / ajustar / no-go — justificativa:
