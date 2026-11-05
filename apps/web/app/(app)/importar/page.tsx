import type { Metadata } from 'next';
import { ImportWizard } from '@/components/importar/import-wizard';

export const metadata: Metadata = { title: 'Importar relatório' };

export default function ImportPage() {
  return <ImportWizard />;
}
