import { Delta } from '@/components/painel/delta';
import { EmptyState } from '@/components/painel/empty-state';
import { Section } from '@/components/painel/section';
import type { PortfolioPosition } from '@/lib/contracts';

export function MonthChanges({
  positions,
  monthName,
}: {
  positions: PortfolioPosition[];
  monthName: string;
}) {
  const withChange = positions.filter(
    (p): p is PortfolioPosition & { monthChangePct: number } => p.monthChangePct !== null,
  );
  const sorted = [...withChange].sort((a, b) => b.monthChangePct - a.monthChangePct);
  const max = Math.max(...withChange.map((p) => Math.abs(p.monthChangePct)), 0.01);
  if (sorted.length === 0) {
    return (
      <Section title="O que mudou no mês" subtitle={`Variação de cada posição em ${monthName}`}>
        <EmptyState
          title="Primeiro mês importado"
          description="A variação de cada posição aparece a partir do segundo relatório."
        />
      </Section>
    );
  }
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
