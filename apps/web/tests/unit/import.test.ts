import { describe, expect, it } from 'vitest';
import {
  diffPositions,
  formatFileSize,
  MAX_FILE_SIZE,
  referenceDateFromFileName,
  validateFile,
} from '@/lib/import';
import {
  mockImportParser,
  octoberPositions,
  REAL_FILE_NAME,
  septemberPositions,
} from '@/lib/mock/import';
import { totalValue } from '@/lib/portfolio';
import { positions } from '@/lib/mock/portfolio';

describe('lib/import', () => {
  it('diff contra setembro: 0 novas e 2 alteradas', () => {
    const d = diffPositions(septemberPositions, octoberPositions);
    expect(d.newCount).toBe(0);
    expect(d.changedCount).toBe(2);
    expect(d.removed).toEqual([]);
    const changes = Object.fromEntries(d.rows.map((r) => [r.position.ticker, r.change]));
    expect(changes['MXRF11']).toEqual({ kind: 'quantity', delta: 50 });
    expect(changes['CDB DI']).toEqual({ kind: 'value' });
    expect(changes['VALE3']).toEqual({ kind: 'unchanged' });
  });

  it('valida tipo e tamanho', () => {
    expect(validateFile({ name: REAL_FILE_NAME, size: 48 * 1024 })).toEqual({ ok: true });
    expect(validateFile({ name: 'extrato.PDF', size: 1000 })).toEqual({ ok: true });
    expect(validateFile({ name: 'extrato.csv', size: 1000 })).toMatchObject({
      ok: false,
      title: 'Arquivo não reconhecido',
    });
    expect(validateFile({ name: 'foto.png', size: 1000 })).toMatchObject({ ok: false });
    expect(validateFile({ name: REAL_FILE_NAME, size: MAX_FILE_SIZE + 1 })).toMatchObject({
      ok: false,
      title: 'Arquivo maior que 10 MB',
    });
    expect(validateFile({ name: REAL_FILE_NAME, size: MAX_FILE_SIZE })).toEqual({ ok: true });
    expect(validateFile({ name: REAL_FILE_NAME, size: 0 })).toMatchObject({ ok: false });
  });

  it('data de referência = último dia do mês do nome do arquivo', () => {
    expect(referenceDateFromFileName(REAL_FILE_NAME)).toBe('2026-10-31');
    expect(referenceDateFromFileName('relatorio-consolidado-mensal-2026-fevereiro.xlsx')).toBe(
      '2026-02-28',
    );
    expect(referenceDateFromFileName('relatorio-consolidado-2026-10.xlsx')).toBeNull();
  });

  it('parser mock devolve as 7 posições e o aviso do CDB', async () => {
    const p = await mockImportParser.parse({ name: REAL_FILE_NAME, size: 49_152 });
    expect(p.positions).toHaveLength(7);
    expect(totalValue(positions)).toBe(16188.02);
    expect(p.referenceDate).toBe('2026-10-31');
    expect(p.warnings[0]).toEqual({
      title: 'CDB DI sem preço unitário',
      detail:
        'Usamos o valor de R$ 3.205,52 informado pelo relatório. Renda fixa não recebe classificação.',
    });
  });

  it('tamanho de arquivo legível', () => {
    expect(formatFileSize(49_152)).toBe('48 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2,5 MB');
  });
});
