'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ChartHelp } from '@/components/painel/chart-help';
import { DataTable } from '@/components/painel/data-table';
import { PageHeader } from '@/components/painel/page-header';
import { PeriodTabs } from '@/components/painel/period-tabs';
import { Section } from '@/components/painel/section';
import { Unit } from '@/components/painel/stat-row';
import { Button } from '@/components/ui/button';
import type { ProjectionInputs } from '@/lib/contracts';
import {
  formatDate,
  formatInteger,
  formatNumber,
  formatPercent,
  parseNumberBR,
} from '@/lib/format';
import {
  formatThousands,
  monthLabel,
  runProjection,
  SCENARIO_LABEL,
  sensitivity,
  type ScenarioResult,
} from '@/lib/projection';
import { useIsMobile } from '@/lib/use-media';
import { ProjectionChart } from './projection-chart';
import { Switch } from './switch';

type Field = 'start' | 'monthly' | 'baseRate' | 'ipca' | 'goal';
const FIELDS: { id: Field; label: string; unit: string; hint?: string; decimals: number }[] = [
  {
    id: 'start',
    label: 'Patrimônio inicial',
    unit: 'R$',
    hint: 'do relatório de outubro',
    decimals: 2,
  },
  { id: 'monthly', label: 'Aporte mensal', unit: 'R$', decimals: 2 },
  {
    id: 'baseRate',
    label: 'Rentabilidade base',
    unit: '% a.a.',
    hint: 'últimos 12 meses da carteira',
    decimals: 1,
  },
  { id: 'ipca', label: 'Inflação (IPCA)', unit: '% a.a.', decimals: 1 },
  { id: 'goal', label: 'Meta', unit: 'R$', decimals: 2 },
];

const HORIZONS = [
  { value: '12', label: '1 ano' },
  { value: '36', label: '3 anos' },
  { value: '60', label: '5 anos' },
  { value: '120', label: '10 anos' },
] as const;

const yearsLabel = (months: number) => (months === 12 ? '1 ano' : `${months / 12} anos`);
const toText = (inputs: ProjectionInputs) =>
  Object.fromEntries(FIELDS.map((f) => [f.id, formatNumber(inputs[f.id], f.decimals)])) as Record<
    Field,
    string
  >;

export function ProjectionView({
  defaults,
  referenceDate,
  return12m,
}: {
  defaults: ProjectionInputs;
  referenceDate: string;
  return12m: number;
}) {
  const [inputs, setInputs] = useState<ProjectionInputs>(defaults);
  const [text, setText] = useState(() => toText(defaults));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [realValues, setRealValues] = useState(false);
  const mobile = useIsMobile();

  const run = useMemo(() => runProjection(inputs), [inputs]);
  const sens = useMemo(() => sensitivity(inputs), [inputs]);
  const by = Object.fromEntries(run.results.map((r) => [r.id, r])) as Record<
    ScenarioResult['id'],
    ScenarioResult
  >;
  const end = monthLabel(referenceDate, inputs.months);
  const horizon = yearsLabel(inputs.months);
  const pace =
    inputs.baseRate === return12m
      ? 'o ritmo dos últimos 12 meses'
      : `rentabilidade de ${formatNumber(inputs.baseRate, 1)}% a.a.`;
  const share = (run.totalInvested / by.base.final) * 100;
  const goalM = (id: ScenarioResult['id']) => {
    const m = by[id].goalMonths;
    return m === null ? '—' : m === 0 ? 'já alcançada' : monthLabel(referenceDate, m);
  };
  const deflate = (arr: number[]) => arr.map((v, i) => v / (1 + inputs.ipca / 100) ** (i / 12));
  const chartSeries = realValues
    ? {
        conservador: deflate(run.series.conservador),
        base: deflate(run.series.base),
        otimista: deflate(run.series.otimista),
      }
    : run.series;
  const chartInvested = realValues ? deflate(run.invested) : run.invested;

  const recalc = (e?: FormEvent) => {
    e?.preventDefault();
    const next: Partial<Record<Field, number>> = {};
    const errs: Partial<Record<Field, string>> = {};
    for (const f of FIELDS) {
      const v = parseNumberBR(text[f.id]);
      if (v === null || v < 0) errs[f.id] = 'Digite um número (ex.: 1.000,00)';
      else next[f.id] = v;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setInputs((prev) => ({ ...prev, ...next }));
  };

  const restore = () => {
    setInputs(defaults);
    setText(toText(defaults));
    setErrors({});
    setRealValues(false);
  };

  const save = () => {
    try {
      window.localStorage.setItem('fa:simulacao', JSON.stringify(inputs));
    } catch {
      /* armazenamento indisponível: segue sem salvar */
    }
    toast.success('Simulação salva', {
      description: 'As premissas ficam guardadas neste navegador.',
    });
  };

  const columns: ColumnDef<ScenarioResult, unknown>[] = [
    {
      id: 'cenario',
      header: 'Cenário',
      cell: ({ row }) =>
        row.original.id === 'aportes' ? 'Só aportes' : SCENARIO_LABEL[row.original.id],
    },
    {
      id: 'taxa',
      header: 'Rentab. a.a.',
      cell: ({ row }) =>
        row.original.rate === null ? '—' : `${formatNumber(row.original.rate, 1)}%`,
      meta: { align: 'right' },
    },
    {
      id: 'final',
      header: `Em ${end}`,
      cell: ({ row }) => formatNumber(row.original.final),
      meta: { align: 'right' },
    },
    {
      id: 'real',
      header: 'Em valores de hoje',
      cell: ({ row }) => formatNumber(row.original.real),
      meta: { align: 'right' },
    },
    {
      id: 'ganho',
      header: 'Rendimento',
      cell: ({ row }) =>
        row.original.gain === null ? '—' : formatNumber(row.original.gain, 2, { sign: true }),
      meta: { align: 'right' },
    },
    {
      id: 'meta',
      header: `Meta ${formatThousands(inputs.goal)}`,
      cell: ({ row }) => goalM(row.original.id),
      meta: { align: 'right' },
    },
  ];

  const chartLabel = `Projeção do patrimônio em ${horizon} com aporte de R$ ${formatInteger(inputs.monthly)} por mês: conservador ${formatThousands(by.conservador.final, 1)}, base ${formatThousands(by.base.final, 1)}, otimista ${formatThousands(by.otimista.final, 1)}; aportes somam ${formatThousands(run.totalInvested, 1)}; meta de ${formatThousands(inputs.goal)} em ${goalM('base')} no cenário base.`;

  return (
    <>
      <PageHeader
        eyebrow={`Projeções · simulação a partir de ${formatDate(referenceDate)}`}
        title={`Mantendo R$ ${formatInteger(inputs.monthly)} por mês e ${pace}, a carteira chegaria a cerca de ${formatThousands(by.base.final)} em ${horizon}.`}
        summary={`Em valores de hoje (IPCA de ${formatNumber(inputs.ipca, 0)}% a.a.), cerca de ${formatThousands(by.base.real)}. Entre os cenários, de ${formatThousands(by.conservador.final)} a ${formatThousands(by.otimista.final)}.`}
        actions={
          <Button variant="outline" size="sm" onClick={save}>
            Salvar simulação
          </Button>
        }
      />

      <Section
        id="patrimonio-projetado"
        title="Patrimônio projetado"
        subtitle={`${realValues ? 'Valores de hoje' : 'Valores nominais'} · aporte no fim de cada mês · proventos ${inputs.reinvestDividends ? 'reinvestidos' : 'retirados'}`}
        actions={
          <>
            <PeriodTabs
              label="Horizonte"
              value={String(inputs.months) as (typeof HORIZONS)[number]['value']}
              onChange={(v) => setInputs((p) => ({ ...p, months: Number(v) }))}
              options={
                mobile
                  ? HORIZONS.map((h) => ({ ...h, label: h.label.replace(/ anos?/, 'A') }))
                  : HORIZONS
              }
            />
            <ChartHelp
              subject="a projeção"
              howTo="Faixa âmbar: do cenário conservador ao otimista. Linha forte: cenário base. Tracejada: soma dos aportes. Pontilhada: sua meta."
              insights={[
                {
                  title: 'A faixa é o que muda entre cenários',
                  detail: `De ${formatThousands(by.conservador.final, 1)} a ${formatThousands(by.otimista.final, 1)} em ${end}, com as mesmas premissas de aporte.`,
                },
                {
                  title: `Aportes são ${formatThousands(run.totalInvested, 1)} do total`,
                  detail: `No cenário base, ${Math.round(share)}% do patrimônio final vem do que você aportou.`,
                },
                {
                  title: `A meta cruza a linha base em ${goalM('base')}`,
                  detail: `Entre ${goalM('otimista')} (otimista) e ${goalM('conservador')} (conservador).`,
                },
              ]}
              askLabel="Perguntar sobre a projeção"
              askContext={['Projeções', `${horizon}`]}
            />
          </>
        }
      >
        <ProjectionChart
          series={chartSeries}
          invested={chartInvested}
          goal={inputs.goal}
          goalMonth={by.base.goalMonths}
          referenceDate={referenceDate}
          label={chartLabel}
          compact={mobile}
        />
      </Section>

      <div className="flex flex-wrap items-start gap-14">
        <div className="min-w-0 flex-[3_1_560px]">
          <Section id="cenarios" title="Cenários">
            <DataTable
              caption={`Cenários de projeção em ${horizon}`}
              columns={columns}
              data={run.results}
              getRowId={(r) => r.id}
              getRowVariant={(r) =>
                r.id === 'base' ? 'highlight' : r.id === 'aportes' ? 'average' : undefined
              }
              pinVariants={false}
              minWidth={680}
            />
            <p className="mt-3 max-w-[720px] text-small text-secondary-foreground">
              Base:{' '}
              {inputs.baseRate === return12m
                ? `rentabilidade da carteira nos últimos 12 meses (${formatNumber(inputs.baseRate, 1)}% a.a.)`
                : `${formatNumber(inputs.baseRate, 1)}% a.a., definida por você`}
              . Conservador e otimista: {formatNumber(inputs.spread, 0)} p.p. abaixo e acima.
            </p>
          </Section>
        </div>
        <div className="min-w-0 flex-[2_1_300px]">
          <Section
            id="premissas"
            title="Premissas"
            actions={
              <Button variant="ghost" size="sm" onClick={restore}>
                Restaurar
              </Button>
            }
          >
            <form onSubmit={recalc} className="flex flex-col gap-4" noValidate>
              {FIELDS.map((f) => (
                <label key={f.id} className="flex flex-col gap-1.5">
                  <span className="text-caption text-secondary-foreground">{f.label}</span>
                  <span className="flex min-h-11 items-center gap-2 rounded-lg bg-surface-raised px-3.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={text[f.id]}
                      onChange={(e) => setText((t) => ({ ...t, [f.id]: e.target.value }))}
                      aria-invalid={errors[f.id] ? true : undefined}
                      aria-describedby={errors[f.id] ? `erro-${f.id}` : undefined}
                      className="tnum min-w-0 flex-1 bg-transparent text-body font-semibold text-foreground outline-none"
                    />
                    <span className="text-small text-muted-foreground">{f.unit}</span>
                  </span>
                  {errors[f.id] ? (
                    <span id={`erro-${f.id}`} className="text-caption font-normal text-negative">
                      {errors[f.id]}
                    </span>
                  ) : (
                    f.hint && (
                      <span className="text-caption font-normal text-muted-foreground">
                        {f.hint}
                      </span>
                    )
                  )}
                </label>
              ))}
              <div className="border-t border-border pt-1">
                <Switch
                  label="Reinvestir proventos"
                  checked={inputs.reinvestDividends}
                  onChange={(v) => setInputs((p) => ({ ...p, reinvestDividends: v }))}
                />
                <Switch
                  label="Mostrar em valores de hoje"
                  checked={realValues}
                  onChange={setRealValues}
                />
              </div>
              <Button type="submit" className="w-full">
                Recalcular
              </Button>
            </form>
          </Section>
        </div>
      </div>

      <Section
        id="o-que-mais-pesa"
        title="O que mais pesa"
        lead={`Neste horizonte, ${sens.plus100 >= sens.plus1pp ? 'o aporte pesa mais que a rentabilidade' : 'a rentabilidade pesa mais que o aporte'}.`}
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-6">
          {[
            {
              label: '+R$ 100 por mês de aporte',
              value: sens.plus100,
              note: `em ${end}, no cenário base`,
            },
            {
              label: '+1 p.p. de rentabilidade',
              value: sens.plus1pp,
              note: `em ${end}, com o mesmo aporte`,
            },
          ].map((k) => (
            <div key={k.label} className="flex flex-col gap-1.5">
              <span className="text-caption text-secondary-foreground">{k.label}</span>
              <p className="tnum text-kpi">
                +<Unit>R$</Unit>
                {formatInteger(k.value)}
              </p>
              <span className="text-small text-secondary-foreground">{k.note}</span>
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <span className="text-caption text-secondary-foreground">Proventos no último ano</span>
            <p className="tnum text-kpi">
              ≈ R$ {formatInteger((by.base.final * inputs.dividendYield) / 100)}
            </p>
            <span className="text-small text-secondary-foreground">
              se o DY da carteira (
              {formatPercent(inputs.dividendYield, { sign: false, decimals: 1 })}) se mantiver
            </span>
          </div>
        </div>
      </Section>

      <p className="max-w-[720px] text-small text-secondary-foreground">
        Simulação com premissas fixas, que você controla. Não é previsão nem recomendação;
        rentabilidade passada não garante resultados futuros.
      </p>
    </>
  );
}
