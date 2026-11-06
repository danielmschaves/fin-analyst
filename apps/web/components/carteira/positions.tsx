'use client';

import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import Link from 'next/link';
import { useState } from 'react';
import { ColumnSelector } from '@/components/painel/column-selector';
import { DataTable } from '@/components/painel/data-table';
import { Delta } from '@/components/painel/delta';
import { Monogram } from '@/components/painel/monogram';
import { ScoreMeter } from '@/components/painel/score-meter';
import { Section } from '@/components/painel/section';
import type { PortfolioPosition } from '@/lib/contracts';
import { formatBRL, formatInteger, formatNumber, formatPercent } from '@/lib/format';
import { allocationByClass, CLASS_LABEL, weightPct } from '@/lib/portfolio';

type Row = PortfolioPosition & { weight: number };

const dash = <span className="text-muted-foreground">—</span>;

function AssetCell({ p }: { p: PortfolioPosition }) {
  const linkable = p.assetClass !== 'Renda Fixa';
  const inner = (
    <span className="inline-flex items-center gap-3">
      <Monogram ticker={p.ticker} />
      <span className="flex flex-col gap-px">
        <span className="tnum font-semibold">{p.ticker}</span>
        <span className="text-caption font-normal text-muted-foreground">{p.name}</span>
      </span>
    </span>
  );
  return linkable ? (
    <Link
      href={`/ativo/${p.ticker}`}
      className="rounded-md text-foreground no-underline hover:underline"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}

const columns: ColumnDef<Row, unknown>[] = [
  {
    id: 'ativo',
    accessorKey: 'ticker',
    header: 'Ativo',
    cell: ({ row }) => <AssetCell p={row.original} />,
  },
  {
    id: 'quantidade',
    accessorKey: 'quantity',
    header: 'Quantidade',
    cell: ({ row }) => formatInteger(row.original.quantity),
    meta: { align: 'right', label: 'Quantidade' },
  },
  {
    id: 'preco',
    accessorFn: (r) => r.price ?? -1,
    header: 'Preço',
    cell: ({ row }) => (row.original.price === null ? dash : formatNumber(row.original.price)),
    meta: { align: 'right', label: 'Preço' },
  },
  {
    id: 'valor',
    accessorKey: 'marketValue',
    header: 'Valor',
    cell: ({ row }) => formatNumber(row.original.marketValue),
    meta: { align: 'right', label: 'Valor' },
  },
  {
    id: 'peso',
    accessorKey: 'weight',
    header: '% carteira',
    cell: ({ row }) => formatPercent(row.original.weight, { sign: false, decimals: 1 }),
    meta: { align: 'right', label: '% carteira' },
  },
  {
    id: 'variacao',
    accessorFn: (r) => r.monthChangePct ?? Number.NEGATIVE_INFINITY,
    header: 'Var. mês',
    cell: ({ row }) =>
      row.original.monthChangePct === null ? (
        dash
      ) : (
        <Delta value={row.original.monthChangePct} decimals={1} context="no mês" />
      ),
    meta: { align: 'right', label: 'Var. mês' },
  },
  {
    id: 'classificacao',
    accessorFn: (r) => r.score ?? -1,
    header: 'Classificação',
    cell: ({ row }) =>
      row.original.score === null ? dash : <ScoreMeter score={row.original.score} />,
    meta: { label: 'Classificação' },
  },
];

const selectable = columns
  .filter((c) => c.meta?.label)
  .map((c) => ({ id: c.id!, label: c.meta!.label! }));

/** Tabela por classe (desktop) e lista por valor (mobile). */
export function Positions({ positions }: { positions: PortfolioPosition[] }) {
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const rows: Row[] = positions.map((p) => ({ ...p, weight: weightPct(p, positions) }));
  const classPct = Object.fromEntries(
    allocationByClass(positions).map((c) => [c.assetClass, c.pct]),
  );
  const byValue = [...positions].sort((a, b) => b.marketValue - a.marketValue);

  return (
    <Section
      id="posicoes"
      title="Posições"
      subtitle={
        <>
          <span className="hidden md:inline">Valores em R$</span>
          <span className="md:hidden">Por valor ↓</span>
        </>
      }
      actions={
        <span className="hidden md:inline-flex">
          <ColumnSelector
            tableLabel="posições"
            columns={selectable}
            visibility={visibility}
            onChange={setVisibility}
          />
        </span>
      }
    >
      <div className="hidden md:block">
        <DataTable
          caption="Posições da carteira por classe"
          columns={columns}
          data={rows}
          getRowId={(r) => r.ticker}
          getGroup={(r) =>
            `${CLASS_LABEL[r.assetClass]} · ${formatPercent(classPct[r.assetClass] ?? 0, { sign: false, decimals: 1 })}`
          }
          initialSorting={[{ id: 'valor', desc: true }]}
          columnVisibility={visibility}
          onColumnVisibilityChange={setVisibility}
          minWidth={840}
        />
      </div>
      <ul aria-label="Posições por valor" className="flex flex-col md:hidden">
        {byValue.map((p) => (
          <li
            key={p.ticker}
            className="flex min-h-14 items-center gap-3 border-b border-border-subtle py-2"
          >
            <Monogram ticker={p.ticker} />
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="tnum text-small font-semibold">{p.ticker}</span>
              {p.score === null ? (
                <span className="text-caption font-normal text-muted-foreground">
                  {p.assetClass}
                </span>
              ) : (
                <ScoreMeter score={p.score} showLabel={false} />
              )}
            </span>
            <span className="flex flex-col items-end gap-px text-small">
              <span className="tnum">{formatBRL(p.marketValue)}</span>
              {p.monthChangePct === null ? (
                dash
              ) : (
                <Delta value={p.monthChangePct} decimals={1} context="no mês" />
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 max-w-[720px] text-small text-secondary-foreground">
        Classificação quantitativa de 0 a 100, comparada ao setor; FIIs e renda fixa não são
        classificados.
      </p>
    </Section>
  );
}
