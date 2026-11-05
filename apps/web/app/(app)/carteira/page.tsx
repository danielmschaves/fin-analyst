import { MoreHorizontal } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Allocation } from '@/components/carteira/allocation';
import { Dividends } from '@/components/carteira/dividends';
import { EvolutionSection } from '@/components/carteira/evolution-section';
import { MonthChanges } from '@/components/carteira/month-changes';
import { Positions } from '@/components/carteira/positions';
import { Delta } from '@/components/painel/delta';
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

export const metadata: Metadata = { title: 'Carteira' };

const pct1 = (v: number) => formatPercent(v, { decimals: 1 });

export default async function CarteiraPage() {
  const s = await getPortfolioRepository().getSummary();
  const [year, month, day] = s.referenceDate.split('-');
  const monthName = MONTHS[Number(month) - 1]!;
  const monthTitle = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const total = totalValue(s.positions);
  const classes = allocationByClass(s.positions);
  const cdi = cdi12m(s);
  const vsCdiMonth = s.month.returnPct >= s.month.cdiPct ? 'acima do CDI' : 'abaixo do CDI';
  const diff12 = Math.round((s.return12mPct - cdi) * 10) / 10;
  const sameSide = s.month.returnPct >= s.month.cdiPct === diff12 >= 0;
  const points = evolutionSeries(s.history);
  const monthLabel = `Carteira · ${monthName.slice(0, 3)}/${year}`;

  return (
    <>
      <PageHeader
        eyebrow={`${monthTitle} de ${year} · posição em ${day}/${month}`}
        title={
          <>
            Sua carteira rendeu{' '}
            <Highlight tone={s.month.returnPct >= 0 ? 'positive' : 'negative'}>
              {formatPercent(s.month.returnPct)}
            </Highlight>{' '}
            em {monthName}, {vsCdiMonth}.
          </>
        }
        summary={`Em 12 meses, ${sameSide ? 'também' : 'porém'}, ficou ${formatNumber(Math.abs(diff12), 1)} p.p. ${
          diff12 >= 0 ? 'acima' : 'abaixo'
        } dele: ${pct1(s.return12mPct)} contra ${pct1(cdi)}.`}
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
            value: (
              <>
                {s.month.result >= 0 ? '+' : '−'}
                <Unit>R$</Unit>
                {formatNumber(Math.abs(s.month.result))}
              </>
            ),
            shortNote: <Delta value={s.month.returnPct} context="no mês" />,
            note: (
              <>
                <Delta value={s.month.returnPct} context="no mês" />{' '}
                <span className="text-muted-foreground">· CDI {formatPercent(s.month.cdiPct)}</span>
              </>
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

      <EvolutionSection points={points} history={s.history} monthLabel={monthLabel} />

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
