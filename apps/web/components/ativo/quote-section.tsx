'use client';

import { useState } from 'react';
import { ChartHelp } from '@/components/painel/chart-help';
import { Section } from '@/components/painel/section';
import { maxPoint, sliceWindow } from '@/lib/asset';
import type { PricePoint, ReturnWindow } from '@/lib/contracts';
import { formatBRL, formatNumber, MONTHS } from '@/lib/format';
import { PriceChart } from './price-chart';
import { ReturnsStrip } from './returns-strip';

const PERIOD_LABEL: Record<ReturnWindow, string> = {
  '5D': '5 dias',
  '1M': '1 mês',
  '6M': '6 meses',
  YTD: 'no ano',
  '1A': '1 ano',
  '2A': '2 anos',
  '5A': '5 anos',
};

/** Frase do gráfico de 1 ano: máxima, se devolveu a alta e onde está contra um ano atrás. */
export function quoteLead(yearSeries: PricePoint[], oneYearReturn: number | null) {
  const max = maxPoint(yearSeries);
  const first = yearSeries[0]!;
  const last = yearSeries[yearSeries.length - 1]!;
  const month = MONTHS[Number(max.date.slice(5, 7)) - 1];
  const gaveBack = last.close <= first.close ? 'devolveu toda a alta' : 'devolveu parte da alta';
  if (oneYearReturn === null) return `Subiu até ${formatBRL(max.close)} em ${month} e ${gaveBack}.`;
  const where = `está ${formatNumber(Math.abs(oneYearReturn), 1)}% ${oneYearReturn < 0 ? 'abaixo' : 'acima'} de um ano atrás`;
  return `Subiu até ${formatBRL(max.close)} em ${month} e ${gaveBack}; ${where}.`;
}

export function QuoteSection({
  ticker,
  series,
  returns,
  initialWindow = '1A',
}: {
  ticker: string;
  series: PricePoint[];
  returns: Record<ReturnWindow, number | null>;
  initialWindow?: ReturnWindow;
}) {
  const [window, setWindow] = useState<ReturnWindow>(initialWindow);
  const shown = sliceWindow(series, window);
  const fiveYears = returns['5A'];
  return (
    <Section
      id="cotacao"
      title="Cotação"
      lead={quoteLead(sliceWindow(series, '1A'), returns['1A'])}
      actions={
        <ChartHelp
          subject="o gráfico de preço"
          howTo="Preço de fechamento ajustado por proventos. Os retornos acima do gráfico também escolhem o período mostrado."
          insights={[
            {
              title: `Máxima em 1 ano: ${formatBRL(maxPoint(sliceWindow(series, '1A')).close)}`,
              detail: 'Marcada no gráfico com o mês.',
            },
            {
              title:
                fiveYears === null
                  ? 'Em 5 anos: sem histórico suficiente'
                  : `Em 5 anos: ${fiveYears >= 0 ? '+' : '−'}${formatNumber(Math.abs(fiveYears))}%`,
              detail: 'Retorno do preço, sem proventos.',
            },
          ]}
          askLabel="Perguntar sobre a cotação"
          askContext={[ticker, 'Cotação']}
        />
      }
    >
      <ReturnsStrip returns={returns} value={window} onChange={setWindow} />
      <div className="mt-5" data-testid="price-chart" data-window={window}>
        <PriceChart points={shown} ticker={ticker} periodLabel={PERIOD_LABEL[window]} />
      </div>
    </Section>
  );
}
