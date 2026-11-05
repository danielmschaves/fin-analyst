import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('mantém tamanho de texto do Painel 2 junto com a cor', () => {
    expect(cn('text-accent-foreground', 'text-small')).toBe('text-accent-foreground text-small');
    expect(cn('text-small', 'text-caption')).toBe('text-caption');
  });
});
