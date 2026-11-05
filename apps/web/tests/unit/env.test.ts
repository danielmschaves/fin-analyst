import { describe, expect, it } from 'vitest';
import { isDesignRouteEnabled } from '@/lib/env';

describe('isDesignRouteEnabled', () => {
  it('fica desligado só em produção na Vercel', () => {
    expect(isDesignRouteEnabled('production')).toBe(false);
    expect(isDesignRouteEnabled('preview')).toBe(true);
    expect(isDesignRouteEnabled(undefined)).toBe(true);
  });
});
