import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Unidade (R$, %) em meio corpo, como no Painel 2. */
export function Unit({ children }: { children: ReactNode }) {
  return <span className="mx-[0.12em] text-[0.5em] font-medium tracking-normal">{children}</span>;
}

export type Stat = {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  /** `display` é o número principal da tela (52 px); `kpi`, os demais (28 px). */
  size?: 'display' | 'kpi';
  grow?: number;
};

export function StatValue({ value, size = 'kpi' }: { value: ReactNode; size?: Stat['size'] }) {
  return (
    <p
      className={cn(
        'tnum',
        size === 'display'
          ? 'text-[40px] leading-none font-semibold tracking-[-0.03em] sm:text-display'
          : 'text-kpi',
      )}
    >
      {value}
    </p>
  );
}

/** Números do topo, sem cards: separados por um fio vertical. */
export function StatRow({
  stats,
  label,
  className,
}: {
  stats: Stat[];
  label: string;
  className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn('flex flex-wrap items-stretch gap-x-8 gap-y-6', className)}
    >
      {stats.map((s, i) => (
        <Fragment key={s.label}>
          {i > 0 && (
            <span aria-hidden="true" className="hidden w-px self-stretch bg-border sm:block" />
          )}
          <div
            className="flex min-w-0 flex-col gap-1.5"
            style={{
              flex: `${s.grow ?? (s.size === 'display' ? 2 : 1)} 1 ${s.size === 'display' ? 300 : 160}px`,
            }}
          >
            <span className="text-caption text-secondary-foreground">{s.label}</span>
            <StatValue value={s.value} size={s.size} />
            {s.note && <div className="text-small text-secondary-foreground">{s.note}</div>}
          </div>
        </Fragment>
      ))}
    </section>
  );
}
