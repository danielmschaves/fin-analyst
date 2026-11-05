import { Search } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/painel/empty-state';
import { PageHeader } from '@/components/painel/page-header';
import { Button } from '@/components/ui/button';

export default function AssetNotFound() {
  return (
    <>
      <PageHeader eyebrow="Ativos" title="Ativo não encontrado" />
      <EmptyState
        icon={<Search className="size-6" strokeWidth={1.75} />}
        title="Não encontramos esse ticker"
        description="Confira o código de negociação ou busque pelo nome da empresa com ⌘K."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/ativos">Ver ativos acompanhados</Link>
          </Button>
        }
      />
    </>
  );
}
