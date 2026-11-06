'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { McpConnection } from '@/lib/contracts';
import { AskProvider, type AskRequest } from '@/lib/ask';

type AssistantState = {
  open: boolean;
  request: AskRequest | null;
  /** Incrementa a cada pedido, para o drawer reagir a pedidos repetidos. */
  requestId: number;
  close: () => void;
  connections: McpConnection[];
  setConnectionEnabled: (id: string, enabled: boolean) => void;
};

const Ctx = createContext<AssistantState | null>(null);

export function useAssistant() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAssistant precisa de <AssistantStateProvider>');
  return v;
}

/** Estado do assistente na sessão: aberto/fechado, pedido atual e conexões MCP ativas. */
export function AssistantStateProvider({
  children,
  initialConnections,
}: {
  children: ReactNode;
  /** Conexões MCP do usuário, vindas do AssistantProvider no servidor. */
  initialConnections: McpConnection[];
}) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<AskRequest | null>(null);
  const [requestId, setRequestId] = useState(0);
  const [connections, setConnections] = useState(initialConnections);

  const ask = useCallback((r: AskRequest) => {
    setRequest(r);
    setRequestId((n) => n + 1);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const setConnectionEnabled = useCallback(
    (id: string, enabled: boolean) =>
      setConnections((cs) => cs.map((c) => (c.id === id ? { ...c, enabled } : c))),
    [],
  );

  const value = useMemo(
    () => ({ open, request, requestId, close, connections, setConnectionEnabled }),
    [open, request, requestId, close, connections, setConnectionEnabled],
  );
  return (
    <Ctx.Provider value={value}>
      <AskProvider value={ask}>{children}</AskProvider>
    </Ctx.Provider>
  );
}
