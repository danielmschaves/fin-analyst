'use client';

import { Command } from 'cmdk';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { useEffect, useMemo, useState } from 'react';
import { searchAssetsAction } from '@/lib/actions';
import { Monogram } from '@/components/painel/monogram';
import type { AssetSummary } from '@/lib/contracts';
import { useAsk } from '@/lib/ask';
import { looksLikeTicker, searchAssets } from '@/lib/search';
import { IconIA } from './icons';

/** Abre a barra de comando com ⌘K / Ctrl+K. */
export function useCommandShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
}

export function CommandTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-keyshortcuts="Meta+K Control+K"
      className="flex min-h-10 max-w-[520px] flex-[1_1_280px] cursor-text items-center gap-2.5 rounded-full bg-surface-raised pr-2 pl-3.5 text-left text-[14px] text-muted-foreground"
    >
      <span className="inline-flex text-accent">
        <IconIA />
      </span>
      <span className="flex-1">Buscar ativo ou perguntar à IA</span>
      <span
        aria-hidden="true"
        className="rounded-[6px] px-2 py-0.5 text-caption text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]"
      >
        ⌘K
      </span>
    </button>
  );
}

const itemClass =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-small outline-none select-none data-[selected=true]:bg-border';

export function CommandBar({
  open,
  onOpenChange,
  assets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: AssetSummary[];
}) {
  const router = useRouter();
  const ask = useAsk();
  const [query, setQuery] = useState('');
  const q = query.trim();
  // Resposta imediata com a lista inicial; a busca de verdade roda no servidor (debounce de 120 ms).
  const local = useMemo(() => searchAssets(assets, query), [assets, query]);
  const [remote, setRemote] = useState<{ q: string; items: AssetSummary[] } | null>(null);
  useEffect(() => {
    if (!q) return;
    let alive = true;
    const timer = setTimeout(() => {
      searchAssetsAction(q)
        .then((items) => alive && setRemote({ q, items }))
        .catch(() => undefined); // sem rede: fica a lista local
    }, 120);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);
  const results = q && remote?.q === q ? remote.items : local;
  const unknownTicker =
    looksLikeTicker(q) && !results.some((r) => r.ticker.toLowerCase() === q.toLowerCase());

  const close = () => {
    onOpenChange(false);
    setQuery('');
  };
  const goTo = (ticker: string) => {
    close();
    router.push(`/ativo/${ticker.toUpperCase()}`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-elevation-3"
        >
          <Dialog.Title className="sr-only">Buscar ativo ou perguntar à IA</Dialog.Title>
          <Command label="Buscar ativo ou perguntar à IA" shouldFilter={false} loop>
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <span className="inline-flex text-accent">
                <IconIA />
              </span>
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Buscar ativo ou perguntar à IA"
                className="min-h-13 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Command.List className="max-h-[50vh] overflow-y-auto p-1.5">
              {results.length > 0 && (
                <Command.Group
                  heading="Ativos"
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-secondary-foreground"
                >
                  {results.map((a) => (
                    <Command.Item
                      key={a.ticker}
                      value={a.ticker}
                      onSelect={() => goTo(a.ticker)}
                      className={itemClass}
                    >
                      <Monogram ticker={a.ticker} />
                      <span className="tnum font-semibold">{a.ticker}</span>
                      <span className="truncate text-secondary-foreground">{a.name}</span>
                      <span className="ml-auto text-caption font-normal text-muted-foreground">
                        {a.assetClass}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {unknownTicker && (
                <Command.Item value={`ir-${q}`} onSelect={() => goTo(q)} className={itemClass}>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-secondary-foreground"
                    strokeWidth={1.75}
                  />
                  Abrir {q.toUpperCase()}
                </Command.Item>
              )}
              {q && (
                <Command.Group
                  heading="Assistente"
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-secondary-foreground"
                >
                  <Command.Item
                    value={`ask-${q}`}
                    onSelect={() => {
                      close();
                      ask({ question: q, context: [] });
                    }}
                    className={itemClass}
                  >
                    <span className="inline-flex text-accent">
                      <IconIA />
                    </span>
                    <span className="truncate">
                      Perguntar à IA: <span className="text-secondary-foreground">“{q}”</span>
                    </span>
                  </Command.Item>
                </Command.Group>
              )}
              <Command.Empty className="px-3 py-6 text-center text-small text-muted-foreground">
                Nenhum ativo encontrado.
              </Command.Empty>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
