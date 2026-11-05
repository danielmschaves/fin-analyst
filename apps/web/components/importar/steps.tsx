import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Enviar arquivo', 'Revisar', 'Confirmar'];

/** Indicador de 3 passos; o passo atual leva aria-current="step". */
export function Steps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol aria-label="Importação em 3 passos" className="flex max-w-[720px] flex-wrap gap-3">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const on = n === current;
        return (
          <li
            key={label}
            aria-current={on ? 'step' : undefined}
            className="flex flex-[1_1_160px] items-center gap-2.5"
          >
            <span
              className={cn(
                'tnum inline-grid size-7 flex-none place-items-center rounded-full text-small font-semibold',
                on && 'bg-foreground text-background',
                done && 'text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]',
                !on &&
                  !done &&
                  'text-muted-foreground shadow-[inset_0_0_0_1px_var(--muted-foreground)]',
              )}
            >
              {done ? <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} /> : n}
            </span>
            <span
              className={cn(
                'text-small',
                on ? 'font-semibold' : 'font-medium',
                !on && !done && 'text-muted-foreground',
              )}
            >
              {label}
              {done && <span className="sr-only"> (concluído)</span>}
            </span>
            {n < STEPS.length && <span aria-hidden="true" className="h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
