'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { FileText } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { DataTable } from '@/components/painel/data-table';
import { Delta } from '@/components/painel/delta';
import { EmptyState } from '@/components/painel/empty-state';
import { PeriodTabs } from '@/components/painel/period-tabs';
import { Section } from '@/components/painel/section';
import { Sparkline } from '@/components/painel/sparkline';
import type { IncomeStatementQuarterly } from '@/lib/contracts';
import { formatNumber, formatPercent } from '@/lib/format';
import { annualize, dreLines, lastChange, type DreLine } from '@/lib/fundamentals';
import { cn } from '@/lib/utils';

type Statement = 'dre' | 'balanco' | 'fluxo';
const TABS: { id: Statement; label: string }[] = [
  { id: 'dre', label: 'DRE' },
  { id: 'balanco', label: 'Balanço' },
  { id: 'fluxo', label: 'Fluxo de Caixa' },
];

function fmt(line: DreLine, v: number) {
  return line.percent ? formatPercent(v, { sign: false, decimals: 1 }) : formatNumber(v, 1);
}

export function Statements({ statement }: { statement: IncomeStatementQuarterly }) {
  const [period, setPeriod] = useState<'trimestral' | 'anual'>('trimestral');
  const [tab, setTab] = useState<Statement>('dre');
  const data = period === 'anual' ? annualize(statement) : statement;
  const lines = useMemo(() => dreLines(data), [data]);
  const prevLabel = data.quarters[data.quarters.length - 2];
  const lastLabel = data.quarters[data.quarters.length - 1];

  const columns = useMemo<ColumnDef<DreLine, unknown>[]>(
    () => [
      {
        id: 'conta',
        header: 'R$ bi',
        accessorKey: 'label',
        enableSorting: false,
        cell: ({ row }) => (
          <span className={row.original.subtotal ? 'font-semibold' : 'font-normal'}>
            {row.original.label}
          </span>
        ),
      },
      ...data.quarters.map<ColumnDef<DreLine, unknown>>((q, i) => ({
        id: q,
        header: q,
        enableSorting: false,
        accessorFn: (r) => r.values[i],
        cell: ({ row }) => {
          const text = fmt(row.original, row.original.values[i]!);
          return i === data.quarters.length - 1 ? (
            <span className="font-semibold">{text}</span>
          ) : (
            text
          );
        },
        meta: { align: 'right' },
      })),
      {
        id: 'tendencia',
        header: 'Tendência',
        enableSorting: false,
        cell: ({ row }) => <Sparkline values={row.original.values} />,
      },
      {
        id: 'tt',
        header: period === 'anual' ? 'a/a' : 't/t',
        enableSorting: false,
        cell: ({ row }) => {
          const c = lastChange(row.original);
          return <Delta value={c.value} format={c.unit === 'pp' ? 'pp' : 'percent'} decimals={1} />;
        },
        meta: { align: 'right' },
      },
    ],
    [data, period],
  );

  const onTabKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = TABS[(i + d + TABS.length) % TABS.length]!;
    setTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <Section
      id="demonstrativos"
      title="Demonstrativos"
      actions={
        <PeriodTabs
          label="Periodicidade"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'trimestral', label: 'Trimestral' },
            { value: 'anual', label: 'Anual' },
          ]}
        />
      }
    >
      <div
        role="tablist"
        aria-label="Demonstrativo"
        className="flex gap-7 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)]"
      >
        {TABS.map((t, i) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`painel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                'min-h-11 flex-none cursor-pointer px-0.5 text-body',
                on
                  ? 'font-semibold text-foreground shadow-[inset_0_-2px_0_var(--accent)]'
                  : 'font-medium text-secondary-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div id={`painel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-2">
        {tab === 'dre' ? (
          <>
            <DataTable
              caption={`DRE ${period} em R$ bi`}
              columns={columns}
              data={lines}
              getRowId={(r) => r.id}
              minWidth={period === 'anual' ? 560 : 1000}
            />
            <p className="mt-3 max-w-[720px] text-small text-secondary-foreground">
              {period === 'anual' ? 'a/a' : 't/t'}: {lastLabel} contra {prevLabel}; margem em pontos
              percentuais.
              {period === 'anual' && ' 12M = últimos quatro trimestres.'}
            </p>
          </>
        ) : (
          <EmptyState
            className="mt-4"
            icon={<FileText className="size-6" strokeWidth={1.75} />}
            title={`${tab === 'balanco' ? 'Balanço' : 'Fluxo de Caixa'} ainda não disponível`}
            description="Os demonstrativos da CVM (DFP/ITR) entram com a ingestão de dados da fase 2."
          />
        )}
      </div>
    </Section>
  );
}
