import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Unidade (R$, %) em meio corpo, como no Painel 2. */
export function Unit({ children }: { children: ReactNode }) {
  return <span className="mx-[0.12em] text-[0.5em] font-medium tracking-normal">{children}</span>;
}

export type Stat = {
  label: string;
  /** Rótulo curto no mobile (ex.: "Rentab. 12M"). */
  shortLabel?: string;
  value: ReactNode;
  note?: ReactNode;
  /** Nota curta no mobile. */
  shortNote?: ReactNode;
  /** `display` é o número principal da tela (52 px); `kpi`, os demais (28 px). */
  size?: 'display' | 'kpi';
  grow?: number;
};

export function StatValue({ value, size = 'kpi' }: { value: ReactNode; size?: Stat['size'] }) {
  return <p className={cn('tnum text-kpi', size === 'display' && 'sm:text-display')}>{value}</p>;
}

function Responsive({ short, full }: { short?: ReactNode; full: ReactNode }) {
  if (short === undefined) return <>{full}</>;
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </>
  );
}

/**
 * Números do topo, sem cards: separados por um fio vertical.
 * No mobile viram uma grade 2 × 2 com rótulos curtos.
 */
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
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-5 sm:flex sm:flex-wrap sm:items-stretch sm:gap-x-8 sm:gap-y-6',
        className,
      )}
    >
      {stats.map((s, i) => (
        <Fragment key={s.label}>
          {i > 0 && (
            <span aria-hidden="true" className="hidden w-px self-stretch bg-border sm:block" />
          )}
          <div
            className="flex min-w-0 flex-col gap-1.5 sm:flex-(--stat-flex)"
            style={
              {
                '--stat-flex': `${s.grow ?? (s.size === 'display' ? 2 : 1)} 1 ${s.size === 'display' ? 300 : 160}px`,
              } as CSSProperties
            }
          >
            <span className="text-caption text-secondary-foreground">
              <Responsive short={s.shortLabel} full={s.label} />
            </span>
            <StatValue value={s.value} size={s.size} />
            {s.note && (
              <div className="text-small text-secondary-foreground">
                <Responsive short={s.shortNote} full={s.note} />
              </div>
            )}
          </div>
        </Fragment>
      ))}
    </section>
  );
}
