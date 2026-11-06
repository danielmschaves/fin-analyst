import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AssetHeader } from '@/components/ativo/asset-header';
import { KpiGrid } from '@/components/ativo/kpi-grid';
import { MyPosition } from '@/components/ativo/my-position';
import { QuoteSection } from '@/components/ativo/quote-section';
import { ScoreSection } from '@/components/ativo/score-section';
import { SectionIndex } from '@/components/ativo/section-index';
import { Teaser } from '@/components/ativo/teaser';
import { EmptyState } from '@/components/painel/empty-state';
import { Highlight } from '@/components/painel/page-header';
import { formatPercent } from '@/lib/format';
import { getAssetRepository } from '@/lib/repositories';
import { getRequestContext } from '@/lib/session';

type Props = { params: Promise<{ ticker: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ticker = decodeURIComponent((await params).ticker).toUpperCase();
  const asset = await getAssetRepository().getAsset(await getRequestContext(), ticker);
  return { title: asset ? `${asset.ticker} · ${asset.legalName}` : 'Ativo não encontrado' };
}

export default async function AssetPage({ params }: Props) {
  const ticker = decodeURIComponent((await params).ticker).toUpperCase();
  const ctx = await getRequestContext();
  const repo = getAssetRepository();
  const asset = await repo.getAsset(ctx, ticker);
  if (!asset) notFound();
  const series = await repo.getPriceHistory(ctx, ticker);
  const r = asset.returns;

  const ytd = r?.YTD ?? null;
  const fiveYears = r?.['5A'] ?? null;
  const lead =
    ytd === null ? undefined : fiveYears === null ? (
      <>
        A {asset.name} acumula{' '}
        <Highlight tone={ytd >= 0 ? 'positive' : 'negative'}>{formatPercent(ytd)}</Highlight> no
        ano.
      </>
    ) : (
      <>
        A {asset.name} acumula{' '}
        <Highlight tone={ytd >= 0 ? 'positive' : 'negative'}>{formatPercent(ytd)}</Highlight> no
        ano, {Math.sign(ytd) === Math.sign(fiveYears) ? 'e' : 'mas segue'}{' '}
        <Highlight tone={fiveYears >= 0 ? 'positive' : 'negative'}>
          {formatPercent(fiveYears)}
        </Highlight>{' '}
        em 5 anos.
      </>
    );

  // Cotação aparece com preço, retornos e série; os indicadores, só quando houver kpis
  // (dados parciais: na PoC o modo db ainda não tem kpis).
  const hasQuote = Boolean(asset.quote && r && series.length);
  const hasMarket = hasQuote && Boolean(asset.kpis);

  return (
    <>
      <AssetHeader asset={asset} lead={lead} />
      <div className="flex items-start gap-10">
        {hasQuote && (
          <SectionIndex
            items={
              hasMarket
                ? [
                    { id: 'cotacao', label: 'Cotação' },
                    { id: 'resumo', label: 'Resumo' },
                    { id: 'fundamentos', label: 'Fundamentos' },
                    { id: 'pares', label: 'Pares' },
                  ]
                : [{ id: 'cotacao', label: 'Cotação' }]
            }
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-10 md:gap-12">
          {hasQuote ? (
            <>
              <QuoteSection ticker={asset.ticker} series={series} returns={r!} />
              {asset.kpis && (
                <KpiGrid ticker={asset.ticker} kpis={asset.kpis} sector={asset.sectorKpis} />
              )}
            </>
          ) : (
            <EmptyState
              title="Cotação e indicadores ainda não disponíveis"
              description={`Ainda não há cotações nem indicadores de ${asset.ticker}.${asset.position ? ' A sua posição aparece abaixo.' : ''}`}
            />
          )}
          {(asset.score !== null && asset.pillars.length > 0) || asset.position ? (
            <div className="flex flex-wrap items-start gap-14">
              {asset.score !== null && asset.pillars.length > 0 && (
                <div className="min-w-0 flex-[3_1_420px]">
                  <ScoreSection ticker={asset.ticker} score={asset.score} pillars={asset.pillars} />
                </div>
              )}
              {asset.position && (
                <div className="min-w-0 flex-[2_1_280px]">
                  <MyPosition
                    position={asset.position}
                    price={asset.quote?.price ?? null}
                    assetClass={asset.assetClass}
                  />
                </div>
              )}
            </div>
          ) : null}
          {hasMarket && (
            <div className="flex flex-wrap items-start gap-14">
              {asset.summaries.fundamentals && (
                <div className="min-w-0 flex-[1_1_300px]">
                  <Teaser
                    id="fundamentos"
                    title="Fundamentos"
                    lead={asset.summaries.fundamentals}
                    href={`/ativo/${asset.ticker}/fundamentos`}
                    cta="Ver DRE, Balanço e Fluxo de Caixa"
                  />
                </div>
              )}
              {asset.summaries.peers && (
                <div className="min-w-0 flex-[1_1_300px]">
                  <Teaser
                    id="pares"
                    title="Pares"
                    lead={asset.summaries.peers}
                    href={`/ativo/${asset.ticker}/fundamentos#pares`}
                    cta={`Comparar com ${asset.summaries.peersCount ?? ''} pares`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
