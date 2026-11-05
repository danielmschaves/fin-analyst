import type { AssistantAnswer, AssistantProvider, McpConnection } from '@/lib/contracts';

export const DISCLAIMER_PAST = 'Descreve o passado; não é previsão nem recomendação.';

export const mcpConnections: McpConnection[] = [
  {
    id: 'fin-analyst',
    name: 'fin-analyst',
    description: 'Servidor MCP da própria plataforma.',
    scopes: [
      'Carteira e posições',
      'Rentabilidade, CDI e Ibovespa',
      'Fundamentos e pares',
      'Projeções',
    ],
    status: 'connected',
    enabled: true,
  },
  {
    id: 'planilha-aportes',
    name: 'Planilha de aportes',
    description: 'Planilha pessoal com os aportes de cada mês (somente leitura).',
    scopes: ['Aportes por mês'],
    status: 'connected',
    enabled: true,
  },
  {
    id: 'open-finance',
    name: 'Open Finance',
    description: 'Contas e investimentos em outras instituições, via agregador regulado.',
    scopes: ['Saldos', 'Movimentações'],
    status: 'soon',
    enabled: false,
  },
];

const evolutionAnswer: AssistantAnswer = {
  consulted: 'Consultou fin-analyst (MCP): rentabilidade mensal, CDI e Ibovespa',
  headline: 'A diferença se formou no meio do ano, não em outubro.',
  bullets: [
    'Em 12 meses: carteira {+11,4%}, CDI {+11,8%}.',
    'A maior distância foi em junho, 2,6 p.p. abaixo, quando o Ibovespa recuava de +8,1% (maio) para +3,9% (julho). Com 61% em ações, a carteira acompanhou parte da queda.',
    'Outubro ({+1,33%} contra {+0,89%}) reduziu a distância, mas não a fechou.',
  ],
  disclaimer: DISCLAIMER_PAST,
  chartAnchor: 'evolucao',
};

const contributionAnswer: AssistantAnswer = {
  consulted: 'Consultou fin-analyst (MCP): posições e variação do mês',
  headline: 'PETR4 foi a que mais somou; VALE3, a que mais tirou.',
  bullets: [
    'PETR4 ({+2,1%}) somou cerca de R$ 79 ao resultado de outubro.',
    'VALE3 ({−16,4%}) tirou cerca de R$ 590 — sozinha, mais que o resultado positivo das demais ações.',
    'Os proventos (R$ 59,80) equivalem a 28% do resultado do mês.',
  ],
  disclaimer: DISCLAIMER_PAST,
  chartAnchor: 'posicoes',
};

const contributionsSheetAnswer: AssistantAnswer = {
  consulted:
    'Consultou Planilha de aportes (MCP) e fin-analyst (MCP): aportes e rentabilidade mensal',
  headline: 'Os aportes explicam a maior parte do crescimento do patrimônio em 12 meses.',
  bullets: [
    'A rentabilidade acumulada da carteira em 12 meses foi de {+11,4%}.',
    'Na planilha de exemplo, os aportes somam R$ 6.000 no período (R$ 500 por mês).',
  ],
  disclaimer: DISCLAIMER_PAST,
};

function fallback(question: string): AssistantAnswer {
  return {
    consulted: 'Consultou fin-analyst (MCP): carteira e ativos',
    headline: 'Ainda não tenho essa resposta nos dados de exemplo.',
    bullets: [
      `Pergunta recebida: “${question.trim()}”.`,
      'Na fase 3, o assistente responde com os seus dados e com as conexões MCP ativas.',
    ],
    disclaimer: 'Descreve dados; não é previsão nem recomendação.',
  };
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export const mockAssistantProvider: AssistantProvider = {
  async ask({ question, connections }) {
    const q = norm(question);
    if (/cdi|evolucao|abaixo|rendi/.test(q)) return evolutionAnswer;
    if (/contribu|cada ativo|mais somou/.test(q)) return contributionAnswer;
    if (/aporte|planilha/.test(q) && connections.includes('planilha-aportes'))
      return contributionsSheetAnswer;
    return fallback(question);
  },
  async listConnections() {
    return mcpConnections;
  },
  suggestions(context) {
    if (context.some((c) => c.startsWith('Carteira'))) {
      return [
        'Quanto cada ativo contribuiu no mês?',
        'Cruze meus aportes da planilha com a rentabilidade',
      ];
    }
    return [
      'Por que fiquei abaixo do CDI em 12 meses se rendi mais que ele em outubro?',
      'Quanto cada ativo contribuiu no mês?',
    ];
  },
};
