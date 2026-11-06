'use client';

import { Copy, LineChart, Plug, Plus, SendHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { IconIA } from '@/components/shell/icons';
import type { AssistantAnswer } from '@/lib/contracts';
import { askAssistant, getAssistantSuggestions } from '@/lib/actions';
import { useAssistant } from './assistant-context';
import { plainText, RichText } from './answer';

type Turn = { id: number; question: string; answer: AssistantAnswer | null };

/** Contexto padrão a partir da tela atual. */
export function pageContext(pathname: string, monthLabel: string): string[] {
  const asset = /^\/ativo\/([^/]+)/.exec(pathname);
  if (asset) return [decodeURIComponent(asset[1]!).toUpperCase()];
  if (pathname.startsWith('/projecoes')) return ['Projeções'];
  if (pathname.startsWith('/importar')) return ['Importação'];
  return [`Carteira · ${monthLabel}`];
}

export function AssistantDrawer({ monthLabel }: { monthLabel: string }) {
  const { open, request, requestId, close, connections } = useAssistant();
  const pathname = usePathname();
  const [context, setContext] = useState<string[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const nextId = useRef(1);
  const active = connections.filter((c) => c.enabled);
  const listRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const contextKey = context.join('|');

  // Sugestões vêm do AssistantProvider no servidor, conforme o contexto da conversa.
  useEffect(() => {
    let alive = true;
    void getAssistantSuggestions(contextKey ? contextKey.split('|') : []).then((s) => {
      if (alive) setSuggestions(s);
    });
    return () => {
      alive = false;
    };
  }, [contextKey]);

  const send = async (question: string, ctx: string[]) => {
    const q = question.trim();
    if (!q) return;
    const id = nextId.current++;
    setTurns((t) => [...t, { id, question: q, answer: null }]);
    const { answer, suggestions: next } = await askAssistant({
      question: q,
      context: ctx,
      connections: active.map((c) => c.id),
    });
    setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, answer } : turn)));
    setSuggestions(next);
  };

  // Cada pedido (⌘K, "Perguntar sobre…", topo) redefine o contexto e, se houver pergunta, já envia.
  useEffect(() => {
    if (!requestId) return;
    const ctx = request?.context.length ? request.context : pageContext(pathname, monthLabel);
    setContext(ctx);
    if (request?.question) void send(request.question, ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns]);

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const q = draft;
    setDraft('');
    void send(q, context);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const copy = async (a: AssistantAnswer) => {
    const text = [a.headline, ...a.bullets.map((b) => `• ${plainText(b)}`), a.disclaimer].join(
      '\n',
    );
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Resposta copiada');
    } catch {
      toast.error('Não foi possível copiar', {
        description: 'O navegador bloqueou a área de transferência.',
      });
    }
  };

  const showInChart = (anchor: string) => {
    close();
    setTimeout(
      () => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 md:bg-transparent" />
        <Dialog.Content
          aria-describedby="assistente-rodape"
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-background shadow-elevation-3 outline-none md:w-[400px] md:shadow-none"
        >
          <div className="flex items-center gap-2.5 py-3.5 pr-4 pl-5">
            <span className="inline-flex text-accent">
              <IconIA />
            </span>
            <Dialog.Title className="flex-1 text-body font-semibold">Assistente</Dialog.Title>
            <Dialog.Close
              aria-label="Fechar assistente"
              className="inline-grid size-11 cursor-pointer place-items-center rounded-full text-secondary-foreground hover:bg-surface-raised md:size-9"
            >
              <X className="size-[18px]" strokeWidth={1.75} />
            </Dialog.Close>
          </div>

          {context.length > 0 && (
            <ul aria-label="Contexto da conversa" className="flex flex-wrap gap-1.5 px-5 pb-3">
              {context.map((c) => (
                <li
                  key={c}
                  className="inline-flex min-h-7 items-center gap-1 rounded-full bg-surface-raised pr-1 pl-2.5 text-caption text-foreground"
                >
                  {c}
                  <button
                    type="button"
                    aria-label={`Remover ${c}`}
                    onClick={() => setContext((cs) => cs.filter((x) => x !== c))}
                    className="inline-grid size-6 cursor-pointer place-items-center rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div
            ref={listRef}
            className="flex flex-1 flex-col gap-3.5 overflow-y-auto border-t border-border px-5 py-3"
            aria-live="polite"
          >
            {turns.length === 0 && (
              <p className="text-small text-secondary-foreground">
                Pergunte sobre a carteira, um ativo ou um gráfico. As respostas usam seus dados e as
                conexões MCP ativas.
              </p>
            )}
            {turns.map((t) => (
              <article
                key={t.id}
                className="flex flex-col gap-3.5"
                aria-label={`Pergunta: ${t.question}`}
              >
                <p className="max-w-[88%] self-end rounded-[16px_16px_4px_16px] bg-surface-raised px-3.5 py-2.5 text-small">
                  {t.question}
                </p>
                {t.answer ? (
                  <>
                    <p className="flex items-center gap-1.5 text-caption font-normal text-muted-foreground">
                      <Plug aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                      {t.answer.consulted}
                    </p>
                    <p className="font-serif text-[19px] leading-[1.4]">{t.answer.headline}</p>
                    <ul className="flex list-disc flex-col gap-2 pl-[18px] text-small">
                      {t.answer.bullets.map((b) => (
                        <li key={b}>
                          <RichText text={b} />
                        </li>
                      ))}
                    </ul>
                    <p className="text-caption font-normal text-muted-foreground">
                      {t.answer.disclaimer}
                    </p>
                    <div className="flex gap-1">
                      {t.answer.chartAnchor && (
                        <button
                          type="button"
                          onClick={() => showInChart(t.answer!.chartAnchor!)}
                          className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 text-small font-semibold text-secondary-foreground hover:bg-surface-raised"
                        >
                          <LineChart aria-hidden="true" className="size-4" strokeWidth={1.75} />
                          Mostrar no gráfico
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copy(t.answer!)}
                        className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 text-small font-semibold text-secondary-foreground hover:bg-surface-raised"
                      >
                        <Copy aria-hidden="true" className="size-4" strokeWidth={1.75} />
                        Copiar
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-caption font-normal text-muted-foreground" role="status">
                    Consultando as conexões…
                  </p>
                )}
              </article>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2 px-5 pt-3 pb-5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s, context)}
                className="min-h-10 cursor-pointer rounded-lg px-3 py-2 text-left text-small text-secondary-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-surface-raised"
              >
                {s}
              </button>
            ))}
            <form
              onSubmit={onSubmit}
              className="flex flex-col gap-2 rounded-[16px] bg-surface-raised py-2.5 pr-2.5 pl-3.5"
            >
              <label htmlFor="assistente-pergunta" className="sr-only">
                Pergunte à IA
              </label>
              <textarea
                id="assistente-pergunta"
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Pergunte sobre a carteira, um ativo ou um gráfico"
                className="resize-none bg-transparent text-[14px] leading-normal text-foreground outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Adicionar contexto"
                  onClick={() =>
                    setContext((cs) => [...new Set([...cs, ...pageContext(pathname, monthLabel)])])
                  }
                  className="inline-grid size-8 cursor-pointer place-items-center rounded-full text-secondary-foreground hover:bg-border"
                >
                  <Plus className="size-4" strokeWidth={1.75} />
                </button>
                <Link
                  href="/conexoes"
                  onClick={close}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-caption font-semibold text-secondary-foreground no-underline hover:bg-border"
                >
                  <Plug aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                  {active.length} {active.length === 1 ? 'conexão' : 'conexões'}
                </Link>
                <button
                  type="submit"
                  aria-label="Enviar"
                  disabled={!draft.trim()}
                  className="ml-auto inline-grid size-9 cursor-pointer place-items-center rounded-full bg-accent text-accent-foreground disabled:opacity-50"
                >
                  <SendHorizontal className="size-4" strokeWidth={2} />
                </button>
              </div>
            </form>
            <p id="assistente-rodape" className="text-caption font-normal text-muted-foreground">
              Responde com seus dados e com as conexões MCP ativas. Não recomenda compra ou venda.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
