import { cn } from '@/lib/utils';

/** Minigráfico de linha. Só decorativo quando há `aria-hidden`; caso contrário, role="img". */
export function Sparkline({
  values,
  label,
  width = 72,
  height = 20,
  className,
  highlightLast = true,
}: {
  values: number[];
  label?: string;
  width?: number;
  height?: number;
  className?: string;
  highlightLast?: boolean;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / range);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  const zeroY = min < 0 && max > 0 ? y(0) : null;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible text-secondary-foreground', className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {zeroY !== null && (
        <line
          x1={0}
          x2={width}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--border)"
          strokeDasharray="2 2"
        />
      )}
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {highlightLast && <circle cx={x(last)} cy={y(values[last]!)} r={2} fill="currentColor" />}
    </svg>
  );
}
