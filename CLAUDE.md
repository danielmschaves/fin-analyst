# CLAUDE.md — fin-analyst

Plataforma web em pt-BR para o investidor pessoa física acompanhar a carteira (ações, FIIs, renda
fixa) a partir do relatório mensal da B3 e estudar empresas. Tom calmo e explicativo:
**descreve, não recomenda.**

Fonte da verdade visual: canvas "fin-analyst — 5 direções visuais", página **7. Painel 2 · telas
completas**. Em conflito: prompt da fase → canvas Painel 2 → spec técnica.

## Estrutura

```
apps/web          Next.js (App Router) · TypeScript estrito · Tailwind v4 · shadcn/ui
services/api      FastAPI (Python 3.12) · /health; parser B3 na fase 2; MCP na fase 3
scripts/          check-copy.mjs (bloqueia linguagem de recomendação)
docs/             layout do relatório B3, contratos da fase 2
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
```

Screenshots do Playwright são gerados na imagem `mcr.microsoft.com/playwright:v1.63.0-noble`
(a mesma do CI). Para atualizar localmente:

```bash
docker run --rm --ipc=host -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.63.0-noble \
  bash -lc 'corepack enable && pnpm install --frozen-lockfile && pnpm build && pnpm --filter web e2e:update'
```

## Convenções

- Branches `feat/<escopo>` ou `chore/<escopo>`; Conventional Commits; título do PR no mesmo padrão;
  squash merge. Cada PR leva os testes da própria feature.
- Dados: tudo vem de `apps/web/lib/mock/` via `PortfolioRepository`, `AssetRepository`,
  `AssistantProvider` e `ImportParser`. Tipos em `apps/web/lib/contracts.ts` (são os contratos dos
  marts do dbt na fase 2). Implementação escolhida por `DATA_SOURCE` (só `mock` na fase 1).
  Nenhuma chamada externa na fase 1.
- Fontes Geist e Faustina self-hosted em `apps/web/app/fonts` (`next/font/local`, licença OFL): o
  build não depende do Google Fonts.
- Rota de showcase: `/design` (nunca `/_design`). 404 quando `VERCEL_ENV === 'production'`.

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

1. **Fixture:** dados em `lib/mock/<tela>.ts`, tipados por `lib/contracts.ts`.
2. **Lib:** cálculos puros em `lib/<tela>.ts`, com testes unitários em `tests/unit/`.
3. **Componente:** em `components/<tela>/`, reaproveitando `components/painel/*` e `components/ui/*`.
4. **Rota:** `app/(app)/<rota>/page.tsx`, lendo pelo repositório (`lib/repositories.ts`).
5. **Testes:** componente (comportamento e ARIA) + e2e em `e2e/<tela>.spec.ts` (textos e números,
   axe light/dark, sem rolagem horizontal em 360 px, `toHaveScreenshot` 1440/360 light/dark).
6. Rodar `node scripts/check-copy.mjs`.
