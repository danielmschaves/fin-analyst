import type { Metadata } from 'next';
import { EmptyState } from '@/components/painel/empty-state';
import { PageHeader } from '@/components/painel/page-header';

export const metadata: Metadata = { title: 'Conexões' };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Conexões" title="Conexões MCP" />
      <EmptyState title="Em construção" description="Esta tela chega nos próximos PRs da fase 1." />
    </>
  );
}
