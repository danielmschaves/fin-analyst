import type { Metadata } from 'next';
import { EmptyState } from '@/components/painel/empty-state';
import { PageHeader } from '@/components/painel/page-header';

type Props = { params: Promise<{ ticker: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  return { title: decodeURIComponent(ticker).toUpperCase() };
}

export default async function AssetPage({ params }: Props) {
  const ticker = decodeURIComponent((await params).ticker).toUpperCase();
  return (
    <>
      <PageHeader eyebrow="Ativo" title={ticker} />
      <EmptyState title="Em construção" description="A página do ativo chega no PR 5." />
    </>
  );
}
