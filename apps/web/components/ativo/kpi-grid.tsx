import type { ReactNode } from 'react';
import { ChartHelp } from '@/components/painel/chart-help';
import { Section } from '@/components/painel/section';
import { Unit } from '@/components/painel/stat-row';
import type { AssetKpis } from '@/lib/contracts';
import { formatCompact, formatNumber, formatPercent } from '@/lib/format';

type Kpi = { label: string; value: ReactNode; note?: string; howTo: string };

function buildKpis(k: AssetKpis, sector: Partial<AssetKpis> | null): Kpi[] {
  const pct = (v: number) => (
    <>
      {formatNumber(v, 2)}
      <Unit>%</Unit>
    </>
  );
  const peNote =
    k.pe !== null && sector?.pe && k.pe > sector.pe * 1.5
      ? `lucro de 12M está baixo; setor: ${formatNumber(sector.pe)}`
      : sector?.pe
        ? `setor: ${formatNumber(sector.pe)}`
        : undefined;
  return [
    {
      label: 'Market cap',
      value: (
        <>
          <Unit>R$</Unit>
          {formatCompact(k.marketCap)}
        </>
      ),
      howTo: 'Valor de mercado: preço da ação multiplicado pelo número de ações.',
    },
    {
      label: 'Volume médio 3M',
      value: formatCompact(k.avgVolume3m),
      howTo: 'Média diária de ações negociadas nos últimos 3 meses. Indica a liquidez do papel.',
    },
    {
      label: 'Beta',
      value: formatNumber(k.beta),
      note: k.beta < 1 ? 'oscila menos que o Ibovespa' : 'oscila mais que o Ibovespa',
      howTo: 'Sensibilidade do preço ao Ibovespa. Abaixo de 1, a ação oscila menos que o índice.',
    },
    {
      label: 'DY',
      value: pct(k.dividendYield),
      note:
        sector?.dividendYield !== undefined
          ? `setor: ${formatPercent(sector.dividendYield, { sign: false })}`
          : undefined,
      howTo: 'Dividend yield: proventos pagos em 12 meses divididos pelo preço atual.',
    },
    {
      label: 'Crescimento de receita',
      value: (
        <>
          {formatNumber(k.revenueGrowth, 2, { sign: true })}
          <Unit>%</Unit>
        </>
      ),
      note:
        sector?.revenueGrowth !== undefined
          ? `setor: ${formatPercent(sector.revenueGrowth)}`
          : undefined,
      howTo: 'Receita dos últimos 12 meses contra os 12 meses anteriores.',
    },
    {
      label: 'P/L',
      value: k.pe === null ? 'N/A' : formatNumber(k.pe),
      note: peNote,
      howTo: 'Preço dividido pelo lucro por ação de 12 meses. Fica alto quando o lucro cai.',
    },
    {
      label: 'P/VP',
      value: formatNumber(k.pb),
      howTo: 'Preço dividido pelo valor patrimonial por ação.',
    },
    {
      label: 'ROE',
      value: pct(k.roe),
      note:
        sector?.roe !== undefined
          ? `setor: ${formatPercent(sector.roe, { sign: false })}`
          : undefined,
      howTo: 'Retorno sobre o patrimônio: lucro de 12 meses dividido pelo patrimônio líquido.',
    },
  ];
}

export function KpiGrid({
  ticker,
  kpis,
  sector,
}: {
  ticker: string;
  kpis: AssetKpis;
  sector: Partial<AssetKpis> | null;
}) {
  return (
    <Section id="resumo" title="Indicadores" subtitle="Últimos 12 meses · comparados ao setor">
      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] sm:gap-x-8">
        {buildKpis(kpis, sector).map((k) => (
          <div key={k.label} className="flex min-w-0 flex-col gap-1.5 border-t border-border py-4">
            <div className="flex items-center gap-2">
              <span className="text-caption text-secondary-foreground">{k.label}</span>
              <ChartHelp
                subject={k.label}
                howTo={k.howTo}
                askLabel={`Perguntar sobre ${k.label}`}
                askContext={[ticker, k.label]}
              />
            </div>
            <p className="tnum text-[22px] leading-[1.05] font-semibold tracking-[-0.02em] md:text-[24px]">
              {k.value}
            </p>
            {k.note && (
              <span className="text-caption font-normal text-muted-foreground">{k.note}</span>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
