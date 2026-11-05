'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Delta } from '@/components/painel/delta';
import { RETURN_WINDOWS, type ReturnWindow } from '@/lib/contracts';
import { cn } from '@/lib/utils';

/** Retornos por janela que também são o seletor do período do gráfico (radiogroup). */
export function ReturnsStrip({
  returns,
  value,
  onChange,
}: {
  returns: Record<ReturnWindow, number>;
  value: ReturnWindow;
  onChange: (w: ReturnWindow) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + RETURN_WINDOWS.length) % RETURN_WINDOWS.length;
    onChange(RETURN_WINDOWS[next]!);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label="Período do gráfico e retorno no período"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
    >
      {RETURN_WINDOWS.map((w, i) => {
        const checked = w === value;
        return (
          <button
            key={w}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(w)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'flex min-w-[76px] flex-[1_0_76px] cursor-pointer flex-col items-start gap-1 rounded-[10px] px-3 py-2.5 text-left transition-colors md:flex-[1_1_84px]',
              checked ? 'bg-surface-raised' : 'hover:bg-surface-raised/60',
            )}
          >
            <span
              className={cn(
                'text-caption',
                checked ? 'font-semibold text-foreground' : 'text-secondary-foreground',
              )}
            >
              {w}
            </span>
            <Delta value={returns[w]} context={`em ${w}`} className="text-small" />
          </button>
        );
      })}
    </div>
  );
}
