import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Disclaimer } from '@/components/painel/disclaimer';
import { Monogram, monogramText } from '@/components/painel/monogram';
import { Sparkline } from '@/components/painel/sparkline';

describe('Monogram', () => {
  it('usa as 4 primeiras letras do ticker e fica oculto para leitores de tela', () => {
    expect(monogramText('PETR4')).toBe('PETR');
    expect(monogramText('CDB DI')).toBe('CDBD');
    const { container } = render(<Monogram ticker="VALE3" />);
    expect(container.firstChild).toHaveTextContent('VALE');
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Sparkline', () => {
  it('tem role img e rótulo quando informado', () => {
    render(<Sparkline values={[1, 3, 2]} label="Receita, 3 trimestres" />);
    expect(screen.getByRole('img', { name: 'Receita, 3 trimestres' })).toBeInTheDocument();
  });
});

describe('Disclaimer', () => {
  it('traz o texto fixo e a fonte com cotações D-1', () => {
    render(<Disclaimer />);
    expect(screen.getByText(/não é recomendação de compra ou venda/)).toBeInTheDocument();
    expect(
      screen.getByText('Fonte: relatório mensal B3 · cotações de fechamento (D-1)'),
    ).toBeInTheDocument();
  });
});
