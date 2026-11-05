import { scoreColorVar, scoreLabel } from '@/lib/score';

export type Pillar = { name: string; score: number };

/** Barras 0–100 por pilar, com marcas em 40 e 60 (limites de Fraco/Médio/Forte). */
export function PillarBars({ pillars }: { pillars: Pillar[] }) {
  return (
    <div>
      <ol className="flex flex-col">
        {pillars.map((p) => {
          const label = scoreLabel(p.score);
          return (
            <li
              key={p.name}
              className="grid min-h-8 grid-cols-[88px_minmax(0,1fr)_28px_48px] items-center gap-3 sm:grid-cols-[96px_minmax(0,1fr)_28px_52px]"
            >
              <span className="text-small text-secondary-foreground">{p.name}</span>
              <span
                role="meter"
                aria-label={`${p.name}: ${p.score} de 100, ${label}`}
                aria-valuenow={p.score}
                aria-valuemin={0}
                aria-valuemax={100}
                className="relative block h-1.5 rounded-[3px] bg-surface-raised"
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-[3px]"
                  style={{ width: `${p.score}%`, background: scoreColorVar(p.score) }}
                />
                <span
                  aria-hidden="true"
                  className="absolute -inset-y-[3px] left-[40%] w-px bg-muted-foreground"
                />
                <span
                  aria-hidden="true"
                  className="absolute -inset-y-[3px] left-[60%] w-px bg-muted-foreground"
                />
              </span>
              <span className="tnum text-right text-small font-semibold">{p.score}</span>
              <span className="text-caption text-secondary-foreground">{label}</span>
            </li>
          );
        })}
      </ol>
      <div
        aria-hidden="true"
        className="mt-1 grid grid-cols-[88px_minmax(0,1fr)_88px] gap-3 sm:grid-cols-[96px_minmax(0,1fr)_92px]"
      >
        <span />
        <div className="grid grid-cols-[40fr_20fr_40fr] text-caption font-normal text-muted-foreground">
          <span>Fraco · 0–39</span>
          <span className="text-center">Médio</span>
          <span className="text-right">Forte · 60–100</span>
        </div>
        <span />
      </div>
    </div>
  );
}
