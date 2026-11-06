import type { Metadata } from 'next';
import { ProjectionView } from '@/components/projecoes/projection-view';
import { getPortfolioRepository } from '@/lib/repositories';
import { getRequestContext } from '@/lib/session';

export const metadata: Metadata = { title: 'Projeções' };

export default async function ProjectionsPage() {
  const ctx = await getRequestContext();
  const repo = getPortfolioRepository();
  const [summary, defaults] = await Promise.all([
    repo.getSummary(ctx),
    repo.getProjectionDefaults(ctx),
  ]);
  return (
    <ProjectionView
      defaults={defaults}
      referenceDate={summary.referenceDate}
      return12m={summary.return12mPct}
    />
  );
}
