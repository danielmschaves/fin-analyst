import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { Dividends } from '@/components/carteira/dividends';
import { EvolutionSection } from '@/components/carteira/evolution-section';
import { MonthChanges } from '@/components/carteira/month-changes';
import { portfolioSummary } from '@/lib/mock/portfolio';
import { evolutionSeries } from '@/lib/portfolio';

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

const firstMonth = portfolioSummary.positions.map((p) => ({ ...p, monthChangePct: null }));

describe('primeiro mês importado', () => {
  it('"O que mudou no mês" explica que a variação vem no segundo relatório', () => {
    render(<MonthChanges positions={firstMonth} monthName="outubro" />);
    expect(screen.getByText('Primeiro mês importado')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Variação por posição' })).toBeNull();
  });

  it('posições sem variação ficam de fora da lista', () => {
    const mixed = portfolioSummary.positions.map((p, i) =>
      i === 0 ? { ...p, monthChangePct: null } : p,
    );
    render(<MonthChanges positions={mixed} monthName="outubro" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  it('proventos sem resultado do mês não mostram a frase de proporção', () => {
    render(
      <Dividends
        dividends={portfolioSummary.dividends}
        total={59.8}
        shareOfResult={null}
        monthName="outubro"
      />,
    );
    expect(screen.queryByText(/Equivalem a/)).toBeNull();
    expect(screen.getByText('R$ 59,80')).toBeInTheDocument();
  });

  it('evolução com menos de 2 meses mostra o estado vazio', () => {
    const history = {
      ...portfolioSummary.history,
      portfolioCumulative: [0],
      cdiMonthly: [0],
      ibovCumulative: [0],
    };
    render(
      <EvolutionSection
        points={evolutionSeries(history)}
        history={history}
        monthLabel="Carteira · out/2026"
      />,
    );
    expect(screen.getByText('Ainda não há evolução para mostrar')).toBeInTheDocument();
    expect(screen.getByText(/Importe pelo menos 2 meses/)).toBeInTheDocument();
  });
});
