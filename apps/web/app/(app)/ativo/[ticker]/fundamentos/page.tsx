import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AssetHeader } from '@/components/ativo/asset-header';
import { AssetTabs } from '@/components/ativo/asset-tabs';
import { Peers } from '@/components/fundamentos/peers';
import { RevenueProfitChart } from '@/components/fundamentos/revenue-profit-chart';
import { Statements } from '@/components/fundamentos/statements';
import { ChartSection } from '@/components/painel/chart-section';
import { EmptyState } from '@/components/painel/empty-state';
import { Highlight } from '@/components/painel/page-header';
import { formatNumber, formatPercent } from '@/lib/format';
import { ebitda, lossQuarter, netMargin, revenueGrowth12m } from '@/lib/fundamentals';
import { getAssetRepository } from '@/lib/repositories';

type Props = { params: Promise<{ ticker: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ticker = decodeURIComponent((await params).ticker).toUpperCase();
  return { title: `${ticker} · Fundamentos` };
}

const bi = (v: number) => `${v < 0 ? '−' : ''}R$ ${formatNumber(Math.abs(v), 1)} bi`;

export default async function FundamentalsPage({ params }: Props) {
  const ticker = decodeURIComponent((await params).ticker).toUpperCase();
  const repo = getAssetRepository();
  const asset = await repo.getAsset(ticker);
  if (!asset) notFound();
  const [statement, peers] = await Promise.all([
    repo.getIncomeStatement(ticker),
    repo.getPeers(ticker),
  ]);

  if (!statement) {
    return (
      <>
        <AssetHeader asset={asset} compact />
        <AssetTabs ticker={asset.ticker} current="fundamentos" />
        <EmptyState
          title="Demonstrativos ainda não disponíveis"
          description={`Os dados de exemplo trazem DRE e pares só para VALE3. Os de ${asset.ticker} chegam com a ingestão da CVM.`}
        />
      </>
    );
  }

  const margins = netMargin(statement);
  const growth = revenueGrowth12m(statement);
  const firstQ = statement.quarters[0]!;
  const lastQ = statement.quarters[statement.quarters.length - 1]!;
  const firstM = margins[0]!;
  const lastM = margins[margins.length - 1]!;
  const loss = lossQuarter(statement);
  const lastEbitda = ebitda(statement).at(-1)!;
  const stable = Math.abs(growth) < 3;

  return (
    <>
      <AssetHeader asset={asset} compact />
      <AssetTabs ticker={asset.ticker} current="fundamentos" />
      <h2 className="max-w-[900px] font-serif text-[26px] leading-[1.2] tracking-[-0.01em] md:text-h1">
        A receita ficou {stable ? 'estável' : growth > 0 ? 'maior' : 'menor'} (
        <Highlight tone={growth >= 0 ? 'positive' : 'negative'}>
          {formatPercent(growth, { decimals: 1 })}
        </Highlight>{' '}
        em 12 meses), mas o lucro {lastM < firstM ? 'encolheu' : 'cresceu'}: a margem líquida{' '}
        {lastM < firstM ? 'caiu' : 'subiu'} de {formatNumber(firstM, 1)}% no {firstQ} para{' '}
        {formatNumber(lastM, 1)}% no {lastQ}.
      </h2>

      <ChartSection
        id="receita-lucro"
        title="Receita e lucro por trimestre"
        subtitle="R$ bi"
        lead={
          loss
            ? `O prejuízo do ${loss.quarter} veio do resultado financeiro (${bi(loss.financial)}), não da operação: o EBITDA do trimestre foi de ${bi(loss.ebitda)}.`
            : undefined
        }
        help={{
          subject: 'o gráfico de receita e lucro',
          howTo:
            'Barras cinza: receita líquida; âmbar: lucro líquido (coral quando negativo). Linha: margem líquida, no eixo à direita.',
          insights: [
            {
              title: `Margem no ${lastQ}: ${formatNumber(lastM, 1)}%`,
              detail: `Contra ${formatNumber(firstM, 1)}% no ${firstQ}.`,
            },
            {
              title: `EBITDA no ${lastQ}: ${bi(lastEbitda)}`,
              detail: 'Lucro bruto + despesas operacionais + depreciação.',
            },
          ],
          askLabel: 'Perguntar sobre receita e lucro',
          askContext: [asset.ticker, 'Receita e lucro'],
        }}
      >
        <RevenueProfitChart statement={statement} />
      </ChartSection>

      <Statements statement={statement} />

      {peers.length > 0 && <Peers peers={peers} />}
    </>
  );
}
