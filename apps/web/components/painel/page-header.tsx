import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Abertura de tela: rótulo, frase-resumo em Faustina e uma linha de apoio. */
export function PageHeader({
  eyebrow,
  title,
  summary,
  actions,
  className,
  headingLevel = 1,
}: {
  /** Use 3 só em amostras (ex.: /design), para não duplicar o h1 da página. */
  headingLevel?: 1 | 3;
  eyebrow?: ReactNode;
  title: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h3';
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-5', className)}>
      <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-3">
        {eyebrow && <span className="text-caption text-secondary-foreground">{eyebrow}</span>}
        <Heading className="font-serif text-[30px] leading-[1.15] tracking-[-0.01em] text-balance sm:text-h1">
          {title}
        </Heading>
        {summary && <p className="max-w-[720px] text-small text-secondary-foreground">{summary}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Número dentro de uma frase, colorido pelo sinal (o sinal já vem no texto). */
export function Highlight({
  tone,
  children,
}: {
  tone: 'positive' | 'negative' | 'accent';
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'whitespace-nowrap',
        tone === 'positive' && 'text-positive',
        tone === 'negative' && 'text-negative',
        tone === 'accent' && 'text-accent',
      )}
    >
      {children}
    </span>
  );
}
