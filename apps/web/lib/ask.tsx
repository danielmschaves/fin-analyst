'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type AskRequest = {
  /** Pergunta sugerida (ex.: "Perguntar sobre a evolução"). */
  question?: string;
  /** Chips de contexto mostrados no assistente (ex.: "Carteira · out/2026", "Evolução 12M"). */
  context: string[];
};

type AskFn = (request: AskRequest) => void;

const AskContext = createContext<AskFn | null>(null);

/** Abre o assistente com um contexto. Sem provider, não faz nada. */
export function useAsk(): AskFn {
  return useContext(AskContext) ?? (() => {});
}

export function AskProvider({ value, children }: { value: AskFn; children: ReactNode }) {
  return <AskContext.Provider value={value}>{children}</AskContext.Provider>;
}
