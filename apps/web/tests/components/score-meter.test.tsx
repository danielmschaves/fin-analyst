import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PillarBars } from '@/components/painel/pillar-bars';
import { ScoreMeter } from '@/components/painel/score-meter';
import { scoreLabel, scoreLevel } from '@/lib/score';

describe('ScoreMeter', () => {
  it.each([
    [51, 'Médio', 3],
    [60, 'Forte', 4],
    [39, 'Fraco', 2],
    [12, 'Fraco', 1],
    [93, 'Forte', 5],
    [100, 'Forte', 5],
  ])('%i → %s (nível %i)', (score, label, level) => {
    render(<ScoreMeter score={score} />);
    const el = screen.getByRole('img', { name: `Classificação ${score} de 100, ${label}` });
    expect(el).toHaveTextContent(label);
    expect(el.querySelectorAll('[data-filled="true"]')).toHaveLength(level);
  });

  it('nunca usa rótulos de compra ou venda', () => {
    for (let s = 0; s <= 100; s++) expect(['Fraco', 'Médio', 'Forte']).toContain(scoreLabel(s));
    expect(scoreLevel(-5)).toBe(1);
    expect(scoreLevel(140)).toBe(5);
  });
});

describe('PillarBars', () => {
  it('expõe cada pilar como meter com valor e rótulo', () => {
    render(
      <PillarBars
        pillars={[
          { name: 'Caixa', score: 69 },
          { name: 'Valuation', score: 40 },
        ]}
      />,
    );
    const caixa = screen.getByRole('meter', { name: 'Caixa: 69 de 100, Forte' });
    expect(caixa).toHaveAttribute('aria-valuenow', '69');
    expect(screen.getByRole('meter', { name: 'Valuation: 40 de 100, Médio' })).toBeInTheDocument();
  });
});
