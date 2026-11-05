import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionProps = {
  title: string;
  /** Linha de apoio abaixo do título (ex.: "Valores em R$"). */
  subtitle?: ReactNode;
  /** Frase de leitura em Faustina, no máximo uma por seção. */
  lead?: ReactNode;
  /** Controles à direita do título (abas de período, "?", "Colunas"). */
  actions?: ReactNode;
  id?: string;
  className?: string;
  headingLevel?: 2 | 3;
  children?: ReactNode;
};

/** Seção do Painel 2: sem caixa, separada por um fio no topo e espaço. */
export function Section({
  title,
  subtitle,
  lead,
  actions,
  id,
  className,
  headingLevel = 2,
  children,
}: SectionProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const headingId = id ? `${id}-titulo` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : title}
      className={cn('relative min-w-0 scroll-mt-24 border-t border-border pt-5', className)}
    >
      <div
        className={cn(
          'flex flex-wrap items-end justify-between gap-x-4 gap-y-2',
          lead ? 'mb-3' : 'mb-5',
        )}
      >
        <div className="flex flex-col gap-0.5">
          <Heading id={headingId} className="text-h2">
            {title}
          </Heading>
          {subtitle && <p className="text-small text-secondary-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="relative flex flex-wrap items-center gap-4">{actions}</div>}
      </div>
      {lead && <p className="mb-5 max-w-[760px] font-serif text-lead">{lead}</p>}
      {children}
    </section>
  );
}
