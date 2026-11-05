'use client';

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { axisTick, ChartFrame } from '@/components/charts/chart-frame';
import type { IncomeStatementQuarterly } from '@/lib/contracts';
import { formatCompact, formatNumber, formatPercent, MINUS } from '@/lib/format';
import { netMargin } from '@/lib/fundamentals';

type Datum = { q: string; receita: number; lucro: number; margem: number };

const REVENUE = 'color-mix(in oklab, var(--muted-foreground) 72%, var(--background))';

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Datum }[] }) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return (
    <div className="min-w-40 rounded-md bg-popover px-3 py-2.5 text-small shadow-elevation-2">
      <p className="mb-1 text-caption text-secondary-foreground">{d.q}</p>
      <p className="tnum flex justify-between gap-4">
        <span className="text-secondary-foreground">Receita</span>R$ {formatNumber(d.receita, 1)} bi
      </p>
      <p className="tnum flex justify-between gap-4">
        <span className="text-secondary-foreground">Lucro</span>
        {d.lucro < 0 ? MINUS : ''}R$ {formatNumber(Math.abs(d.lucro), 1)} bi
      </p>
      <p className="tnum flex justify-between gap-4">
        <span className="text-secondary-foreground">Margem</span>
        {formatPercent(d.margem, { sign: false, decimals: 1 })}
      </p>
    </div>
  );
}

/** Barras de receita e lucro por trimestre, com a margem líquida em linha no eixo direito. */
export function RevenueProfitChart({ statement }: { statement: IncomeStatementQuarterly }) {
  const margins = netMargin(statement);
  const data: Datum[] = statement.quarters.map((q, i) => ({
    q,
    receita: statement.revenue[i]!,
    lucro: statement.netIncome[i]!,
    margem: margins[i]!,
  }));
  const last = data[data.length - 1]!;
  const n = data.length;
  const label = `Receita líquida e lucro líquido por trimestre em R$ bi, com margem líquida em linha. ${last.q}: receita ${formatNumber(last.receita, 1)} bi, lucro ${formatNumber(last.lucro, 1)} bi, margem ${formatNumber(last.margem, 1)}%.`;
  return (
    <>
      <ChartFrame label={label} height={320}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 0, bottom: 0, left: 0 }}
            barGap={2}
            accessibilityLayer={false}
          >
            <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
            <YAxis
              yAxisId="bi"
              domain={[-10, 60]}
              ticks={[-10, 0, 10, 20, 30, 40, 50, 60]}
              tickFormatter={(v: number) => (v < 0 ? `${MINUS}${Math.abs(v)}` : String(v))}
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              width={44}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[-14.5, 30.5]}
              ticks={[0, 10, 20]}
              tickFormatter={(v: number) => `${v}%`}
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              width={44}
            />
            <XAxis dataKey="q" axisLine={false} tickLine={false} tick={axisTick} height={28} />
            <ReferenceLine yAxisId="bi" y={0} stroke="var(--muted-foreground)" />
            <Tooltip
              content={<Tip />}
              cursor={{ fill: 'var(--surface-raised)', opacity: 0.5 }}
              isAnimationActive={false}
            />
            <Bar
              yAxisId="bi"
              dataKey="receita"
              fill={REVENUE}
              radius={2}
              maxBarSize={32}
              isAnimationActive={false}
            />
            <Bar yAxisId="bi" dataKey="lucro" radius={2} maxBarSize={32} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.q} fill={d.lucro < 0 ? 'var(--negative)' : 'var(--accent)'} />
              ))}
              <LabelList
                dataKey="lucro"
                content={(props: {
                  x?: number | string;
                  y?: number | string;
                  width?: number | string;
                  height?: number | string;
                  value?: unknown;
                  index?: number;
                }) => {
                  const v = Number(props.value);
                  if (!(v < 0)) return null;
                  const x = Number(props.x) + Number(props.width) + 6;
                  const y = Number(props.y) + Number(props.height) + 4;
                  return (
                    <text
                      x={x}
                      y={y}
                      fontSize={12}
                      fontWeight={600}
                      fill="var(--negative)"
                      stroke="var(--background)"
                      strokeWidth={4}
                      paintOrder="stroke"
                      fontFamily="var(--font-sans)"
                    >
                      {`${MINUS}R$ ${formatCompact(Math.abs(v) * 1e9)}`}
                    </text>
                  );
                }}
              />
            </Bar>
            <Line
              yAxisId="pct"
              dataKey="margem"
              stroke="var(--foreground)"
              strokeWidth={1.5}
              dot={{
                r: 3,
                fill: 'var(--background)',
                stroke: 'var(--foreground)',
                strokeWidth: 1.5,
              }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="margem"
                content={(props: {
                  x?: number | string;
                  y?: number | string;
                  index?: number;
                  value?: unknown;
                }) =>
                  props.index === n - 1 ? (
                    <text
                      x={Number(props.x)}
                      y={Number(props.y) - 10}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill="var(--foreground)"
                      stroke="var(--background)"
                      strokeWidth={4}
                      paintOrder="stroke"
                      fontFamily="var(--font-sans)"
                    >
                      {formatPercent(Number(props.value), { sign: false, decimals: 1 })}
                    </text>
                  ) : null
                }
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ul
        aria-hidden="true"
        className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-caption font-normal text-secondary-foreground"
      >
        <li className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-[2px]" style={{ background: REVENUE }} />
          Receita líquida (R$ bi)
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-[2px] bg-accent" />
          Lucro líquido (R$ bi)
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-0.5 w-3 bg-foreground" />
          Margem líquida (%, eixo à direita)
        </li>
      </ul>
    </>
  );
}
