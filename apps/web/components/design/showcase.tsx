'use client';

import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ChartHelp } from '@/components/painel/chart-help';
import { ColumnSelector } from '@/components/painel/column-selector';
import { DataTable } from '@/components/painel/data-table';
import { Delta } from '@/components/painel/delta';
import { EmptyState } from '@/components/painel/empty-state';
import { Monogram } from '@/components/painel/monogram';
import { Highlight, PageHeader } from '@/components/painel/page-header';
import { PeriodTabs } from '@/components/painel/period-tabs';
import { PillarBars } from '@/components/painel/pillar-bars';
import { ScoreMeter } from '@/components/painel/score-meter';
import { Section } from '@/components/painel/section';
import { SkeletonBlock } from '@/components/painel/skeleton';
import { Sparkline } from '@/components/painel/sparkline';
import { StatRow, Unit } from '@/components/painel/stat-row';
import { Button } from '@/components/ui/button';
import { formatNumber, formatPercent } from '@/lib/format';

type PeerRow = {
  ticker: string;
  score: number;
  pl: number;
  dy: number;
  group: string;
  variant?: 'highlight' | 'average';
};

const peers: PeerRow[] = [
  { ticker: 'VALE3', score: 51, pl: 120.11, dy: 8.83, group: 'Pares', variant: 'highlight' },
  { ticker: 'Média do setor', score: 71, pl: 51.37, dy: 5.99, group: 'Pares', variant: 'average' },
  { ticker: 'GGBR4', score: 93, pl: 18.57, dy: 2.5, group: 'Pares' },
  { ticker: 'CMIN3', score: 66, pl: 10.72, dy: 12.38, group: 'Grupo' },
];

const peerColumns: ColumnDef<PeerRow, unknown>[] = [
  {
    id: 'ativo',
    accessorKey: 'ticker',
    header: 'Ativo',
    enableSorting: false,
    meta: { alwaysVisible: true },
    cell: ({ row }) => <span className="tnum">{row.original.ticker}</span>,
  },
  {
    id: 'score',
    accessorKey: 'score',
    header: 'Classificação',
    cell: ({ row }) => <ScoreMeter score={row.original.score} showLabel={false} />,
    meta: { label: 'Classificação' },
  },
  {
    id: 'pl',
    accessorKey: 'pl',
    header: 'P/L',
    cell: ({ row }) => formatNumber(row.original.pl),
    meta: { align: 'right', label: 'P/L' },
  },
  {
    id: 'dy',
    accessorKey: 'dy',
    header: 'DY',
    cell: ({ row }) => formatPercent(row.original.dy, { sign: false }),
    meta: { align: 'right', label: 'DY' },
  },
];

export function DesignShowcase() {
  const [period, setPeriod] = useState<'6M' | '12M' | 'inicio'>('12M');
  const [visibility, setVisibility] = useState<VisibilityState>({});

  return (
    <div className="flex flex-col gap-12">
      <Section title="Princípios do Painel 2">
        <ol className="grid gap-x-10 sm:grid-cols-2">
          {[
            [
              'Cada número uma vez',
              'Se está no gráfico, a tabela não repete; se está no topo, o card não existe.',
            ],
            [
              'Caixa só para interação',
              'Seções se separam por espaço e um fio; superfícies elevadas só em popover, menu e assistente.',
            ],
            [
              'Cor com significado',
              'Âmbar = sua carteira e ação principal. Verde/coral = resultado, sempre com sinal. Lilás = classificação. O resto é cinza.',
            ],
            [
              'Frase antes do dado',
              'Cada tela abre com uma frase em serifa; cada seção, no máximo uma linha de leitura.',
            ],
            ['Um “?” por visual', 'Concentra “como ler”, insights e “Perguntar à IA”.'],
            [
              'Descreve, não recomenda',
              'Sem verbos de recomendação; sempre com a referência (CDI, setor, preço médio).',
            ],
          ].map(([t, d]) => (
            <li key={t} className="flex flex-col gap-0.5 border-t border-border py-3">
              <span className="text-small font-semibold">{t}</span>
              <span className="text-small text-secondary-foreground">{d}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Frase-resumo e números do topo">
        <div className="flex flex-col gap-8">
          <PageHeader
            headingLevel={3}
            eyebrow="Outubro de 2026"
            title={
              <>
                Sua carteira rendeu <Highlight tone="positive">+1,33%</Highlight> em outubro.
              </>
            }
          />
          <StatRow
            label="Exemplo de números do topo"
            stats={[
              {
                label: 'Patrimônio',
                size: 'display',
                value: (
                  <>
                    <Unit>R$</Unit>16.188,02
                  </>
                ),
                note: '7 posições',
              },
              {
                label: 'Rentabilidade 12M',
                value: (
                  <>
                    +11,4<Unit>%</Unit>
                  </>
                ),
                note: 'CDI 12M: +11,8%',
              },
            ]}
          />
        </div>
      </Section>

      <Section
        title="Gráfico com “?”"
        subtitle="Rentabilidade acumulada"
        actions={
          <>
            <PeriodTabs
              value={period}
              onChange={setPeriod}
              options={[
                { value: '6M', label: '6M' },
                { value: '12M', label: '12M' },
                { value: 'inicio', label: 'Desde o início' },
              ]}
            />
            <ChartHelp
              subject="a evolução"
              howTo="Rentabilidade acumulada desde out/25."
              insights={[
                {
                  title: 'Maior distância do CDI: −2,6 p.p.',
                  detail: 'Em junho, +5,1% contra +7,8% do CDI.',
                },
                { title: 'Acima do CDI em 2 de 12 meses', detail: 'Dezembro e abril.' },
              ]}
              askLabel="Perguntar sobre a evolução"
              askContext={['Carteira · out/2026', 'Evolução 12M']}
            />
          </>
        }
      >
        <p className="text-small text-muted-foreground">Período selecionado: {period}</p>
      </Section>

      <div className="grid gap-12 lg:grid-cols-2">
        <Section title="Classificação">
          <div className="flex flex-col gap-3">
            {[12, 33, 51, 74, 93].map((s) => (
              <div key={s}>
                <ScoreMeter score={s} />
              </div>
            ))}
          </div>
        </Section>
        <Section title="Pilares">
          <PillarBars
            pillars={[
              { name: 'Resultado', score: 51 },
              { name: 'Caixa', score: 69 },
              { name: 'Balanço', score: 52 },
              { name: 'Valuation', score: 40 },
              { name: 'Mercado', score: 85 },
            ]}
          />
        </Section>
      </div>

      <Section
        title="Tabela"
        subtitle="Grupo, destaque, média, ordenação"
        actions={
          <ColumnSelector
            tableLabel="exemplo"
            visibility={visibility}
            onChange={setVisibility}
            columns={[
              { id: 'score', label: 'Classificação' },
              { id: 'pl', label: 'P/L' },
              { id: 'dy', label: 'DY' },
            ]}
          />
        }
      >
        <DataTable
          caption="Exemplo"
          columns={peerColumns}
          data={peers}
          getRowId={(r) => r.ticker}
          getGroup={(r) => r.group}
          getRowVariant={(r) => r.variant}
          initialSorting={[{ id: 'score', desc: true }]}
          columnVisibility={visibility}
          onColumnVisibilityChange={setVisibility}
        />
      </Section>

      <div className="grid gap-12 lg:grid-cols-3">
        <Section title="Variação e monograma">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <Delta value={1.33} />
              <Delta value={-16.27} />
              <Delta value={0} />
            </div>
            <div className="flex items-center gap-4">
              <Delta value={212.4} format="brl" />
              <Delta value={-2.6} format="pp" />
            </div>
            <div className="flex items-center gap-3">
              <Monogram ticker="PETR4" />
              <Monogram ticker="CDB DI" />
              <Monogram ticker="VALE3" size="lg" />
            </div>
            <Sparkline
              values={[52.4, 45.9, 49.8, 53.1, 54.6, 46.7, 50.1, 52.2]}
              label="Receita, 8 trimestres"
            />
          </div>
        </Section>
        <Section title="Botões e toasts">
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              <Upload aria-hidden="true" strokeWidth={1.75} />
              Importar relatório
            </Button>
            <Button variant="outline">Trocar arquivo</Button>
            <Button
              variant="ghost"
              onClick={() =>
                toast.success('Carteira atualizada', {
                  description: '7 posições de outubro foram consolidadas.',
                })
              }
            >
              Mostrar toast
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                toast.error('Arquivo não reconhecido', {
                  description: 'Envie o relatório consolidado mensal da B3.',
                })
              }
            >
              Mostrar erro
            </Button>
          </div>
        </Section>
        <Section title="Skeleton">
          <SkeletonBlock />
        </Section>
      </div>

      <Section title="Estado vazio">
        <EmptyState
          title="Nenhuma posição ainda"
          description="Importe o relatório mensal da B3 para montar sua carteira."
          action={
            <Button size="sm">
              <Upload aria-hidden="true" strokeWidth={1.75} />
              Importar relatório
            </Button>
          }
        />
      </Section>
    </div>
  );
}
