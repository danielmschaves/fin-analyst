import { CircleHelp } from 'lucide-react';
import Link from 'next/link';
import { Delta } from '@/components/painel/delta';
import { Section } from '@/components/painel/section';
import { IconImportar } from '@/components/shell/icons';
import { Button } from '@/components/ui/button';
import { positionResult, riseToAvgPrice } from '@/lib/asset';
import type { AssetClass, AssetPosition } from '@/lib/contracts';
import { formatBRL, formatInteger, formatNumber, formatPercent } from '@/lib/format';

const unitName: Record<AssetClass, [string, string]> = {
  Ação: ['ação', 'ações'],
  FII: ['cota', 'cotas'],
  'Renda Fixa': ['título', 'títulos'],
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 border-b border-border-subtle">
      <dt className="text-small text-secondary-foreground">{label}</dt>
      <dd className="tnum text-small font-semibold">{children}</dd>
    </div>
  );
}

/** "Minha posição", com o estado "Preço médio indisponível" quando o PM não pode ser reconstruído. */
export function MyPosition({
  position,
  price,
  assetClass,
}: {
  position: AssetPosition;
  price: number | null;
  assetClass: AssetClass;
}) {
  const [one, many] = unitName[assetClass];
  const hasPm = position.avgPrice !== null && price !== null;
  const result = hasPm ? positionResult(price, position.avgPrice!, position.quantity) : null;
  const rise = hasPm ? riseToAvgPrice(price, position.avgPrice!) : null;
  return (
    <Section id="minha-posicao" title="Minha posição">
      {result ? (
        <div className="mb-3">
          <span className="text-caption text-secondary-foreground">Resultado</span>
          <div className="mt-1.5 text-body">
            <span className="sr-only">
              {result.value < 0 ? 'Prejuízo' : 'Lucro'} de {formatBRL(Math.abs(result.value))} (
              {formatNumber(Math.abs(result.pct), 1)}%)
            </span>
            <span aria-hidden="true">
              <Delta value={result.value} format="brl" className="text-body" />{' '}
              <span
                className={
                  result.value < 0
                    ? 'tnum font-semibold text-negative'
                    : 'tnum font-semibold text-positive'
                }
              >
                ({formatPercent(result.pct, { decimals: 1 })})
              </span>
            </span>
          </div>
        </div>
      ) : (
        <div
          className="mb-4 flex flex-col items-start gap-3 rounded-lg bg-surface px-4 py-4"
          role="status"
        >
          <p className="flex items-start gap-2 text-small">
            <CircleHelp
              aria-hidden="true"
              className="mt-0.5 size-4 flex-none text-muted-foreground"
              strokeWidth={1.75}
            />
            <span>
              <span className="font-semibold">Preço médio indisponível</span> · importe os meses
              anteriores
            </span>
          </p>
          <p className="text-small text-secondary-foreground">
            O relatório mensal da B3 não traz preço médio. Ele é reconstruído somando as negociações
            de todos os meses importados.
          </p>
          <Button asChild size="sm">
            <Link href="/importar">
              <IconImportar width={16} height={16} />
              Importar relatório
            </Link>
          </Button>
        </div>
      )}
      <dl>
        <Row label="Quantidade">
          {formatInteger(position.quantity)} {position.quantity === 1 ? one : many}
        </Row>
        <Row label="Preço médio">
          {position.avgPrice === null ? '—' : formatBRL(position.avgPrice)}
        </Row>
        <Row label="Valor atual">{formatBRL(position.marketValue)}</Row>
        <Row label="Peso na carteira">
          {formatPercent(position.weightPct, { sign: false, decimals: 1 })} · {position.weightRank}ª
          maior
        </Row>
      </dl>
      {rise !== null && rise > 0 && (
        <p className="mt-3 max-w-[720px] text-small text-secondary-foreground">
          Para voltar ao preço médio, a ação precisa subir {formatNumber(rise, 1)}%.
        </p>
      )}
    </Section>
  );
}
