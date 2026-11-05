# fin-analyst

Plataforma web em pt-BR para acompanhar a carteira (ações, FIIs, renda fixa) a partir do relatório
mensal da B3 e estudar empresas listadas: cotação, indicadores, fundamentos, classificação de 0 a
100, pares, projeções e um assistente de IA. **Descreve, não recomenda.**

Fase 1: interface completa (design Painel 2) com dados de exemplo fictícios.

## Desenvolvimento

Requisitos: Node 22, pnpm 10, Python 3.12 (e `uv`, opcional).

```bash
pnpm install
pnpm dev
```

Comandos e convenções em [`CLAUDE.md`](./CLAUDE.md).

## Estrutura

| Caminho | O quê |
| --- | --- |
| `apps/web` | Next.js (App Router), Tailwind v4, shadcn/ui, Recharts |
| `services/api` | FastAPI: `/health` e `/portfolio` (fase 1), parser B3 (fase 2), servidor MCP (fase 3) |
| `packages/fixtures` | Fixture da carteira servido pela API (exportado de `apps/web/lib/mock`) |
| `packages/contracts` | JSON Schema do contrato `PortfolioSummary`, gerado dos modelos da API |
| `scripts/check-copy.mjs` | Bloqueia linguagem de recomendação nos textos |
| `docs/b3-relatorio-consolidado.md` | Layout do relatório consolidado mensal da B3 |
| `tests/fixtures/` | Relatório B3 sintético (o arquivo real nunca entra no repo) |

Contratos e plano da fase 2: [`docs/phase-2.md`](./docs/phase-2.md).

Próximos passos (fase 2): `services/ingest` (brapi, BCB, CVM), `services/transform` (dbt) e
`packages/db` (schema e migrations), além de Auth.js e Postgres.

## CI

`.github/workflows/ci.yml` roda em PRs e em push na `main`: `web-check` (lint, typecheck, Vitest,
build), `web-e2e` (Playwright na imagem oficial), `copy-check` e `api` (ruff, pytest). Os jobs de
web e API são pulados quando o PR não toca nos respectivos caminhos (job `changes`); job pulado
conta como sucesso para a proteção de branch.

### Ativar a proteção da `main`

1. GitHub → **Settings → Branches → Add branch ruleset** (ou *Add rule*) para `main`.
2. Marque **Require a pull request before merging** e **Require status checks to pass**.
3. Adicione os checks: `changes`, `web-check`, `web-e2e`, `copy-check`, `api`.
4. Em **Settings → General → Pull Requests**, deixe só **Allow squash merging**.

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. **Root Directory:** `apps/web` (framework Next.js, detectado automaticamente; pnpm pelo lockfile).
3. Produção a partir da `main`; previews por PR. A rota `/design` responde 404 em produção.
