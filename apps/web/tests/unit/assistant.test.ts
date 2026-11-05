import { describe, expect, it } from 'vitest';
import type { AssistantAnswer } from '@/lib/contracts';
import { mcpConnections, mockAssistantProvider as provider } from '@/lib/mock/assistant';

type CheckCopy = { findViolations: (t: string) => { term: string }[] };
const checkCopyPath = '../../../../scripts/check-copy.mjs';

const QUESTIONS = [
  'Por que fiquei abaixo do CDI em 12 meses se rendi mais que ele em outubro?',
  'Quanto cada ativo contribuiu no mês?',
  'Cruze meus aportes da planilha com a rentabilidade',
  'Devo comprar mais VALE3?',
  'qualquer coisa',
];

const flatten = (a: AssistantAnswer) =>
  [a.consulted, a.headline, ...a.bullets, a.disclaimer].join('\n');

describe('AssistantProvider (mock)', () => {
  it('cumpre o contrato: consulta via MCP, manchete, tópicos e aviso', async () => {
    for (const question of QUESTIONS) {
      const a = await provider.ask({
        question,
        context: ['Carteira · out/2026'],
        connections: ['fin-analyst', 'planilha-aportes'],
      });
      expect(a.consulted).toMatch(/^Consultou .+ \(MCP\)/);
      expect(a.headline.length).toBeGreaterThan(0);
      expect(a.bullets.length).toBeGreaterThan(0);
      expect(a.disclaimer).toMatch(/não é previsão nem recomendação/);
    }
  });

  it('responde a pergunta da prancha P2-A-IA', async () => {
    const a = await provider.ask({
      question: QUESTIONS[0]!,
      context: [],
      connections: ['fin-analyst'],
    });
    expect(a.headline).toBe('A diferença se formou no meio do ano, não em outubro.');
    expect(a.bullets[0]).toBe('Em 12 meses: carteira {+11,4%}, CDI {+11,8%}.');
    expect(a.chartAnchor).toBe('evolucao');
  });

  it('nenhuma resposta usa linguagem de recomendação', async () => {
    const { findViolations } = (await import(/* @vite-ignore */ checkCopyPath)) as CheckCopy;
    for (const question of QUESTIONS) {
      const a = await provider.ask({
        question,
        context: [],
        connections: ['fin-analyst', 'planilha-aportes'],
      });
      expect(findViolations(flatten(a))).toEqual([]);
    }
  });

  it('sem a conexão da planilha, não usa dados dela', async () => {
    const a = await provider.ask({
      question: QUESTIONS[2]!,
      context: [],
      connections: ['fin-analyst'],
    });
    expect(a.consulted).not.toMatch(/Planilha/);
  });

  it('sugestões dependem do contexto', () => {
    expect(provider.suggestions(['Carteira · out/2026'])).toContain(
      'Quanto cada ativo contribuiu no mês?',
    );
    expect(provider.suggestions(['VALE3'])).toHaveLength(2);
  });

  it('conexões: 2 ativas e Open Finance em breve', () => {
    expect(mcpConnections.filter((c) => c.enabled)).toHaveLength(2);
    expect(mcpConnections.find((c) => c.id === 'open-finance')?.status).toBe('soon');
  });
});
