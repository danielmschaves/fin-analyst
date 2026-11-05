'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { axisTick, ChartFrame } from '@/components/charts/chart-frame';
import { formatMonthShort, formatPercent, MINUS } from '@/lib/format';
import type { EvolutionPoint } from '@/lib/portfolio';

const HEIGHT = 320;
const MARGIN = { top: 16, right: 132, bottom: 0, left: 0 };
const X_AXIS_HEIGHT = 28;

function niceDomain(values: number[]): [number, number] {
  // Um degrau de folga abaixo de zero, como no Painel 2 (−2% … 12%).
  const min = Math.floor(Math.min(0, ...values) / 2) * 2 - 2;
  const max = Math.ceil(Math.max(...values) / 2) * 2;
  return [min, max];
}

function pctTick(v: number) {
  return `${v < 0 ? MINUS : ''}${Math.abs(v)}%`;
}

type SeriesKey = 'carteira' | 'cdi' | 'ibov';
const SERIES: { key: SeriesKey; label: string }[] = [
  { key: 'cdi', label: 'CDI' },
  { key: 'carteira', label: 'Carteira' },
  { key: 'ibov', label: 'Ibovespa' },
];

/** Posiciona os rótulos de fim de linha sem sobreposição (mín. 16 px). */
function endLabelOffsets(last: EvolutionPoint, domain: [number, number], compact: boolean) {
  const plotH = (compact ? 240 : HEIGHT) - MARGIN.top - MARGIN.bottom - X_AXIS_HEIGHT;
  const px = (v: number) => MARGIN.top + plotH * (1 - (v - domain[0]) / (domain[1] - domain[0]));
  const items = SERIES.map((s) => ({ key: s.key, y: px(last[s.key]) })).sort((a, b) => a.y - b.y);
  const out: Record<string, number> = {};
  let prev = 10 - 16; // primeiro rótulo nunca acima de y = 10
  for (const it of items) {
    const y = Math.max(it.y, prev + 16);
    out[it.key] = y - it.y;
    prev = y;
  }
  return out as Record<SeriesKey, number>;
}

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: EvolutionPoint }[];
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="min-w-44 rounded-md bg-popover px-3 py-2.5 text-small shadow-elevation-2">
      <p className="mb-1 text-caption text-secondary-foreground">{formatMonthShort(p.date)}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="tnum flex justify-between gap-4">
          <span className="text-secondary-foreground">{s.label}</span>
          <span className={s.key === 'carteira' ? 'font-semibold' : ''}>
            {formatPercent(p[s.key], { decimals: 1 })}
          </span>
        </p>
      ))}
    </div>
  );
}

export function EvolutionChart({
  points,
  compact = false,
}: {
  points: EvolutionPoint[];
  compact?: boolean;
}) {
  const last = points[points.length - 1]!;
  const domain = niceDomain(points.flatMap((p) => [p.carteira, p.cdi, p.ibov]));
  const ticks: number[] = [];
  for (let v = domain[0]; v <= domain[1]; v += compact ? 4 : 2) ticks.push(v);
  const offsets = endLabelOffsets(last, domain, compact);
  const height = compact ? 240 : HEIGHT;
  const n = points.length;
  const xTicks = n > 7 ? [0, 3, 6, 9, 12].filter((i) => i < n) : points.map((_, i) => i);
  const label = `Rentabilidade acumulada: carteira ${formatPercent(last.carteira, { decimals: 1 })}, CDI ${formatPercent(last.cdi, { decimals: 1 })}, Ibovespa ${formatPercent(last.ibov, { decimals: 1 })}`;

  const renderEnd = (key: SeriesKey, text: string, strong: boolean) =>
    function EndLabel(props: { x?: number | string; y?: number | string; index?: number }) {
      if (props.index !== n - 1 || props.x == null || props.y == null) return null;
      const x = Number(props.x);
      const y = Number(props.y);
      const dy = offsets[key];
      return (
        <g>
          <path
            d={`M${x + 3} ${y} L${x + 8} ${y + dy}`}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            fill="none"
          />
          <text
            x={x + 10}
            y={y + dy + 4}
            fontSize={compact ? 12 : 13}
            fontWeight={strong ? 600 : 500}
            fill={strong ? 'var(--foreground)' : 'var(--text-secondary)'}
            fontFamily="var(--font-sans)"
          >
            {text}
          </text>
        </g>
      );
    };

  return (
    <ChartFrame label={label} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ ...MARGIN, right: compact ? 108 : MARGIN.right }}
          accessibilityLayer={false}
        >
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
          <YAxis
            domain={domain}
            ticks={ticks}
            tickFormatter={pctTick}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            width={44}
          />
          <XAxis
            dataKey="index"
            type="number"
            domain={[0, n - 1]}
            ticks={xTicks}
            tickFormatter={(i: number) => {
              const d = points[i]?.date ?? '';
              const full = i === 0 || i === n - 1 || d.slice(5, 7) === '01';
              return full ? formatMonthShort(d) : formatMonthShort(d).slice(0, 3);
            }}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            height={X_AXIS_HEIGHT}
            interval={0}
          />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" />
          <Tooltip
            content={<TooltipContent />}
            cursor={{ stroke: 'var(--border)' }}
            isAnimationActive={false}
          />
          <Line
            dataKey="ibov"
            stroke="var(--muted-foreground)"
            strokeWidth={1.25}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
            label={renderEnd(
              'ibov',
              `Ibovespa ${formatPercent(last.ibov, { decimals: 1 })}`,
              false,
            )}
          />
          <Line
            dataKey="cdi"
            stroke="var(--text-secondary)"
            strokeWidth={1.25}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
            label={renderEnd('cdi', `CDI ${formatPercent(last.cdi, { decimals: 1 })}`, false)}
          />
          <Line
            dataKey="carteira"
            stroke="var(--accent)"
            strokeWidth={2.25}
            dot={(props: { cx?: number; cy?: number; index?: number }) =>
              props.index === n - 1 ? (
                <circle
                  key="end"
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill="var(--accent)"
                  stroke="var(--background)"
                  strokeWidth={2}
                />
              ) : (
                <g key={props.index} />
              )
            }
            activeDot={{ r: 4 }}
            isAnimationActive={false}
            label={renderEnd(
              'carteira',
              `Carteira ${formatPercent(last.carteira, { decimals: 1 })}`,
              true,
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
