import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { DesignShowcase } from '@/components/design/showcase';
import { Disclaimer } from '@/components/painel/disclaimer';
import { Toaster } from '@/components/painel/toaster';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { isDesignRouteEnabled } from '@/lib/env';
import {
  baseColors,
  chartCategorical,
  chartDiverging,
  chartSequential,
  elevations,
  radii,
  scoreColors,
  spacing,
  typeScale,
  type ColorToken,
} from '@/lib/tokens';

export const metadata: Metadata = { title: 'Design system', robots: { index: false } };

function Swatch({ token }: { token: ColorToken }) {
  return (
    <li className="flex items-center gap-3 border-b border-border-subtle py-2">
      <span
        aria-hidden="true"
        className="size-8 flex-none rounded-md shadow-[inset_0_0_0_1px_var(--border)]"
        style={{ background: `var(${token.name})` }}
      />
      <code className="min-w-44 font-mono text-caption text-foreground">{token.name}</code>
      <span className="tnum text-caption text-muted-foreground">
        {token.light} · {token.dark}
      </span>
    </li>
  );
}

function Ramp({ title, tokens }: { title: string; tokens: ColorToken[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-h3">{title}</h3>
      <div className="flex flex-wrap gap-1" role="list" aria-label={title}>
        {tokens.map((t) => (
          <div key={t.name} role="listitem" className="flex w-[84px] flex-col gap-1">
            <span
              aria-hidden="true"
              className="h-10 rounded-sm shadow-[inset_0_0_0_1px_var(--border)]"
              style={{ background: `var(${t.name})` }}
            />
            <code className="font-mono text-[11px] text-muted-foreground">
              {t.name.replace('--', '')}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={`sec-${title}`}
      className="flex flex-col gap-5 border-t border-border pt-5"
    >
      <h2 id={`sec-${title}`} className="text-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function DesignPage() {
  await connection();
  if (!isDesignRouteEnabled()) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 py-10 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="text-caption text-secondary-foreground">Painel 2 · design system</p>
          <h1 className="font-serif text-h1">Tokens, tipografia e componentes</h1>
          <p className="text-small text-secondary-foreground">
            Cada número aparece uma vez, contornos só onde há interação, gráficos soltos sobre o
            fundo e cor apenas quando significa algo.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Block title="Cores">
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {baseColors.map((t) => (
            <Swatch key={t.name} token={t} />
          ))}
        </ul>
      </Block>

      <Block title="Gráficos">
        <Ramp title="Categórica · alocação" tokens={chartCategorical} />
        <Ramp title="Sequencial · heatmap" tokens={chartSequential} />
        <Ramp title="Divergente · variação" tokens={chartDiverging} />
        <Ramp title="Classificação · Fraco → Forte" tokens={scoreColors} />
      </Block>

      <Block title="Tipografia">
        <dl className="flex flex-col">
          {typeScale.map((t) => (
            <div
              key={t.token}
              className="grid gap-2 border-b border-border-subtle py-4 sm:grid-cols-[160px_1fr_200px] sm:items-baseline"
            >
              <dt className="font-mono text-caption text-muted-foreground">{t.token}</dt>
              <dd className={t.className}>{t.sample}</dd>
              <dd className="text-caption text-muted-foreground">{t.spec}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block title="Base">
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Espaçamento · base 4 px</h3>
          <div className="flex flex-wrap items-end gap-3">
            {spacing.map((s) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <span
                  aria-hidden="true"
                  className="block w-3 rounded-sm bg-accent"
                  style={{ height: s }}
                />
                <span className="tnum text-caption text-muted-foreground">{s}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Raios</h3>
          <div className="flex flex-wrap gap-4">
            {radii.map((r) => (
              <div key={r.token} className="flex flex-col items-center gap-2">
                <span
                  aria-hidden="true"
                  className="block size-14 bg-surface-raised shadow-[inset_0_0_0_1px_var(--border)]"
                  style={{ borderRadius: `var(${r.token})` }}
                />
                <code className="font-mono text-caption text-muted-foreground">{r.token}</code>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Elevação 0–3</h3>
          <div className="flex flex-wrap gap-6">
            {elevations.map((e) => (
              <div key={e} className="flex flex-col items-center gap-2">
                <span
                  aria-hidden="true"
                  className="block size-20 rounded-lg bg-surface-raised"
                  style={{ boxShadow: `var(${e})` }}
                />
                <code className="font-mono text-caption text-muted-foreground">{e}</code>
              </div>
            ))}
          </div>
        </div>
        <p className="text-small text-secondary-foreground">
          Movimento: <code className="font-mono">--duration: 180ms</code> ·{' '}
          <code className="font-mono">--ease: cubic-bezier(0.32, 0.72, 0, 1)</code>. Sem animação de
          números; respeita prefers-reduced-motion.
        </p>
      </Block>

      <Block title="Componentes">
        <DesignShowcase />
      </Block>

      <Disclaimer />
      <Toaster />
    </main>
  );
}
