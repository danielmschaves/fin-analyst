'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'right';
    /** Nome no seletor de colunas (padrão: o header em texto). */
    label?: string;
    /** Coluna sempre visível (não aparece no seletor). */
    alwaysVisible?: boolean;
  }
}

export type RowVariant = 'highlight' | 'average';

export type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Legenda para leitores de tela. */
  caption: string;
  getRowId?: (row: T) => string;
  /** Agrupa linhas (ex.: por classe); ordenação acontece dentro de cada grupo. */
  getGroup?: (row: T) => string;
  /** Linhas fixas no topo: `highlight` (o próprio ativo) e `average` (média do setor). */
  getRowVariant?: (row: T) => RowVariant | undefined;
  initialSorting?: SortingState;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (v: VisibilityState) => void;
  stickyFirstColumn?: boolean;
  /** Fixa as linhas com variante no topo (padrão). Com false, elas ficam na ordem dos dados. */
  pinVariants?: boolean;
  minWidth?: number;
  empty?: ReactNode;
  className?: string;
};

const cellBase = 'px-3 py-3 text-small whitespace-nowrap';

export function DataTable<T>({
  columns,
  data,
  caption,
  getRowId,
  getGroup,
  getRowVariant,
  initialSorting = [],
  columnVisibility,
  onColumnVisibilityChange,
  stickyFirstColumn = true,
  pinVariants = true,
  minWidth = 420,
  empty,
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [localVisibility, setLocalVisibility] = useState<VisibilityState>({});
  const visibility = columnVisibility ?? localVisibility;

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(visibility) : updater;
      if (onColumnVisibilityChange) onColumnVisibilityChange(next);
      else setLocalVisibility(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  });

  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const colCount = visibleColumns.length;

  // Linhas fixas (destaque/média) ficam no topo na ordem original; o resto segue a ordenação.
  const { pinned, groups } = useMemo(() => {
    const pinnedRows: Row<T>[] = [];
    const rest: Row<T>[] = [];
    for (const r of rows) (pinVariants && getRowVariant?.(r.original) ? pinnedRows : rest).push(r);
    pinnedRows.sort((a, b) => a.index - b.index);
    const grouped = new Map<string, Row<T>[]>();
    if (getGroup) {
      // Ordem dos grupos = ordem de aparição nos dados originais.
      for (const item of data) {
        const g = getGroup(item);
        if (!grouped.has(g)) grouped.set(g, []);
      }
      for (const r of rest) grouped.get(getGroup(r.original))!.push(r);
    } else {
      grouped.set('', rest);
    }
    return { pinned: pinnedRows, groups: grouped };
  }, [rows, data, getGroup, getRowVariant, pinVariants]);

  if (data.length === 0 && empty) return <>{empty}</>;

  const renderRow = (row: Row<T>) => {
    const variant = getRowVariant?.(row.original);
    const cells = row.getVisibleCells();
    return (
      <tr key={row.id} data-variant={variant}>
        {cells.map((cell, i) => {
          const align = cell.column.columnDef.meta?.align ?? 'left';
          const first = i === 0;
          const last = i === cells.length - 1;
          const Tag = first ? 'th' : 'td';
          return (
            <Tag
              key={cell.id}
              scope={first ? 'row' : undefined}
              className={cn(
                cellBase,
                'border-b border-border-subtle bg-background',
                align === 'right' ? 'tnum text-right' : 'text-left',
                first && 'font-semibold',
                first && stickyFirstColumn && 'sticky left-0 z-[1]',
                variant === 'highlight' && 'border-surface-raised bg-surface-raised',
                variant === 'highlight' && first && 'rounded-l-md',
                variant === 'highlight' && last && 'rounded-r-md',
                variant === 'average' && 'border-t border-dashed border-t-muted-foreground',
                variant === 'average' && first && 'italic',
                !first && 'font-normal',
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </Tag>
          );
        })}
      </tr>
    );
  };

  return (
    // Região rolável focável: no mobile, o teclado também consegue rolar a tabela.
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className={cn('max-w-full overflow-x-auto rounded-sm', className)}
    >
      <table className="w-full border-separate border-spacing-0" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header, i) => {
                const align = header.column.columnDef.meta?.align ?? 'left';
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                const content = flexRender(header.column.columnDef.header, header.getContext());
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                    }
                    className={cn(
                      'border-b border-border bg-background px-3 pb-2.5 text-caption whitespace-nowrap',
                      sorted ? 'text-foreground' : 'text-muted-foreground',
                      align === 'right' ? 'text-right' : 'text-left',
                      i === 0 && stickyFirstColumn && 'sticky left-0 z-[2]',
                    )}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="cursor-pointer rounded-sm"
                      >
                        {content}
                        {sorted && (
                          <span aria-hidden="true" className="ml-1 text-foreground">
                            {sorted === 'desc' ? '↓' : '↑'}
                          </span>
                        )}
                      </button>
                    ) : (
                      content
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {pinned.map(renderRow)}
          {[...groups.entries()].map(([group, groupRows]) => (
            <Fragment key={group || 'all'}>
              {group && (
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={colCount}
                    className="sticky left-0 bg-background px-3 pt-5 pb-2 text-left text-caption font-semibold text-secondary-foreground"
                  >
                    {group}
                  </th>
                </tr>
              )}
              {groupRows.map(renderRow)}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
