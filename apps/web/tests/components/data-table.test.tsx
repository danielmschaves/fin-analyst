import type { ColumnDef } from '@tanstack/react-table';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DataTable } from '@/components/painel/data-table';
import { EmptyState } from '@/components/painel/empty-state';

type Row = { ticker: string; score: number; group: string; variant?: 'highlight' | 'average' };

const data: Row[] = [
  { ticker: 'VALE3', score: 51, group: 'A', variant: 'highlight' },
  { ticker: 'Média', score: 71, group: 'A', variant: 'average' },
  { ticker: 'GGBR4', score: 93, group: 'A' },
  { ticker: 'USIM5', score: 84, group: 'A' },
  { ticker: 'CMIN3', score: 66, group: 'B' },
];

const columns: ColumnDef<Row, unknown>[] = [
  { id: 'ticker', accessorKey: 'ticker', header: 'Ativo', enableSorting: false },
  { id: 'score', accessorKey: 'score', header: 'Classificação', meta: { align: 'right' } },
];

function bodyTickers() {
  return screen
    .getAllByRole('rowheader')
    .filter((th) => th.getAttribute('scope') === 'row')
    .map((th) => th.textContent);
}

describe('DataTable', () => {
  it('marca a coluna ordenada com aria-sort e alterna a direção', async () => {
    render(
      <DataTable
        caption="Pares"
        columns={columns}
        data={data}
        getRowId={(r) => r.ticker}
        getGroup={(r) => r.group}
        getRowVariant={(r) => r.variant}
        initialSorting={[{ id: 'score', desc: true }]}
      />,
    );
    const header = screen.getByRole('columnheader', { name: /Classificação/ });
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', { name: 'Ativo' })).not.toHaveAttribute('aria-sort');
    // Linhas fixas no topo; o resto ordenado dentro de cada grupo.
    expect(bodyTickers()).toEqual(['VALE3', 'Média', 'GGBR4', 'USIM5', 'CMIN3']);

    await userEvent.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(bodyTickers()).toEqual(['VALE3', 'Média', 'USIM5', 'GGBR4', 'CMIN3']);
  });

  it('fixa a primeira coluna (cabeçalho e linhas) e usa th scope=row', () => {
    render(<DataTable caption="Pares" columns={columns} data={data} getRowId={(r) => r.ticker} />);
    const firstHeader = screen.getByRole('columnheader', { name: 'Ativo' });
    expect(firstHeader.className).toContain('sticky');
    expect(firstHeader.className).toContain('left-0');
    const rowHeader = screen.getByRole('rowheader', { name: 'GGBR4' });
    expect(rowHeader.tagName).toBe('TH');
    expect(rowHeader).toHaveAttribute('scope', 'row');
    expect(rowHeader.className).toContain('sticky');
  });

  it('mostra grupos, destaque e média', () => {
    render(
      <DataTable
        caption="Pares"
        columns={columns}
        data={data}
        getRowId={(r) => r.ticker}
        getGroup={(r) => r.group}
        getRowVariant={(r) => r.variant}
      />,
    );
    expect(screen.getAllByRole('rowheader', { name: /^[AB]$/ })).toHaveLength(2);
    expect(screen.getByRole('rowheader', { name: 'VALE3' }).closest('tr')).toHaveAttribute(
      'data-variant',
      'highlight',
    );
    expect(screen.getByRole('rowheader', { name: 'Média' }).closest('tr')).toHaveAttribute(
      'data-variant',
      'average',
    );
  });

  it('esconde colunas pela visibilidade', () => {
    render(
      <DataTable
        caption="Pares"
        columns={columns}
        data={data}
        columnVisibility={{ score: false }}
        onColumnVisibilityChange={() => {}}
      />,
    );
    expect(screen.queryByRole('columnheader', { name: /Classificação/ })).toBeNull();
  });

  it('mostra o estado vazio sem dados', () => {
    render(
      <DataTable
        caption="Pares"
        columns={columns}
        data={[]}
        empty={<EmptyState title="Nenhuma posição ainda" />}
      />,
    );
    expect(screen.getByText('Nenhuma posição ainda')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
