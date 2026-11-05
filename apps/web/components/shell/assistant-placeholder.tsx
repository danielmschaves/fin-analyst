'use client';

import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { AskRequest } from '@/lib/ask';
import { IconIA } from './icons';

/** Placeholder do assistente até o PR 9 (drawer com provider mock). */
export function AssistantPlaceholder({
  request,
  onClose,
}: {
  request: AskRequest | null;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={request !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby="assistente-descricao"
          className="fixed inset-y-0 right-0 z-50 flex w-[min(460px,100vw)] flex-col border-l border-border bg-background shadow-elevation-3"
        >
          <div className="flex items-center gap-2.5 py-3.5 pr-4 pl-5">
            <span className="inline-flex text-accent">
              <IconIA />
            </span>
            <Dialog.Title className="flex-1 text-body font-semibold">Assistente</Dialog.Title>
            <Dialog.Close
              aria-label="Fechar assistente"
              className="inline-grid size-11 cursor-pointer place-items-center rounded-full text-secondary-foreground hover:bg-surface-raised"
            >
              <X className="size-[18px]" strokeWidth={1.75} />
            </Dialog.Close>
          </div>
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
            {request?.question && (
              <p className="self-end rounded-[16px_16px_4px_16px] bg-surface-raised px-3.5 py-2.5 text-small">
                {request.question}
              </p>
            )}
            <p id="assistente-descricao" className="text-small text-secondary-foreground">
              O assistente ainda está em construção. Em breve ele responde com os seus dados e com
              as conexões MCP ativas.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
