'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ChevronLeft, FileSpreadsheet, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/painel/data-table';
import { Monogram } from '@/components/painel/monogram';
import { PageHeader } from '@/components/painel/page-header';
import { Button } from '@/components/ui/button';
import type { ImportPreview, ParsedPosition } from '@/lib/contracts';
import { formatBRL, formatDate, formatInteger, formatNumber, MONTHS } from '@/lib/format';
import { diffPositions, formatFileSize, validateFile, type PositionChange } from '@/lib/import';
import { mockImportParser, septemberPositions } from '@/lib/mock/import';
import { Dropzone } from './dropzone';
import { Steps } from './steps';

type Row = { position: ParsedPosition; change: PositionChange; included: boolean };

function ChangeLabel({ change }: { change: PositionChange }) {
  if (change.kind === 'unchanged')
    return <span className="text-caption font-normal text-muted-foreground">sem mudança</span>;
  const text =
    change.kind === 'new'
      ? 'nova posição'
      : change.kind === 'quantity'
        ? `quantidade ${change.delta > 0 ? '+' : '−'}${formatInteger(Math.abs(change.delta))}`
        : 'valor atualizado';
  return (
    <span className="text-caption font-semibold text-foreground">
      <span aria-hidden="true">● </span>
      {text}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 border-b border-border-subtle">
      <dt className="text-small text-secondary-foreground">{label}</dt>
      <dd className="tnum text-small font-semibold">{value}</dd>
    </div>
  );
}

export function ImportWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const diff = useMemo(
    () => (preview ? diffPositions(septemberPositions, preview.positions) : null),
    [preview],
  );
  const rows: Row[] = useMemo(
    () => diff?.rows.map((r) => ({ ...r, included: !excluded.has(r.position.ticker) })) ?? [],
    [diff, excluded],
  );
  const included = rows.filter((r) => r.included);
  const total = included.reduce((s, r) => s + r.position.marketValue, 0);
  const monthName = preview ? MONTHS[Number(preview.referenceDate.slice(5, 7)) - 1]! : '';
  const prevMonth = preview ? MONTHS[(Number(preview.referenceDate.slice(5, 7)) + 10) % 12]! : '';

  const onFile = async (file: File) => {
    const check = validateFile(file);
    if (!check.ok) {
      toast.error(check.title, { description: check.detail });
      return;
    }
    setBusy(true);
    try {
      const p = await mockImportParser.parse({ name: file.name, size: file.size });
      setPreview(p);
      setExcluded(new Set());
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (ticker: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });

  const confirm = () => {
    toast.success('Carteira atualizada', {
      description: `${included.length} posições de ${monthName} foram consolidadas.`,
    });
    setStep(4);
  };

  const columns: ColumnDef<Row, unknown>[] = [
    {
      id: 'incluir',
      header: () => <span className="sr-only">Incluir</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.original.included}
          onChange={() => toggle(row.original.position.ticker)}
          aria-label={`Incluir ${row.original.position.ticker}`}
          className="size-[18px] cursor-pointer accent-[var(--accent)]"
        />
      ),
    },
    {
      id: 'ativo',
      header: 'Ativo',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-3">
          <Monogram ticker={row.original.position.ticker} className="size-7 text-[9px]" />
          <span className="flex flex-col gap-px">
            <span className="tnum font-semibold">{row.original.position.ticker}</span>
            <span className="text-caption font-normal text-muted-foreground">
              {row.original.position.name}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'classe',
      header: 'Classe',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-secondary-foreground">{row.original.position.assetClass}</span>
      ),
    },
    {
      id: 'quantidade',
      header: 'Quantidade',
      enableSorting: false,
      cell: ({ row }) => formatInteger(row.original.position.quantity),
      meta: { align: 'right' },
    },
    {
      id: 'valor',
      header: 'Valor',
      enableSorting: false,
      cell: ({ row }) => formatNumber(row.original.position.marketValue),
      meta: { align: 'right' },
    },
    {
      id: 'mudanca',
      header: `Comparado a ${prevMonth}`,
      enableSorting: false,
      cell: ({ row }) => <ChangeLabel change={row.original.change} />,
    },
  ];

  const back = (
    <Link
      href="/carteira"
      className="inline-flex min-h-8 items-center gap-1 self-start text-small text-secondary-foreground no-underline hover:text-foreground"
    >
      <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
      Carteira
    </Link>
  );

  if (step === 1 || !preview || !diff) {
    return (
      <>
        <header className="flex flex-col gap-5">
          {back}
          <Steps current={1} />
          <PageHeader
            title="Envie o relatório mensal da B3."
            summary="Na Área do Investidor: Relatórios → Consolidado mensal. Nada muda na carteira até você confirmar."
          />
        </header>
        <Dropzone onFile={onFile} busy={busy} />
      </>
    );
  }

  const fileCard = (
    <div className="flex items-center gap-3 rounded-lg bg-surface-raised px-4 py-3.5">
      <FileSpreadsheet
        aria-hidden="true"
        className="size-5 flex-none text-secondary-foreground"
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-small font-semibold">{preview.fileName}</p>
        <p className="text-caption font-normal text-secondary-foreground">
          {preview.reportType} · {formatDate(preview.referenceDate)} ·{' '}
          {formatFileSize(preview.fileSize)}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
        Trocar arquivo
      </Button>
    </div>
  );

  if (step === 2) {
    return (
      <>
        <header className="flex flex-col gap-5">
          {back}
          <Steps current={2} />
          <PageHeader
            title={`Encontramos ${preview.positions.length} posições no relatório de ${monthName}.`}
            summary="Confira antes de atualizar a carteira. Nada muda até você confirmar."
          />
        </header>
        {fileCard}
        <div className="flex flex-wrap items-start gap-12">
          <div className="min-w-0 flex-[3_1_560px]">
            <DataTable
              caption="Posições encontradas no relatório"
              columns={columns}
              data={rows}
              getRowId={(r) => r.position.ticker}
              minWidth={720}
            />
          </div>
          <aside
            aria-label="Resumo da importação"
            className="flex min-w-0 flex-[1_1_260px] flex-col gap-4"
          >
            <span className="text-caption text-secondary-foreground">Resumo da importação</span>
            <dl>
              <SummaryRow label="Posições" value={String(included.length)} />
              <SummaryRow
                label="Novas"
                value={String(included.filter((r) => r.change.kind === 'new').length)}
              />
              <SummaryRow
                label="Alteradas"
                value={String(
                  included.filter((r) => r.change.kind === 'quantity' || r.change.kind === 'value')
                    .length,
                )}
              />
              <SummaryRow label="Patrimônio após importar" value={formatBRL(total)} />
            </dl>
            {preview.warnings.map((w) => (
              <div
                key={w.title}
                role="note"
                className="flex items-start gap-3 rounded-lg px-4 py-3.5"
                style={{ background: 'color-mix(in oklab, var(--warning) 14%, var(--background))' }}
              >
                <TriangleAlert
                  aria-hidden="true"
                  className="mt-px size-[18px] flex-none text-warning"
                  strokeWidth={2}
                />
                <div>
                  <p className="text-small font-semibold">{w.title}</p>
                  <p className="text-small text-secondary-foreground">{w.detail}</p>
                </div>
              </div>
            ))}
          </aside>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
          <Button variant="ghost" onClick={() => setStep(1)}>
            <ChevronLeft aria-hidden="true" strokeWidth={1.75} />
            Voltar
          </Button>
          <Button onClick={() => setStep(3)} disabled={included.length === 0}>
            Continuar para confirmação
          </Button>
        </div>
      </>
    );
  }

  if (step === 3) {
    return (
      <>
        <header className="flex flex-col gap-5">
          {back}
          <Steps current={3} />
          <PageHeader
            title={`Atualizar a carteira com ${included.length} posições de ${monthName}?`}
            summary={`O snapshot de ${monthName} substitui o anterior, se houver. Reimportar o mesmo arquivo não duplica dados.`}
          />
        </header>
        {fileCard}
        <dl className="max-w-[480px]">
          <SummaryRow label="Data de referência" value={formatDate(preview.referenceDate)} />
          <SummaryRow label="Posições" value={String(included.length)} />
          <SummaryRow
            label="Novas"
            value={String(included.filter((r) => r.change.kind === 'new').length)}
          />
          <SummaryRow
            label="Alteradas"
            value={String(
              included.filter((r) => r.change.kind === 'quantity' || r.change.kind === 'value')
                .length,
            )}
          />
          <SummaryRow label="Patrimônio após importar" value={formatBRL(total)} />
        </dl>
        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
          <Button variant="ghost" onClick={() => setStep(2)}>
            <ChevronLeft aria-hidden="true" strokeWidth={1.75} />
            Voltar
          </Button>
          <Button onClick={confirm}>Atualizar carteira</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-5">
        {back}
        <Steps current={4} />
        <PageHeader
          title="Carteira atualizada."
          summary={`${included.length} posições de ${monthName} foram consolidadas. Patrimônio: ${formatBRL(total)}.`}
          actions={
            <Button asChild>
              <Link href="/carteira">Ver carteira</Link>
            </Button>
          }
        />
      </header>
      <div className="md:hidden">
        <Button asChild>
          <Link href="/carteira">Ver carteira</Link>
        </Button>
      </div>
    </>
  );
}
