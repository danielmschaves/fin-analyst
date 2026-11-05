import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Delta } from '@/components/painel/delta';
import { Monogram } from '@/components/painel/monogram';
import { Unit } from '@/components/painel/stat-row';
import type { AssetDetail } from '@/lib/contracts';
import { formatDate, formatNumber } from '@/lib/format';

export function AssetHeader({
  asset,
  lead,
  compact = false,
}: {
  asset: AssetDetail;
  lead?: ReactNode;
  /** Cabeçalho menor (fundamentos): monograma 40 px e preço 28 px. */
  compact?: boolean;
}) {
  const subtitle = [asset.sector, asset.industry].filter(Boolean).join(' · ');
  return (
    <header className="flex flex-col gap-5">
      <Link
        href="/carteira"
        className="hidden min-h-8 items-center gap-1 self-start text-small text-secondary-foreground no-underline hover:text-foreground md:inline-flex"
      >
        <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Carteira
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <Monogram ticker={asset.ticker} size={compact ? 'md' : 'lg'} />
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <h1 className="text-[22px] leading-[1.3] font-semibold tracking-[-0.01em] md:text-[24px]">
                {asset.legalName}
              </h1>
              <span className="tnum text-small font-semibold text-secondary-foreground">
                {asset.ticker}
              </span>
            </div>
            {subtitle && <p className="text-small text-secondary-foreground">{subtitle}</p>}
          </div>
        </div>
        {asset.quote && (
          <div className="flex flex-col items-start gap-1 md:items-end">
            <p
              className={
                compact
                  ? 'tnum text-kpi'
                  : 'tnum text-[36px] leading-none font-semibold tracking-[-0.03em] md:text-[44px]'
              }
            >
              <Unit>R$</Unit>
              {formatNumber(asset.quote.price)}
            </p>
            <span className="inline-flex items-center gap-2">
              <Delta value={asset.quote.dayChangePct} context="no dia" className="text-small" />
              <span className="text-caption text-muted-foreground">
                no dia · {formatDate(asset.quote.date)}
              </span>
            </span>
          </div>
        )}
      </div>
      {lead && (
        <p className="max-w-[820px] font-serif text-[26px] leading-[1.2] tracking-[-0.01em] md:text-h1">
          {lead}
        </p>
      )}
    </header>
  );
}
