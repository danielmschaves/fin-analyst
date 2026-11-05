import type { Metadata } from 'next';
import { ProjectionView } from '@/components/projecoes/projection-view';
import { defaultInputs } from '@/lib/mock/projection';
import { getPortfolioRepository } from '@/lib/repositories';
import { totalValue } from '@/lib/portfolio';

export const metadata: Metadata = { title: 'Projeções' };

export default async function ProjectionsPage() {
  const s = await getPortfolioRepository().getSummary();
  const defaults = {
    ...defaultInputs,
    start: totalValue(s.positions),
    baseRate: s.return12mPct,
    dividendYield: s.dividendYieldPct,
  };
  return (
    <ProjectionView
      defaults={defaults}
      referenceDate={s.referenceDate}
      return12m={s.return12mPct}
    />
  );
}
