'use client';

import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useState } from 'react';
import { ColumnSelector } from '@/components/painel/column-selector';
import { DataTable } from '@/components/painel/data-table';
import { Monogram } from '@/components/painel/monogram';
import { ScoreMeter } from '@/components/painel/score-meter';
import { Section } from '@/components/painel/section';
import type { PeerRow } from '@/lib/contracts';
import { formatMultiple, formatNumber, formatPercent } from '@/lib/format';
import { peerRanks } from '@/lib/fundamentals';

const sortNull = (v: number | null) => v ?? Number.NEGATIVE_INFINITY;

const columns: ColumnDef<PeerRow, unknown>[] = [
  {
    id: 'ativo',
    header: 'Ativo',
    accessorKey: 'ticker',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.kind === 'avg' ? (
        row.original.ticker
      ) : (
        <span className="inline-flex items-center gap-2.5">
          <Monogram ticker={row.original.ticker} className="size-7 text-[9px]" />
          <span className="tnum">{row.original.ticker}</span>
        </span>
      ),
  },
  {
    id: 'score',
    header: 'Classificação',
    accessorKey: 'score',
    sortDescFirst: true,
    cell: ({ row }) => <ScoreMeter score={row.original.score} showLabel={false} />,
    meta: { label: 'Classificação' },
  },
  {
    id: 'marketCap',
    header: 'Market cap',
    accessorKey: 'marketCap',
    sortDescFirst: true,
    cell: ({ row }) => `${formatNumber(row.original.marketCap, 1)} bi`,
    meta: { align: 'right', label: 'Market cap' },
  },
  {
    id: 'pe',
    header: 'P/L',
    accessorFn: (r) => sortNull(r.pe),
    sortDescFirst: true,
    cell: ({ row }) =>
      row.original.pe === null ? (
        <span className="text-muted-foreground">N/A</span>
      ) : (
        formatNumber(row.original.pe)
      ),
    meta: { align: 'right', label: 'P/L' },
  },
  {
    id: 'roe',
    header: 'ROE',
    accessorKey: 'roe',
    sortDescFirst: true,
    cell: ({ row }) => formatPercent(row.original.roe, { sign: false }),
    meta: { align: 'right', label: 'ROE' },
  },
  {
    id: 'dy',
    header: 'DY',
    accessorFn: (r) => sortNull(r.dividendYield),
    sortDescFirst: true,
    cell: ({ row }) =>
      row.original.dividendYield === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        formatPercent(row.original.dividendYield, { sign: false })
      ),
    meta: { align: 'right', label: 'DY' },
  },
  {
    id: 'growth',
    header: 'Cresc. receita',
    accessorKey: 'revenueGrowth',
    sortDescFirst: true,
    cell: ({ row }) => formatPercent(row.original.revenueGrowth),
    meta: { align: 'right', label: 'Cresc. receita' },
  },
  {
    id: 'debt',
    header: 'Dív. líq./EBITDA',
    accessorKey: 'netDebtEbitda',
    sortDescFirst: true,
    cell: ({ row }) => formatMultiple(row.original.netDebtEbitda),
    meta: { align: 'right', label: 'Dív. líq./EBITDA' },
  },
];

const selectable = columns
  .filter((c) => c.meta?.label)
  .map((c) => ({ id: c.id!, label: c.meta!.label! }));

const ordinalF = (n: number) => (n === 1 ? '' : `${n}ª `);
const ordinalM = (n: number) => (n === 1 ? '' : `${n}º `);

export function peersLead(peers: PeerRow[]) {
  const r = peerRanks(peers);
  const parts = [`${r.self.ticker} tem a ${ordinalF(r.scoreRankFromBottom)}menor classificação`];
  if (r.peRankFromTop) parts[0] += ` e o ${ordinalM(r.peRankFromTop)}maior P/L do grupo`;
  if (r.avg && r.self.dividendYield !== null && r.avg.dividendYield !== null) {
    const cmp = r.self.dividendYield >= r.avg.dividendYield ? 'acima' : 'abaixo';
    parts.push(
      `o DY (${formatPercent(r.self.dividendYield, { sign: false })}) fica ${cmp} da média (${formatPercent(r.avg.dividendYield, { sign: false })})`,
    );
  }
  return `${parts.join('; ')}.`;
}

export function Peers({ peers }: { peers: PeerRow[] }) {
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const r = peerRanks(peers);
  return (
    <Section
      id="pares"
      title="Pares"
      lead={peersLead(peers)}
      actions={
        <ColumnSelector
          tableLabel="pares"
          columns={selectable}
          visibility={visibility}
          onChange={setVisibility}
        />
      }
    >
      <DataTable
        caption={`${r.self.ticker} comparada a ${r.peersCount} pares e à média do setor`}
        columns={columns}
        data={peers}
        getRowId={(p) => p.ticker}
        getRowVariant={(p) =>
          p.kind === 'self' ? 'highlight' : p.kind === 'avg' ? 'average' : undefined
        }
        initialSorting={[{ id: 'score', desc: true }]}
        columnVisibility={visibility}
        onColumnVisibilityChange={setVisibility}
        minWidth={900}
      />
      <p className="mt-3 max-w-[720px] text-small text-secondary-foreground">
        N/A: lucro negativo em 12 meses. —: sem proventos no período. Market cap em R$.
      </p>
    </Section>
  );
}
