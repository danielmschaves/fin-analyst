import { Delta } from '@/components/painel/delta';
import { Section } from '@/components/painel/section';
import type { PortfolioPosition } from '@/lib/contracts';

export function MonthChanges({
  positions,
  monthName,
}: {
  positions: PortfolioPosition[];
  monthName: string;
}) {
  const sorted = [...positions].sort((a, b) => b.monthChangePct - a.monthChangePct);
  const max = Math.max(...positions.map((p) => Math.abs(p.monthChangePct)), 0.01);
  return (
    <Section title="O que mudou no mês" subtitle={`Variação de cada posição em ${monthName}`}>
      <ol aria-label="Variação por posição" className="flex flex-col">
        {sorted.map((p) => (
          <li
            key={p.ticker}
            className="grid min-h-[30px] grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-3"
          >
            <span className="tnum text-small font-semibold">{p.ticker}</span>
            <span aria-hidden="true" className="h-1 rounded-[2px] bg-surface-raised">
              <span
                className="block h-full rounded-[2px]"
                style={{
                  width: `${(Math.abs(p.monthChangePct) / max) * 100}%`,
                  background: p.monthChangePct >= 0 ? 'var(--positive)' : 'var(--negative)',
                }}
              />
            </span>
            <span className="text-right text-small">
              <Delta value={p.monthChangePct} decimals={1} context={`em ${monthName}`} />
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
}
