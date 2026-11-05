import { Section } from '@/components/painel/section';
import type { DividendReceived } from '@/lib/contracts';
import { formatBRL, formatDayMonth } from '@/lib/format';

export function Dividends({
  dividends,
  total,
  shareOfResult,
  monthName,
}: {
  dividends: DividendReceived[];
  total: number;
  /** null no primeiro mês ou com resultado não positivo. */
  shareOfResult: number | null;
  monthName: string;
}) {
  return (
    <Section
      title={`Proventos de ${monthName}`}
      actions={<span className="tnum text-body font-semibold">{formatBRL(total)}</span>}
      lead={
        shareOfResult === null
          ? undefined
          : `Equivalem a ${Math.round(shareOfResult)}% do resultado do mês.`
      }
    >
      <ol className="flex flex-col">
        {dividends.map((d) => (
          <li
            key={`${d.paymentDate}-${d.ticker}`}
            className="grid min-h-10 grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border-subtle text-small"
          >
            <span className="tnum text-muted-foreground">{formatDayMonth(d.paymentDate)}</span>
            <span>
              <b className="tnum font-semibold">{d.ticker}</b> · {d.eventType}
            </span>
            <span className="tnum font-semibold">{formatBRL(d.amount, { sign: true })}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}
