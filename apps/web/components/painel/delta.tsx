import { formatBRL, formatPercent, formatPP } from '@/lib/format';
import { cn } from '@/lib/utils';

export type DeltaFormat = 'percent' | 'brl' | 'pp';

type DeltaProps = {
  value: number;
  format?: DeltaFormat;
  decimals?: number;
  /** Texto extra para leitores de tela, ex.: "no dia". */
  context?: string;
  className?: string;
  /** Sem cor: só sinal e seta (para frases). */
  neutral?: boolean;
};

function formatValue(value: number, format: DeltaFormat, decimals?: number) {
  if (format === 'brl') return formatBRL(value, { sign: true, decimals: decimals ?? 2 });
  if (format === 'pp') return formatPP(value, { decimals: decimals ?? 1 });
  return formatPercent(value, { decimals: decimals ?? 2 });
}

function Triangle({ up }: { up: boolean }) {
  return (
    <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8" className="flex-none">
      <path d={up ? 'M4 1L7.5 6.5H0.5Z' : 'M4 7L0.5 1.5H7.5Z'} fill="currentColor" />
    </svg>
  );
}

/**
 * Variação com sinal, seta e cor — nunca só pela cor.
 * Positivo: verde e ▲; negativo: coral e ▼; zero: cinza, sem seta.
 */
export function Delta({
  value,
  format = 'percent',
  decimals,
  context,
  className,
  neutral,
}: DeltaProps) {
  const text = formatValue(value, format, decimals);
  const isZero = !/[1-9]/.test(text);
  const up = value > 0 && !isZero;
  const direction = isZero ? 'estável' : up ? 'alta de' : 'queda de';
  const label = isZero ? `${text}, estável` : `${direction} ${text.replace(/^[+−]/, '')}`;
  return (
    <span
      className={cn(
        'tnum inline-flex items-center gap-1 font-semibold whitespace-nowrap',
        neutral || isZero ? 'text-muted-foreground' : up ? 'text-positive' : 'text-negative',
        neutral && 'text-inherit',
        className,
      )}
      aria-label={context ? `${label} ${context}` : label}
      role="img"
    >
      {!isZero && <Triangle up={up} />}
      <span aria-hidden="true">{text}</span>
    </span>
  );
}
