import { Section } from '@/components/painel/section';
import type { PortfolioPosition } from '@/lib/contracts';
import { formatPercent } from '@/lib/format';
import { allocationByAsset, allocationByClass, topVariableIncome } from '@/lib/portfolio';

const pct = (v: number) => formatPercent(v, { sign: false, decimals: 1 });
const CLASS_COLORS = ['var(--foreground)', 'var(--text-secondary)', 'var(--muted-foreground)'];

export function Allocation({ positions }: { positions: PortfolioPosition[] }) {
  const classes = allocationByClass(positions);
  const assets = allocationByAsset(positions);
  const top = topVariableIncome(positions);
  const max = assets[0]?.pct ?? 1;
  return (
    <Section
      title="Alocação"
      lead={`Só ${top.tickers.join(' e ')} somam ${Math.round(top.pct)}% da carteira.`}
    >
      <div
        role="img"
        aria-label={`Por classe: ${classes.map((c) => `${c.label} ${pct(c.pct)}`).join(', ')}`}
        className="flex h-2.5 overflow-hidden rounded-sm"
      >
        {classes.map((c, i) => (
          <span
            key={c.label}
            className="block h-full border-r-2 border-background"
            style={{ width: `${c.pct}%`, background: CLASS_COLORS[i] }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="mb-5 flex">
        {classes.map((c) => (
          <div
            key={c.label}
            className="flex min-w-0 flex-col gap-0.5 pt-2"
            style={{ width: `${c.pct}%` }}
          >
            <span className="truncate text-caption text-secondary-foreground">{c.label}</span>
            <span className="tnum text-body font-semibold">{pct(c.pct)}</span>
          </div>
        ))}
      </div>
      <ol aria-label="Por ativo" className="flex flex-col">
        {assets.map((a) => (
          <li
            key={a.ticker}
            className="grid min-h-[30px] grid-cols-[72px_minmax(0,1fr)_52px] items-center gap-3"
          >
            <span className="tnum text-small font-semibold">{a.ticker}</span>
            <span aria-hidden="true" className="h-1 rounded-[2px] bg-surface-raised">
              <span
                className="block h-full rounded-[2px]"
                style={{
                  width: `${(a.pct / max) * 100}%`,
                  background: top.tickers.includes(a.ticker)
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                }}
              />
            </span>
            <span className="tnum text-right text-small">{pct(a.pct)}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}
