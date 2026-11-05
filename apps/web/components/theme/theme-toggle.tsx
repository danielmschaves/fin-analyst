'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Alterna entre tema escuro e claro. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-pressed={isDark}
      className={cn(
        'inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-small font-semibold',
        'bg-surface-raised text-foreground transition-colors hover:bg-border',
        className,
      )}
    >
      Tema escuro
    </button>
  );
}
