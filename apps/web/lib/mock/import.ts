import type {
  ImportParser,
  ImportPreview,
  ParsedPosition,
  PositionSnapshot,
} from '@/lib/contracts';
import { referenceDateFromFileName } from '@/lib/import';
import { formatBRL } from '@/lib/format';
import { positions } from './portfolio';

/** O que o relatório de outubro traz (Posição - Ações, Fundos e Renda Fixa). */
export const octoberPositions: ParsedPosition[] = positions.map((p) => ({
  ticker: p.ticker,
  name: p.name,
  assetClass: p.assetClass,
  quantity: p.quantity,
  price: p.price,
  marketValue: p.marketValue,
}));

/** Posição de setembro já importada: MXRF11 tinha 100 cotas e o CDB valia menos. */
export const septemberPositions: ParsedPosition[] = octoberPositions.map((p) => {
  if (p.ticker === 'MXRF11') return { ...p, quantity: 100, marketValue: 976.0, price: 9.76 };
  if (p.ticker === 'CDB DI') return { ...p, marketValue: 3177.24 };
  return p;
});

export const septemberSnapshot: PositionSnapshot = {
  referenceDate: '2026-09-30',
  positions: septemberPositions,
};

export const REAL_FILE_NAME = 'relatorio-consolidado-mensal-2026-outubro.xlsx';

export const mockImportParser: ImportParser = {
  async parse(file) {
    const cdb = octoberPositions.find((p) => p.price === null);
    const preview: ImportPreview = {
      fileName: file.name,
      fileSize: file.size,
      reportType: 'Relatório consolidado mensal B3',
      referenceDate: referenceDateFromFileName(file.name) ?? '2026-10-31',
      positions: octoberPositions,
      dividendsCount: 2,
      tradesCount: 2,
      warnings: cdb
        ? [
            {
              title: `${cdb.ticker} sem preço unitário`,
              detail: `Usamos o valor de ${formatBRL(cdb.marketValue)} informado pelo relatório. Renda fixa não recebe classificação.`,
            },
          ]
        : [],
    };
    return preview;
  },
};
