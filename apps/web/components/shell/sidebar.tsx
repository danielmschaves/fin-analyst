'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, isActive } from './nav-items';

export function Brand() {
  return (
    <Link
      href="/carteira"
      className="mb-3 flex min-h-11 items-center gap-2.5 rounded-md px-1.5 no-underline"
    >
      <span
        aria-hidden="true"
        className="inline-grid size-[26px] place-items-center rounded-[7px] bg-foreground text-caption font-bold text-background"
      >
        fa
      </span>
      <span className="text-[15px] leading-[1.35] font-semibold text-foreground">fin-analyst</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="sticky top-0 hidden h-dvh w-[220px] flex-none flex-col gap-0.5 border-r border-border px-3 py-4 md:flex"
    >
      <Brand />
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        if (item.disabled) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              className="flex min-h-10 cursor-not-allowed items-center gap-3 rounded-md px-3 text-[14px] font-medium text-muted-foreground"
            >
              <Icon />
              <span>{item.label}</span>
              <span className="ml-auto text-caption font-normal text-muted-foreground">
                em breve
              </span>
            </span>
          );
        }
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-10 items-center gap-3 rounded-md px-3 text-[14px] no-underline transition-colors',
              active
                ? 'bg-surface-raised font-semibold text-foreground'
                : 'font-medium text-secondary-foreground hover:bg-surface-raised hover:text-foreground',
            )}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.filter((i) => i.mobile).map((item) => {
        const Icon = item.icon;
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] no-underline',
              active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
            )}
          >
            <Icon />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
