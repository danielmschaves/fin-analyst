import { cn } from '@/lib/utils';

const sizes = {
  sm: 'size-8 rounded-md text-[9px]',
  md: 'size-10 rounded-md text-[11px]',
  lg: 'size-12 rounded-md text-[13px]',
} as const;

/** No lugar do logo: as 4 primeiras letras do ticker (sem espaços). */
export function monogramText(ticker: string) {
  return ticker
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase();
}

export function Monogram({
  ticker,
  size = 'sm',
  className,
}: {
  ticker: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid flex-none place-items-center border border-border bg-surface-raised font-semibold tracking-[0.02em] text-secondary-foreground',
        sizes[size],
        className,
      )}
    >
      {monogramText(ticker)}
    </span>
  );
}
