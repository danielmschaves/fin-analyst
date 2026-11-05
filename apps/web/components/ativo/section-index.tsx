'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type IndexItem = { id: string; label: string; href?: string };

/** "Nesta página": índice lateral com a seção visível destacada. */
export function SectionIndex({ items }: { items: IndexItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -60% 0px' },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);
  return (
    <nav
      aria-label="Seções do ativo"
      className="sticky top-6 hidden w-[140px] flex-none self-start lg:block"
    >
      <p className="mb-2 text-caption text-muted-foreground">Nesta página</p>
      {items.map((i) => {
        const on = i.id === active;
        return (
          <a
            key={i.id}
            href={i.href ?? `#${i.id}`}
            aria-current={on ? 'location' : undefined}
            className={cn(
              'block min-h-8 pl-3 text-small leading-8 no-underline',
              on
                ? 'font-semibold text-foreground shadow-[inset_2px_0_0_var(--foreground)]'
                : 'text-secondary-foreground shadow-[inset_1px_0_0_var(--border)] hover:text-foreground',
            )}
          >
            {i.label}
          </a>
        );
      })}
    </nav>
  );
}
