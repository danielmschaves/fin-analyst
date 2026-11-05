/** Tokens da prancha P2-Tokens (fonte: canvas Painel 2). Usado no /design e nos testes. */
export type ColorToken = { name: string; light: string; dark: string };

export const baseColors: ColorToken[] = [
  { name: '--background', light: '#F7F6F3', dark: '#0F0E0D' },
  { name: '--surface', light: '#FFFFFF', dark: '#151412' },
  { name: '--surface-raised', light: '#F0EEEA', dark: '#1D1C19' },
  { name: '--border', light: '#E3E0DA', dark: '#2A2825' },
  { name: '--foreground', light: '#121110', dark: '#F5F4F1' },
  { name: '--text-secondary', light: '#3A3835', dark: '#C9C6BF' },
  { name: '--muted-foreground', light: '#6B6762', dark: '#9A968E' },
  { name: '--accent', light: '#8F5500', dark: '#F2C46D' },
  { name: '--accent-foreground', light: '#FFFFFF', dark: '#1A1206' },
  { name: '--positive', light: '#0B7A44', dark: '#3DD68C' },
  { name: '--negative', light: '#BF3A2B', dark: '#FF7A6B' },
  { name: '--warning', light: '#A34A08', dark: '#FF9F45' },
  { name: '--info', light: '#2D5BD1', dark: '#7FA7FF' },
  { name: '--ring', light: '#8F5500', dark: '#F2C46D' },
];

function scale(prefix: string, light: string[], dark: string[]): ColorToken[] {
  return light.map((l, i) => ({ name: `${prefix}${i + 1}`, light: l, dark: dark[i]! }));
}

export const chartCategorical = scale(
  '--chart-',
  ['#8F5500', '#3A3835', '#8A8680', '#B9B5AE', '#2D5BD1', '#7A4FC4', '#127F77', '#B4467E'],
  ['#F2C46D', '#E7E5E0', '#9A968E', '#5E5B55', '#7FA7FF', '#C99CFF', '#4FD1C5', '#F0A3C8'],
);

export const chartSequential = scale(
  '--chart-seq-',
  ['#FFFFFF', '#ECE3D4', '#DAC6AA', '#C7AA80', '#B48E55', '#A2712A', '#8F5500'],
  ['#151412', '#3A3121', '#5F4F30', '#846C3F', '#A8894F', '#CDA75E', '#F2C46D'],
);

export const chartDiverging = scale(
  '--chart-div-',
  ['#BF3A2B', '#CF766B', '#E0B2AA', '#F0EEEA', '#A4C7B3', '#57A17B', '#0B7A44'],
  ['#FF7A6B', '#B45B50', '#683B34', '#1D1C19', '#285A3F', '#329866', '#3DD68C'],
);

export const scoreColors = scale(
  '--score-',
  ['#CCC7E8', '#A9A2D8', '#857CC0', '#6158A3', '#3F3870'],
  ['#4A4360', '#625A85', '#7F76AD', '#A69ED6', '#CDC7F2'],
);

export const allColorTokens = [
  ...baseColors,
  ...chartCategorical,
  ...chartSequential,
  ...chartDiverging,
  ...scoreColors,
];

export const typeScale = [
  {
    token: '--text-display',
    className: 'text-display tnum',
    sample: 'R$ 16.188,02',
    spec: 'Geist · 52/1.0 · 600',
  },
  {
    token: '--text-h1',
    className: 'font-serif text-h1',
    sample: 'Minha carteira',
    spec: 'Faustina · 38/1.15 · 400',
  },
  { token: '--text-h2', className: 'text-h2', sample: 'Fundamentos', spec: 'Geist · 18/1.3 · 600' },
  {
    token: '--text-h3',
    className: 'text-h3',
    sample: 'Evolução em 12 meses',
    spec: 'Geist · 15/1.35 · 600',
  },
  {
    token: '--text-body',
    className: 'text-body',
    sample: 'A receita cresceu 1,18% em 12 meses.',
    spec: 'Geist · 15/1.55 · 400',
  },
  {
    token: '--text-small',
    className: 'text-small',
    sample: 'Atualizado em 31/10/2026',
    spec: 'Geist · 13/1.45 · 400',
  },
  {
    token: '--text-caption',
    className: 'text-caption',
    sample: 'Volume médio 3M',
    spec: 'Geist · 12/1.35 · 500',
  },
  {
    token: '--text-kpi',
    className: 'text-kpi tnum',
    sample: '+11,4%',
    spec: 'Geist · 28/1.05 · 600',
  },
] as const;

export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];
export const radii = [
  { token: '--radius-sm', value: '4px' },
  { token: '--radius-md', value: '8px' },
  { token: '--radius-lg', value: '12px' },
  { token: '--radius-full', value: '9999px' },
];
export const elevations = ['--elevation-0', '--elevation-1', '--elevation-2', '--elevation-3'];
