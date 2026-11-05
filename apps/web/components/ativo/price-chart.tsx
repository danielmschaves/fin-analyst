'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { axisTick, ChartFrame } from '@/components/charts/chart-frame';
import { maxPoint } from '@/lib/asset';
import type { PricePoint } from '@/lib/contracts';
import { formatBRL, formatDate, formatMonthShort, formatNumber, MONTHS } from '@/lib/format';

const monthAbbr = (date: string) => MONTHS[Number(date.slice(5, 7)) - 1]!.slice(0, 3);

function xLabel(points: PricePoint[], i: number, daily: boolean) {
  const d = points[i]!.date;
  if (daily) return formatDate(d).slice(0, 5);
  const edge = i === 0 || i === points.length - 1 || d.slice(5, 7) === '01';
  return edge ? formatMonthShort(d) : monthAbbr(d);
}

function PriceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PricePoint }[];
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-md bg-popover px-3 py-2 text-small shadow-elevation-2">
      <p className="text-caption text-secondary-foreground">{formatDate(p.date)}</p>
      <p className="tnum font-semibold">{formatBRL(p.close)}</p>
    </div>
  );
}

/** Linha de preço com a máxima anotada e o rótulo no fim da linha. */
export function PriceChart({
  points,
  ticker,
  periodLabel,
}: {
  points: PricePoint[];
  ticker: string;
  periodLabel: string;
}) {
  const n = points.length;
  const last = points[n - 1]!;
  const first = points[0]!;
  const max = maxPoint(points);
  const maxIndex = points.indexOf(max);
  const closes = points.map((p) => p.close);
  const step = Math.max(...closes) - Math.min(...closes) > 12 ? 5 : 1;
  const lo = Math.floor(Math.min(...closes) / step) * step;
  const hi = Math.ceil(Math.max(...closes) / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  const daily = n <= 30;
  const tickCount = daily ? Math.min(n, 6) : 7;
  const xTicks = Array.from({ length: tickCount }, (_, k) =>
    Math.round((k * (n - 1)) / (tickCount - 1)),
  );
  const data = points.map((p, i) => ({ ...p, i }));
  const maxLabel = `${formatBRL(max.close)} · ${daily ? formatDate(max.date).slice(0, 5) : monthAbbr(max.date)}`;
  const label = `Preço de ${ticker} em ${periodLabel}: de ${formatBRL(first.close)} a ${formatBRL(last.close)}, máxima de ${formatBRL(max.close)} em ${daily ? formatDate(max.date) : MONTHS[Number(max.date.slice(5, 7)) - 1]}`;

  return (
    <ChartFrame label={label} height={300}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 28, right: 84, bottom: 0, left: 0 }}
          accessibilityLayer={false}
        >
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
          <YAxis
            domain={[lo, hi]}
            ticks={ticks}
            tickFormatter={(v: number) => formatNumber(v, step < 5 ? 0 : 0)}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            width={44}
          />
          <XAxis
            dataKey="i"
            type="number"
            domain={[0, n - 1]}
            ticks={xTicks}
            interval={0}
            tickFormatter={(i: number) => xLabel(points, i, daily)}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            height={28}
          />
          <Tooltip
            content={<PriceTooltip />}
            cursor={{ stroke: 'var(--border)' }}
            isAnimationActive={false}
          />
          <Line
            dataKey="close"
            stroke="var(--foreground)"
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3.5 }}
            isAnimationActive={false}
            label={(props: { x?: number | string; y?: number | string; index?: number }) => {
              if (props.index !== n - 1 || props.x == null || props.y == null)
                return <g key={props.index} />;
              const x = Number(props.x);
              const y = Number(props.y);
              return (
                <g key="end">
                  <circle
                    cx={x}
                    cy={y}
                    r={4}
                    fill="var(--foreground)"
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                  <path
                    d={`M${x + 3} ${y} L${x + 8} ${y}`}
                    stroke="var(--muted-foreground)"
                    strokeWidth={1}
                  />
                  <text
                    x={x + 10}
                    y={y + 4}
                    fontSize={13}
                    fontWeight={600}
                    fill="var(--foreground)"
                    fontFamily="var(--font-sans)"
                  >
                    {formatBRL(last.close)}
                  </text>
                </g>
              );
            }}
          />
          {maxIndex !== n - 1 && (
            <ReferenceDot
              x={maxIndex}
              y={max.close}
              r={3.5}
              fill="var(--foreground)"
              stroke="var(--background)"
              strokeWidth={2}
              label={{
                value: maxLabel,
                position: 'top',
                offset: 10,
                fontSize: 13,
                fontWeight: 500,
                fill: 'var(--text-secondary)',
                stroke: 'var(--background)',
                strokeWidth: 4,
                paintOrder: 'stroke',
                fontFamily: 'var(--font-sans)',
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
