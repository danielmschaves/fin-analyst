import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { peersLead } from '@/components/fundamentos/peers';
import { Statements } from '@/components/fundamentos/statements';
import { vale3Income, vale3Peers } from '@/lib/mock/fundamentals';

describe('Statements', () => {
  it('DRE trimestral por padrão, com t/t e margem em p.p.', () => {
    render(<Statements statement={vale3Income} />);
    const table = screen.getByRole('table', { name: 'DRE trimestral em R$ bi' });
    const receita = within(table).getByRole('row', { name: /Receita líquida/ });
    expect(receita).toHaveTextContent('52,4');
    expect(within(receita).getByRole('img', { name: 'alta de 4,2%' })).toBeInTheDocument();
    const margem = within(table).getByRole('row', { name: /Margem líquida/ });
    expect(within(margem).getByRole('img', { name: 'queda de 0,9 p.p.' })).toBeInTheDocument();
    expect(
      screen.getByText(/t\/t: 3T26 contra 2T26; margem em pontos percentuais\./),
    ).toBeInTheDocument();
  });

  it.each([
    ['Balanço', 'Balanço ainda não disponível'],
    ['Fluxo de Caixa', 'Fluxo de Caixa ainda não disponível'],
  ])('a aba %s mostra estado vazio', async (tab, title) => {
    const user = userEvent.setup();
    render(<Statements statement={vale3Income} />);
    await user.click(screen.getByRole('tab', { name: tab }));
    expect(screen.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent(title);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('setas navegam entre as abas', async () => {
    const user = userEvent.setup();
    render(<Statements statement={vale3Income} />);
    screen.getByRole('tab', { name: 'DRE' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Balanço' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Balanço' })).toHaveAttribute('aria-selected', 'true');
  });

  it('visão anual soma 2025 e últimos 12 meses', async () => {
    const user = userEvent.setup();
    render(<Statements statement={vale3Income} />);
    await user.click(screen.getByRole('button', { name: 'Anual' }));
    const table = screen.getByRole('table', { name: 'DRE anual em R$ bi' });
    expect(within(table).getByRole('columnheader', { name: '2025' })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /Receita líquida/ })).toHaveTextContent('203,4');
  });
});

describe('peersLead', () => {
  it('descreve a posição entre os pares sem recomendar', () => {
    expect(peersLead(vale3Peers)).toBe(
      'VALE3 tem a 2ª menor classificação e o 2º maior P/L do grupo; o DY (8,83%) fica acima da média (5,99%).',
    );
  });
});
