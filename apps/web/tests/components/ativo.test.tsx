import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MyPosition } from '@/components/ativo/my-position';
import { QuoteSection } from '@/components/ativo/quote-section';
import { returns, vale3PriceHistory } from '@/lib/mock/vale3';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeAll(() => {
  // Recharts mede o container; no jsdom basta existir.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('QuoteSection / ReturnsStrip', () => {
  it('"6M" no ReturnsStrip muda o período do gráfico', async () => {
    const user = userEvent.setup();
    render(<QuoteSection ticker="VALE3" series={vale3PriceHistory()} returns={returns} />);
    const group = screen.getByRole('radiogroup', {
      name: 'Período do gráfico e retorno no período',
    });
    expect(within(group).getByRole('radio', { name: /1A/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(
      screen.getByRole('img', {
        name: /Preço de VALE3 em 1 ano: de R\$ 62,11 a R\$ 60,25, máxima de R\$ 83,30 em junho/,
      }),
    ).toBeInTheDocument();

    await user.click(within(group).getByRole('radio', { name: /6M/ }));
    expect(within(group).getByRole('radio', { name: /6M/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByTestId('price-chart')).toHaveAttribute('data-window', '6M');
    expect(
      screen.getByRole('img', { name: /Preço de VALE3 em 6 meses: de R\$ 81,17 a R\$ 60,25/ }),
    ).toBeInTheDocument();
  });

  it('setas do teclado trocam o período', async () => {
    const user = userEvent.setup();
    render(<QuoteSection ticker="VALE3" series={vale3PriceHistory()} returns={returns} />);
    within(screen.getByRole('radiogroup')).getByRole('radio', { name: /1A/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /2A/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /2A/ })).toHaveFocus();
  });

  it('frase do gráfico de 1 ano', () => {
    render(<QuoteSection ticker="VALE3" series={vale3PriceHistory()} returns={returns} />);
    expect(
      screen.getByText(
        'Subiu até R$ 83,30 em junho e devolveu toda a alta; está 3,0% abaixo de um ano atrás.',
      ),
    ).toBeInTheDocument();
  });
});

describe('MyPosition', () => {
  it('com PM: resultado, quantidade e alta necessária', () => {
    render(
      <MyPosition
        position={{
          quantity: 50,
          avgPrice: 64.1,
          marketValue: 3012.5,
          weightPct: 18.61,
          weightRank: 3,
        }}
        price={60.25}
        assetClass="Ação"
      />,
    );
    expect(screen.getByText('Prejuízo de R$ 192,50 (6,0%)')).toBeInTheDocument();
    expect(screen.getByText('50 ações')).toBeInTheDocument();
    expect(screen.getByText('18,6% · 3ª maior')).toBeInTheDocument();
    expect(
      screen.getByText('Para voltar ao preço médio, a ação precisa subir 6,4%.'),
    ).toBeInTheDocument();
  });

  it('sem PM: mostra o estado indisponível com "Importar relatório"', () => {
    render(
      <MyPosition
        position={{
          quantity: 100,
          avgPrice: null,
          marketValue: 3850,
          weightPct: 23.8,
          weightRank: 1,
        }}
        price={38.5}
        assetClass="Ação"
      />,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Preço médio indisponível · importe os meses anteriores');
    expect(within(status).getByRole('link', { name: 'Importar relatório' })).toHaveAttribute(
      'href',
      '/importar',
    );
    expect(screen.queryByText(/Para voltar ao preço médio/)).toBeNull();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
