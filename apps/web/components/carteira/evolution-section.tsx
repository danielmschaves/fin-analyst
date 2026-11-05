'use client';

import { useState } from 'react';
import { ChartHelp } from '@/components/painel/chart-help';
import { PeriodTabs } from '@/components/painel/period-tabs';
import { Section } from '@/components/painel/section';
import { formatMonthShort, formatPercent, formatPP } from '@/lib/format';
import {
  maxGapToCdi,
  monthName,
  monthsAboveCdi,
  rebase,
  worstMonth,
  type EvolutionPoint,
} from '@/lib/portfolio';
import type { PortfolioHistory } from '@/lib/contracts';
import { useIsMobile } from '@/lib/use-media';
import { EvolutionChart } from './evolution-chart';

type Period = '6M' | '12M' | 'inicio';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const join = (items: string[]) =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;

export function EvolutionSection({
  points,
  history,
  monthLabel,
  askQuestion,
}: {
  points: EvolutionPoint[];
  history: PortfolioHistory;
  monthLabel: string;
  /** Pergunta sugerida ao abrir o assistente a partir do gráfico. */
  askQuestion?: string;
}) {
  const [period, setPeriod] = useState<Period>('12M');
  const mobile = useIsMobile();
  const shown = period === '6M' ? rebase(points, points.length - 7) : points;

  const gap = maxGapToCdi(points);
  const above = monthsAboveCdi(points);
  const worst = worstMonth(history.portfolioCumulative);
  const worstIbov = worstMonth(history.ibovCumulative);
  const short = (i: number) => monthName(history.startDate, i).slice(0, 3);
  const steadier = Math.abs(worst.returnPct) < Math.abs(worstIbov.returnPct);

  return (
    <Section
      id="evolucao"
      title={mobile ? 'Evolução 12M' : 'Evolução em 12 meses'}
      subtitle={mobile ? undefined : 'Rentabilidade acumulada'}
      actions={
        <>
          {!mobile && (
            <PeriodTabs
              value={period}
              onChange={setPeriod}
              options={[
                { value: '6M', label: '6M' },
                { value: '12M', label: '12M' },
                { value: 'inicio', label: 'Desde o início' },
              ]}
            />
          )}
          <ChartHelp
            subject="a evolução em 12 meses"
            howTo={`Rentabilidade acumulada desde ${formatMonthShort(points[0]!.date)}. Linha âmbar: sua carteira; tracejada: CDI; cinza: Ibovespa.`}
            insights={[
              {
                title: `Maior distância do CDI: ${formatPP(gap.gapPP)}`,
                detail: `Em ${monthName(history.startDate, gap.index)}, ${formatPercent(gap.carteira, { decimals: 1 })} contra ${formatPercent(gap.cdi, { decimals: 1 })} do CDI.`,
              },
              {
                title: `Acima do CDI em ${above.length} de ${points.length - 1} meses`,
                detail: `${cap(join(above.map((i) => monthName(history.startDate, i))))}.`,
              },
              {
                title: steadier ? 'Oscila menos que o Ibovespa' : 'Oscila mais que o Ibovespa',
                detail: `Pior mês: ${formatPercent(worst.returnPct, { decimals: 1 })} (${short(worst.index)}), contra ${formatPercent(worstIbov.returnPct, { decimals: 1 })} do índice (${short(worstIbov.index)}).`,
              },
            ]}
            askLabel="Perguntar sobre a evolução"
            askContext={[monthLabel, 'Evolução 12M']}
            askQuestion={askQuestion}
          />
        </>
      }
    >
      <EvolutionChart points={shown} compact={mobile} />
    </Section>
  );
}
