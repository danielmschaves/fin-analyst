import type { Metadata } from 'next';
import { EmptyState } from '@/components/painel/empty-state';
import { PageHeader } from '@/components/painel/page-header';

export const metadata: Metadata = { title: 'Projeções' };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Projeções" title="Projeções da carteira" />
      <EmptyState title="Em construção" description="Esta tela chega nos próximos PRs da fase 1." />
    </>
  );
}
