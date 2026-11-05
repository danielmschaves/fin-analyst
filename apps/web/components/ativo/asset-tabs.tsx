import Link from 'next/link';
import { cn } from '@/lib/utils';

export type AssetTab = 'cotacao' | 'resumo' | 'fundamentos' | 'pares';

/** Abas de navegação do ativo (links), como no topo da prancha P2-C. */
export function AssetTabs({ ticker, current }: { ticker: string; current: AssetTab }) {
  const base = `/ativo/${ticker}`;
  const items: { id: AssetTab; label: string; href: string }[] = [
    { id: 'cotacao', label: 'Cotação', href: `${base}#cotacao` },
    { id: 'resumo', label: 'Resumo', href: `${base}#resumo` },
    { id: 'fundamentos', label: 'Fundamentos', href: `${base}/fundamentos` },
    { id: 'pares', label: 'Pares', href: `${base}/fundamentos#pares` },
  ];
  return (
    <nav
      aria-label="Seções do ativo"
      className="flex gap-7 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)]"
    >
      {items.map((i) => {
        const on = i.id === current;
        return (
          <Link
            key={i.id}
            href={i.href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'flex min-h-11 flex-none items-center px-0.5 text-body no-underline',
              on
                ? 'font-semibold text-foreground shadow-[inset_0_-2px_0_var(--accent)]'
                : 'font-medium text-secondary-foreground hover:text-foreground',
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
