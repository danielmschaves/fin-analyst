'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-small" id={id}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className={cn(
          'flex h-6 w-10 flex-none cursor-pointer rounded-full p-0.5 transition-colors',
          checked
            ? 'justify-end bg-accent shadow-[inset_0_0_0_1px_var(--accent)]'
            : 'justify-start bg-surface-raised shadow-[inset_0_0_0_1px_var(--border)]',
        )}
      >
        <span
          className={cn(
            'size-5 rounded-full',
            checked ? 'bg-accent-foreground' : 'bg-muted-foreground',
          )}
        />
      </button>
    </div>
  );
}
