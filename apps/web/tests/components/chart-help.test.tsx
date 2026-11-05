import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChartHelp } from '@/components/painel/chart-help';
import { AskProvider } from '@/lib/ask';

function setup(onAsk = vi.fn()) {
  render(
    <AskProvider value={onAsk}>
      <ChartHelp
        subject="a evolução"
        howTo="Rentabilidade acumulada desde out/25."
        insights={[{ title: 'Acima do CDI em 2 de 12 meses', detail: 'Dezembro e abril.' }]}
        askLabel="Perguntar sobre a evolução"
        askContext={['Carteira · out/2026', 'Evolução 12M']}
        askQuestion="Por que fiquei abaixo do CDI?"
      />
    </AskProvider>,
  );
  return {
    trigger: screen.getByRole('button', { name: 'Como ler a evolução e perguntar à IA' }),
    onAsk,
  };
}

describe('ChartHelp', () => {
  it('abre com Enter e fecha com Esc', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Rentabilidade acumulada desde out/25.')).toBeVisible();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Rentabilidade acumulada desde out/25.')).toBeNull();
  });

  it('abre com Espaço', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    trigger.focus();
    await user.keyboard(' ');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Acima do CDI em 2 de 12 meses')).toBeVisible();
  });

  it('"Perguntar sobre…" abre o assistente com o contexto do gráfico', async () => {
    const user = userEvent.setup();
    const { trigger, onAsk } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Perguntar sobre a evolução' }));
    expect(onAsk).toHaveBeenCalledWith({
      question: 'Por que fiquei abaixo do CDI?',
      context: ['Carteira · out/2026', 'Evolução 12M'],
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
