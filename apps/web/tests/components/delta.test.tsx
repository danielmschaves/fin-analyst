import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Delta } from '@/components/painel/delta';

describe('Delta', () => {
  it('positivo: sinal +, seta para cima e cor positiva', () => {
    render(<Delta value={1.33} />);
    const el = screen.getByRole('img', { name: 'alta de 1,33%' });
    expect(el).toHaveTextContent('+1,33%');
    expect(el.querySelector('svg path')?.getAttribute('d')).toBe('M4 1L7.5 6.5H0.5Z');
    expect(el.className).toContain('text-positive');
  });

  it('negativo: sinal −, seta para baixo e cor negativa', () => {
    render(<Delta value={-16.27} context="no ano" />);
    const el = screen.getByRole('img', { name: 'queda de 16,27% no ano' });
    expect(el).toHaveTextContent('−16,27%');
    expect(el.querySelector('svg path')?.getAttribute('d')).toBe('M4 7L0.5 1.5H7.5Z');
    expect(el.className).toContain('text-negative');
  });

  it('zero: sem seta e sem cor de resultado', () => {
    render(<Delta value={0} />);
    const el = screen.getByRole('img', { name: '0,00%, estável' });
    expect(el.querySelector('svg')).toBeNull();
    expect(el.className).toContain('text-muted-foreground');
  });

  it('formata reais e pontos percentuais', () => {
    render(
      <>
        <Delta value={-192.5} format="brl" />
        <Delta value={-2.6} format="pp" />
      </>,
    );
    expect(screen.getByRole('img', { name: 'queda de R$ 192,50' })).toHaveTextContent('−R$ 192,50');
    expect(screen.getByRole('img', { name: 'queda de 2,6 p.p.' })).toBeInTheDocument();
  });
});
