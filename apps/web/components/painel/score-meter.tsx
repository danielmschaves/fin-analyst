import { scoreLabel, scoreLevel } from '@/lib/score';
import { cn } from '@/lib/utils';

/** Classificação: número + medidor de 5 níveis + rótulo (Fraco/Médio/Forte). */
export function ScoreMeter({
  score,
  showLabel = true,
  className,
}: {
  score: number;
  showLabel?: boolean;
  className?: string;
}) {
  const level = scoreLevel(score);
  const label = scoreLabel(score);
  return (
    <span
      role="img"
      aria-label={`Classificação ${score} de 100, ${label}`}
      className={cn('inline-flex items-center gap-2.5 whitespace-nowrap', className)}
    >
      <span className="tnum min-w-5 text-right text-small font-semibold">{score}</span>
      <span aria-hidden="true" className="inline-flex w-14 gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            data-filled={i <= level}
            className="h-1.5 flex-1 rounded-[2px]"
            style={{ background: i <= level ? `var(--score-${level})` : 'var(--surface-raised)' }}
          />
        ))}
      </span>
      {showLabel && (
        <span className="min-w-10 text-caption text-secondary-foreground">{label}</span>
      )}
    </span>
  );
}
