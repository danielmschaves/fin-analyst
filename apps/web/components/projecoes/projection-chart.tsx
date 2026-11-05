'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { axisTick, ChartFrame } from '@/components/charts/chart-frame';
import { formatBRL } from '@/lib/format';
import { formatThousands, monthLabel, type ScenarioId } from '@/lib/projection';

type Datum = {
  i: number;
  band: [number, number];
  conservador: number;
  base: number;
  otimista: number;
  aportes: number;
};

const HEIGHT = 340;
const MARGIN = { top: 20, right: 176, bottom: 0, left: 0 };
const X_AXIS = 28;

function niceStep(max: number) {
  for (const s of [10_000, 20_000, 50_000, 100_000, 200_000, 500_000]) if (max / s <= 5) return s;
  return 1_000_000;
}

function Tip({
  active,
  payload,
  referenceDate,
}: {
  active?: boolean;
  payload?: { payload: Datum }[];
  referenceDate: string;
}) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  const rows: [string, number][] = [
    ['Otimista', d.otimista],
    ['Base', d.base],
    ['Conservador', d.conservador],
    ['Aportes', d.aportes],
  ];
  return (
    <div className="min-w-48 rounded-md bg-popover px-3 py-2.5 text-small shadow-elevation-2">
      <p className="mb-1 text-caption text-secondary-foreground">
        {monthLabel(referenceDate, d.i)}
      </p>
      {rows.map(([l, v]) => (
        <p key={l} className="tnum flex justify-between gap-4">
          <span className="text-secondary-foreground">{l}</span>
          <span className={l === 'Base' ? 'font-semibold' : ''}>
            {formatBRL(v, { decimals: 0 })}
          </span>
        </p>
      ))}
    </div>
  );
}

/** Leque de cenários: faixa âmbar (conservador → otimista), base forte, aportes tracejados e a meta pontilhada. */
export function ProjectionChart({
  series,
  invested,
  goal,
  goalMonth,
  referenceDate,
  label,
  compact = false,
}: {
  /** Mobile: sem rótulos no fim das linhas e só 3 marcas no eixo X. */
  compact?: boolean;
  series: Record<ScenarioId, number[]>;
  invested: number[];
  goal: number;
  goalMonth: number | null;
  referenceDate: string;
  label: string;
}) {
  const n = invested.length;
  const data: Datum[] = invested.map((a, i) => ({
    i,
    band: [series.conservador[i]!, series.otimista[i]!],
    conservador: series.conservador[i]!,
    base: series.base[i]!,
    otimista: series.otimista[i]!,
    aportes: a,
  }));
  const max = Math.max(goal, ...series.otimista);
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, k) => k * step);
  const months = n - 1;
  const years = months / 12;
  const xTicks = Array.from({ length: Math.floor(years) + 1 }, (_, k) => k * 12).filter(
    (m) => m <= months,
  );
  if (years < 2) {
    xTicks.length = 0;
    for (let m = 0; m <= months; m += 3) xTicks.push(m);
  }
  if (compact) xTicks.splice(0, xTicks.length, 0, Math.round(months / 2), months);
  const margin = compact ? { ...MARGIN, right: 16 } : MARGIN;

  // rótulos de fim de linha sem sobreposição
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom - X_AXIS;
  const px = (v: number) => MARGIN.top + plotH * (1 - v / top);
  const ends = [
    {
      key: 'otimista',
      text: `Otimista ${formatThousands(series.otimista[months]!, 1)}`,
      strong: false,
      color: 'var(--text-secondary)',
    },
    {
      key: 'base',
      text: `Base ${formatThousands(series.base[months]!, 1)}`,
      strong: true,
      color: 'var(--foreground)',
    },
    {
      key: 'conservador',
      text: `Conservador ${formatThousands(series.conservador[months]!, 1)}`,
      strong: false,
      color: 'var(--text-secondary)',
    },
    {
      key: 'aportes',
      text: `Aportes ${formatThousands(invested[months]!, 1)}`,
      strong: false,
      color: 'var(--muted-foreground)',
    },
  ].map((e) => ({
    ...e,
    y: px(e.key === 'aportes' ? invested[months]! : series[e.key as ScenarioId][months]!),
  }));
  let prev = -Infinity;
  for (const e of ends.sort((a, b) => a.y - b.y)) {
    e.y = Math.max(e.y, prev + 18);
    prev = e.y;
  }

  return (
    <ChartFrame label={label} height={HEIGHT}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={margin} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
          <YAxis
            domain={[0, top]}
            ticks={ticks}
            tickFormatter={(v: number) => `${Math.round(v / 1000)} mil`}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            width={52}
          />
          <XAxis
            dataKey="i"
            type="number"
            domain={[0, months]}
            ticks={xTicks}
            interval={0}
            tickFormatter={(i: number) => monthLabel(referenceDate, i, { short: true })}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            height={X_AXIS}
          />
          <Tooltip
            content={<Tip referenceDate={referenceDate} />}
            cursor={{ stroke: 'var(--border)' }}
            isAnimationActive={false}
          />
          <Area
            dataKey="band"
            stroke="none"
            fill="var(--accent)"
            fillOpacity={0.12}
            isAnimationActive={false}
            activeDot={false}
          />
          <Line
            dataKey="aportes"
            stroke="var(--muted-foreground)"
            strokeWidth={1.25}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="conservador"
            stroke="var(--accent)"
            strokeOpacity={0.45}
            strokeWidth={1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="otimista"
            stroke="var(--accent)"
            strokeOpacity={0.45}
            strokeWidth={1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="base"
            stroke="var(--accent)"
            strokeWidth={2.25}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
            label={(props: { x?: number | string; index?: number }) =>
              props.index === months && !compact ? (
                <g key="ends">
                  {ends.map((e) => (
                    <text
                      key={e.key}
                      x={Number(props.x) + 10}
                      y={e.y + 4}
                      fontSize={13}
                      fontWeight={e.strong ? 600 : 500}
                      fill={e.color}
                      fontFamily="var(--font-sans)"
                    >
                      {e.text}
                    </text>
                  ))}
                </g>
              ) : (
                <g key={props.index} />
              )
            }
          />
          <ReferenceLine
            y={goal}
            stroke="var(--foreground)"
            strokeDasharray="2 3"
            label={{
              value: `Meta ${formatThousands(goal)}`,
              position: 'insideTopLeft',
              fill: 'var(--foreground)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              dx: 4,
            }}
          />
          <ReferenceDot
            x={0}
            y={series.base[0]!}
            r={4}
            fill="var(--foreground)"
            stroke="var(--background)"
            strokeWidth={2}
            label={{
              value: `hoje · ${formatThousands(series.base[0]!, 1)}`,
              position: 'insideBottomLeft',
              dy: 18,
              dx: 4,
              fill: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
            }}
          />
          {goalMonth !== null && goalMonth > 0 && goalMonth <= months && (
            <ReferenceDot
              x={goalMonth}
              y={goal}
              r={4.5}
              fill="var(--accent)"
              stroke="var(--background)"
              strokeWidth={2}
              label={{
                value: monthLabel(referenceDate, goalMonth, { short: true }),
                position: 'top',
                offset: 10,
                fill: 'var(--foreground)',
                fontSize: 12,
                fontWeight: 600,
                stroke: 'var(--background)',
                strokeWidth: 4,
                paintOrder: 'stroke',
                fontFamily: 'var(--font-sans)',
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
