import { ChartHelp } from '@/components/painel/chart-help';
import { PillarBars } from '@/components/painel/pillar-bars';
import { Section } from '@/components/painel/section';
import type { Pillar } from '@/lib/contracts';
import { scoreLabel } from '@/lib/score';

export function ScoreSection({
  ticker,
  score,
  pillars,
}: {
  ticker: string;
  score: number;
  pillars: Pillar[];
}) {
  const sorted = [...pillars].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  return (
    <Section
      id="classificacao"
      title="Classificação"
      actions={
        <ChartHelp
          subject="a classificação"
          howTo="Nota quantitativa de 0 a 100, por percentil no setor, em 5 pilares. Fraco: 0–39; Médio: 40–59; Forte: 60–100."
          askLabel="Perguntar sobre a classificação"
          askContext={[ticker, 'Classificação']}
        />
      }
    >
      <div className="mb-5 flex items-baseline gap-3">
        <p className="tnum text-display">{score}</p>
        <span className="text-small text-secondary-foreground">de 100 · {scoreLabel(score)}</span>
      </div>
      <PillarBars pillars={pillars} />
      {strongest && weakest && (
        <p className="mt-4 max-w-[720px] text-small text-secondary-foreground">
          {strongest.name} é o pilar mais forte; {weakest.name}, o mais fraco. Compara {ticker} com
          o próprio setor; não é recomendação.
        </p>
      )}
    </Section>
  );
}
