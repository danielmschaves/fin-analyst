# CLAUDE.md — fin-analyst

Plataforma web em pt-BR para o investidor pessoa física acompanhar a carteira (ações, FIIs, renda
fixa) a partir do relatório mensal da B3 e estudar empresas. Tom calmo e explicativo:
**descreve, não recomenda.**

Fonte da verdade visual: canvas "fin-analyst — 5 direções visuais", página **7. Painel 2 · telas
completas**. Em conflito: prompt da fase → este arquivo → canvas Painel 2 (visual) / spec técnica
(dados e arquitetura).

**Fase atual: 2 — dados reais, acesso e pipeline.** O plano está em
`prompts/fase-2-dados-reais.md` (PRs F2-0 … F2-6), as decisões tomadas em
`prompts/fase-2-inconsistencias.md` e os contratos em `docs/phase-2.md`. A fase 1 (todas as telas do
Painel 2 com dados mock) está concluída.

## Estrutura

```
apps/web          Next.js (App Router) · TypeScript estrito · Tailwind v4 · shadcn/ui
services/api      FastAPI (Python 3.12) · /health, /portfolio (sai no F2-3), POST /imports/parse (F2-3)
packages/         fixtures (JSON dos mocks; seed do banco) e contracts (JSON Schema gerado da API)
                  · db (Drizzle, schema app, migrations e seed — F2-2)
services/ingest   CLI de ingestão: COTAHIST, CVM, BCB, brapi → R2 (bronze/silver) → Postgres (PoC-1)
services/transform  dbt: staging → core → marts, publish com swap (PoC-2)
scripts/          check-copy.mjs (bloqueia linguagem de recomendação)
docs/             layout do relatório B3, contratos da fase 2
prompts/          prompts das fases (fase 2: fase-2-dados-reais.md e inconsistências)
tests/fixtures/   relatorio-consolidado-sintetico.xlsx (nunca commitar arquivo real)
```

## Comandos

```bash
pnpm install
pnpm dev                    # apps/web em http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm e2e                    # Playwright (precisa de build)
pnpm --filter web e2e:update  # só de propósito; explique no PR
node scripts/check-copy.mjs && pnpm test:scripts
cd services/api && uv venv && uv pip install -e '.[dev]' && .venv/bin/ruff check . && .venv/bin/pytest
cd services/ingest && uv venv && uv pip install -e '.[dev]' && .venv/bin/ruff check . && .venv/bin/pytest
#   testes de banco: TEST_DATABASE_URL=postgresql://postgres:pg@localhost:5432/postgres (postgres:16)
docker compose -f infra/docker-compose.yml up -d   # Postgres + MinIO (lake local) + ingest
```

Screenshots do Playwright são gerados na imagem `mcr.microsoft.com/playwright:v1.63.0-noble`
(a mesma do CI). Para atualizar localmente:

```bash
docker run --rm --ipc=host -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.63.0-noble \
  bash -lc 'corepack enable && pnpm install --frozen-lockfile && pnpm build && pnpm --filter web e2e:update'
```

## Contratos (web × API)

`apps/web/lib/contracts.ts` e `services/api/app/models.py` descrevem o mesmo `PortfolioSummary`.
Ao mudar um campo, altere os dois e regenere:

```bash
pnpm --filter web fixtures:export                 # packages/fixtures/portfolio.json
cd services/api && .venv/bin/python -m app.schema  # packages/contracts/portfolio-summary.schema.json
```

Os testes de contrato (Vitest e pytest) quebram se um lado ficar para trás. Detalhes em
`docs/phase-2.md`.

## Convenções

- Branches `feat/<escopo>`, `chore/<escopo>` ou `refactor/<escopo>`; Conventional Commits; título do
  PR no mesmo padrão. Um PR por vez, CI verde, merge pelo mantenedor no GitHub. Cada PR leva os
  testes da própria feature.
- PRs da fase 2 são chamados pelo código do plano (**F2-0 … F2-6**), não pelo número do GitHub.
- **Dados:** toda tela lê por `PortfolioRepository`, `AssetRepository`, `AssistantProvider` e
  `ImportParser` (`apps/web/lib/repositories.ts`), no servidor. **Nenhum arquivo de `app/` ou
  `components/` importa `lib/mock`** — só os repositórios mock fazem isso (há teste garantindo).
- **Usuário:** toda chamada de repositório recebe um `RequestContext { userId, role }` vindo da
  sessão, nunca do cliente. Dado de carteira é sempre filtrado por `userId`.
- **Tipos:** `apps/web/lib/contracts.ts` é o contrato dos marts do dbt e da API. `DATA_SOURCE=mock`
  (padrão, dev e CI) ou `db` (Postgres: schema `marts` + tabelas `app.*`; produção a partir do F2-5).
  O CI roda os testes nos dois modos; o seed do banco sai de `packages/fixtures/*.json`.
- **Plataforma de dados:** volume no lake (Cloudflare R2: bronze como chegou, silver em Parquet);
  o Postgres só serve (core recortado + marts). Extração resiliente e idempotente: rate limit,
  backoff com jitter, `Retry-After`, circuit breaker, requisições condicionais, ledger, watermarks e
  DLQ. Publicação de marts só com testes verdes (swap atômico). A PoC disso vem antes do F2-1:
  `docs/poc-plataforma-dados.md`.
- **Sem rede externa em testes:** conectores de ingestão são testados com respostas gravadas.
- **Segredos** só em Vercel Environment Variables e GitHub Secrets; `.env.example` sem valores.
  Lista de variáveis em `docs/phase-2.md`.
- Fontes Geist e Faustina self-hosted em `apps/web/app/fonts` (`next/font/local`, licença OFL): o
  build não depende do Google Fonts.
- Rota de showcase: `/design` (nunca `/_design`). Em produção responde 404, exceto para `admin`
  (a partir do F2-1).

## Regras de interface (Painel 2)

- **Formato pt-BR:** `R$ 1.234,56` · `8,83%` · `25,4 mi` · `256,4 bi` · `31/10/2026`. Negativo com o
  sinal de menos tipográfico (−, U+2212). Use sempre `lib/format.ts`.
- **Números:** `tabular-nums`, alinhados à direita nas tabelas.
- **Positivo/negativo:** sempre com sinal e seta, nunca só pela cor.
- **Classificação 0–100:** Fraco (0–39), Médio (40–59), Forte (60–100); nunca "Compra"/"Venda".
  Cor pelos 5 níveis de `--score-*`, em faixas de 20.
- **Acessibilidade:** WCAG AA; foco visível com `--ring`; alvos de 44 px no mobile; gráficos com
  `role="img"` e `aria-label` que resume os números.
- **Proibido:** logos de empresas, fotos e gradientes. No lugar do logo, monograma com as 4
  primeiras letras do ticker.
- **Textos:** nenhum verbo de recomendação. "Compra ou venda" só aparece no disclaimer.
- **Rodapé em todas as telas:** disclaimer + "Fonte: relatório mensal B3 · cotações de fechamento
  (D-1)".
- Princípios: cada número aparece uma vez; caixa só para interação (seções separadas por espaço e
  fio); cor só com significado (âmbar = carteira/ação principal, verde/coral = resultado, lilás =
  classificação); frase-resumo em Faustina abre cada tela; um "?" por visual.

## Como adicionar uma tela

1. **Fixture:** dados em `lib/mock/<tela>.ts`, tipados por `lib/contracts.ts`, exportados para
   `packages/fixtures` (`pnpm --filter web fixtures:export`).
2. **Lib:** cálculos puros em `lib/<tela>.ts`, com testes unitários em `tests/unit/`.
3. **Componente:** em `components/<tela>/`, reaproveitando `components/painel/*` e `components/ui/*`.
4. **Rota:** `app/(app)/<rota>/page.tsx`, lendo pelo repositório (`lib/repositories.ts`) com o
   `RequestContext` da sessão. Estados sem dado (primeiro mês, sem histórico, carteira vazia)
   seguem o Painel 2.
5. **Testes:** componente (comportamento e ARIA) + e2e em `e2e/<tela>.spec.ts` (textos e números,
   axe light/dark, sem rolagem horizontal em 360 px, `toHaveScreenshot` 1440/360 light/dark).
6. Rodar `node scripts/check-copy.mjs`.
