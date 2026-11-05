'use client';

import { cn } from '@/lib/utils';

/** Seletor de período em texto (6M · 12M · Desde o início), sublinhado no ativo. */
export function PeriodTabs<T extends string>({
  options,
  value,
  onChange,
  label = 'Período',
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-4">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-8 cursor-pointer px-0.5 text-small transition-colors',
              active
                ? 'font-semibold text-foreground shadow-[inset_0_-2px_0_var(--foreground)]'
                : 'font-medium text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
