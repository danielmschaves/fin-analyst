import type { ReactNode } from 'react';
import { ChartHelp, type Insight } from './chart-help';
import { Section } from './section';

/** Seção de gráfico: título, controles e o "?" com "Como ler" e "Perguntar sobre…". */
export function ChartSection({
  title,
  subtitle,
  lead,
  controls,
  help,
  id,
  className,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  lead?: ReactNode;
  controls?: ReactNode;
  help: {
    subject: string;
    howTo: ReactNode;
    insights?: Insight[];
    askLabel?: string;
    askContext?: string[];
  };
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Section
      id={id}
      title={title}
      subtitle={subtitle}
      lead={lead}
      className={className}
      actions={
        <>
          {controls}
          <ChartHelp {...help} />
        </>
      }
    >
      {children}
    </Section>
  );
}
