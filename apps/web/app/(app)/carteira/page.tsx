import { MoreHorizontal } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Allocation } from '@/components/carteira/allocation';
import { Dividends } from '@/components/carteira/dividends';
import { EvolutionSection } from '@/components/carteira/evolution-section';
import { MonthChanges } from '@/components/carteira/month-changes';
import { Positions } from '@/components/carteira/positions';
import { Delta } from '@/components/painel/delta';
import { EmptyState } from '@/components/painel/empty-state';
import { Highlight, PageHeader } from '@/components/painel/page-header';
import { StatRow, Unit } from '@/components/painel/stat-row';
import { IconImportar } from '@/components/shell/icons';
import { Button } from '@/components/ui/button';
import { formatInteger, formatNumber, formatPercent, MONTHS } from '@/lib/format';
import {
  allocationByClass,
  annualDividendsEstimate,
  cdi12m,
  dividendsShareOfResult,
  dividendsTotal,
  evolutionSeries,
  totalValue,
} from '@/lib/portfolio';
import { getPortfolioRepository } from '@/lib/repositories';
import { getRequestContext } from '@/lib/session';

export const metadata: Metadata = { title: 'Carteira' };

const pct1 = (v: number) => formatPercent(v, { decimals: 1 });

export default async function CarteiraPage() {
  const s = await getPortfolioRepository().getSummary(await getRequestContext());
  const [year, month, day] = s.referenceDate.split('-');
  const m = s.month;
  const monthName = MONTHS[Number(month) - 1]!;
  const monthTitle = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const total = totalValue(s.positions);
  const classes = allocationByClass(s.positions);
  const cdi = cdi12m(s);
  const diff12 = Math.round((s.return12mPct - cdi) * 10) / 10;
  const points = evolutionSeries(s.history);
  const monthLabel = `Carteira · ${monthName.slice(0, 3)}/${year}`;

  if (s.positions.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Carteira" title="Nenhuma posição ainda." />
        <EmptyState
          title="Nenhuma posição ainda"
          description="Importe o relatório mensal da B3 para montar sua carteira."
          action={
            <Button asChild size="sm">
              <Link href="/importar">
                <IconImportar width={16} height={16} />
                Importar relatório
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const vsCdiMonth = m && (m.returnPct >= m.cdiPct ? 'acima do CDI' : 'abaixo do CDI');
  const sameSide = m ? m.returnPct >= m.cdiPct === diff12 >= 0 : true;

  return (
    <>
      <PageHeader
        eyebrow={`${monthTitle} de ${year} · posição em ${day}/${month}`}
        title={
          m ? (
            <>
              Sua carteira rendeu{' '}
              <Highlight tone={m.returnPct >= 0 ? 'positive' : 'negative'}>
                {formatPercent(m.returnPct)}
              </Highlight>{' '}
              em {monthName}, {vsCdiMonth}.
            </>
          ) : (
            `Sua carteira tem ${s.positions.length} posições em ${monthName}.`
          )
        }
        summary={
          m
            ? `Em 12 meses, ${sameSide ? 'também' : 'porém'}, ficou ${formatNumber(Math.abs(diff12), 1)} p.p. ${
                diff12 >= 0 ? 'acima' : 'abaixo'
              } dele: ${pct1(s.return12mPct)} contra ${pct1(cdi)}.`
            : 'Primeiro mês importado: resultado e rentabilidade aparecem a partir do segundo relatório.'
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Mais ações: exportar, histórico de importações"
              disabled
              title="Em breve"
            >
              <MoreHorizontal strokeWidth={1.75} />
            </Button>
            <Button asChild>
              <Link href="/importar">
                <IconImportar width={16} height={16} />
                Importar relatório
              </Link>
            </Button>
          </>
        }
      />

      <StatRow
        label="Números do mês"
        stats={[
          {
            label: 'Patrimônio',
            size: 'display',
            value: (
              <>
                <Unit>R$</Unit>
                {formatNumber(total)}
              </>
            ),
            note: `${s.positions.length} posições em ${classes.length} classes`,
            shortNote: `${s.positions.length} posições`,
          },
          {
            label: 'Resultado no mês',
            shortLabel: 'Resultado',
            value: m ? (
              <>
                {m.result >= 0 ? '+' : '−'}
                <Unit>R$</Unit>
                {formatNumber(Math.abs(m.result))}
              </>
            ) : (
              '—'
            ),
            shortNote: m ? <Delta value={m.returnPct} context="no mês" /> : 'primeiro mês',
            note: m ? (
              <>
                <Delta value={m.returnPct} context="no mês" />{' '}
                <span className="text-muted-foreground">· CDI {formatPercent(m.cdiPct)}</span>
              </>
            ) : (
              'primeiro mês importado'
            ),
          },
          {
            label: 'Rentabilidade 12M',
            shortLabel: 'Rentab. 12M',
            shortNote: `CDI ${pct1(cdi)}`,
            value: (
              <>
                {formatNumber(s.return12mPct, 1, { sign: true })}
                <Unit>%</Unit>
              </>
            ),
            note: `CDI 12M: ${pct1(cdi)}`,
          },
          {
            label: 'DY da carteira',
            shortLabel: 'DY',
            shortNote: `≈ R$ ${formatInteger(annualDividendsEstimate(s))}/ano`,
            value: (
              <>
                {formatNumber(s.dividendYieldPct, 1)}
                <Unit>%</Unit>
              </>
            ),
            note: `≈ R$ ${formatInteger(annualDividendsEstimate(s))} por ano`,
          },
        ]}
      />

      <EvolutionSection
        points={points}
        history={s.history}
        monthLabel={monthLabel}
        askQuestion={
          m && m.returnPct > m.cdiPct && diff12 < 0
            ? `Por que fiquei abaixo do CDI em 12 meses se rendi mais que ele em ${monthName}?`
            : undefined
        }
      />

      <div className="flex flex-wrap items-start gap-14">
        <div className="min-w-0 flex-[1_1_380px]">
          <Allocation positions={s.positions} />
        </div>
        <div className="min-w-0 flex-[1_1_380px]">
          <MonthChanges positions={s.positions} monthName={monthName} />
        </div>
      </div>

      <Positions positions={s.positions} />

      <div className="flex flex-wrap items-start gap-14">
        <div className="min-w-0 flex-[1_1_380px]">
          <Dividends
            dividends={s.dividends}
            total={dividendsTotal(s)}
            shareOfResult={dividendsShareOfResult(s)}
            monthName={monthName}
          />
        </div>
        <div aria-hidden="true" className="hidden flex-[1_1_380px] lg:block" />
      </div>
    </>
  );
}
