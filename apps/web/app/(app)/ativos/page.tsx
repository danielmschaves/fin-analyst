import type { Metadata } from 'next';
import Link from 'next/link';
import { Monogram } from '@/components/painel/monogram';
import { PageHeader } from '@/components/painel/page-header';
import { Section } from '@/components/painel/section';
import { getAssetRepository } from '@/lib/repositories';
import { getRequestContext } from '@/lib/session';

export const metadata: Metadata = { title: 'Ativos' };

export default async function AssetsPage() {
  const assetIndex = await getAssetRepository().listAssets(await getRequestContext());
  const groups = ['Ação', 'FII'] as const;
  return (
    <>
      <PageHeader
        eyebrow="Ativos"
        title="Ativos da carteira e dos pares acompanhados."
        summary="Use ⌘K para buscar qualquer ticker ou perguntar à IA."
      />
      {groups.map((g) => (
        <Section key={g} title={g === 'Ação' ? 'Ações' : 'FIIs'}>
          <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {assetIndex
              .filter((a) => a.assetClass === g)
              .map((a) => (
                <li key={a.ticker} className="border-b border-border-subtle">
                  <Link
                    href={`/ativo/${a.ticker}`}
                    className="flex min-h-14 items-center gap-3 rounded-md py-2 text-foreground no-underline hover:bg-surface-raised"
                  >
                    <Monogram ticker={a.ticker} />
                    <span className="flex flex-col">
                      <span className="tnum text-small font-semibold">{a.ticker}</span>
                      <span className="text-caption font-normal text-muted-foreground">
                        {a.name}
                        {a.sector ? ` · ${a.sector}` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </Section>
      ))}
    </>
  );
}
