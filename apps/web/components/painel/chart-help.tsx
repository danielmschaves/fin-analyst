'use client';

import { MessageCircleQuestion } from 'lucide-react';
import { Popover } from 'radix-ui';
import type { ReactNode } from 'react';
import { useAsk } from '@/lib/ask';
import { cn } from '@/lib/utils';

export type Insight = { title: string; detail: string };

type ChartHelpProps = {
  /** Nome do visual, usado no rótulo do botão ("Como ler a evolução em 12 meses…"). */
  subject: string;
  howTo: ReactNode;
  insights?: Insight[];
  /** Texto do botão: "Perguntar sobre a evolução". */
  askLabel?: string;
  /** Chips de contexto para o assistente. */
  askContext?: string[];
  /** Pergunta já enviada ao abrir o assistente (sem ela, o assistente abre só com o contexto). */
  askQuestion?: string;
  defaultOpen?: boolean;
};

/**
 * O "?" de cada visual: concentra "Como ler", insights e "Perguntar à IA".
 * Abre com Enter/Espaço e fecha com Esc (Radix Popover).
 */
export function ChartHelp({
  subject,
  howTo,
  insights = [],
  askLabel,
  askContext = [],
  askQuestion,
  defaultOpen,
}: ChartHelpProps) {
  const ask = useAsk();
  return (
    <Popover.Root defaultOpen={defaultOpen}>
      <Popover.Trigger
        aria-label={`Como ler ${subject} e perguntar à IA`}
        className={cn(
          'relative inline-grid size-6 flex-none cursor-help place-items-center rounded-full text-caption font-bold',
          'text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors',
          'data-[state=open]:bg-foreground data-[state=open]:text-background data-[state=open]:shadow-none',
          'after:absolute after:-inset-2.5 after:content-[""]',
        )}
      >
        ?
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={12}
          collisionPadding={16}
          className="z-50 w-[360px] max-w-[calc(100vw-32px)] rounded-lg bg-popover px-4 pt-4 pb-3 text-popover-foreground shadow-elevation-3 outline-none"
        >
          <p className="mb-1.5 text-caption text-secondary-foreground">Como ler</p>
          <div className="mb-3 text-small">{howTo}</div>
          {insights.length > 0 && (
            <ol className="flex flex-col">
              {insights.map((ins) => (
                <li key={ins.title} className="flex flex-col gap-0.5 border-t border-border py-2.5">
                  <span className="text-small font-semibold">{ins.title}</span>
                  <span className="text-small text-secondary-foreground">{ins.detail}</span>
                </li>
              ))}
            </ol>
          )}
          {askLabel && (
            <Popover.Close
              onClick={() => ask({ question: askQuestion, context: askContext })}
              className="mt-2 flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground text-small font-semibold text-background transition-opacity hover:opacity-90"
            >
              <MessageCircleQuestion aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {askLabel}
            </Popover.Close>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
