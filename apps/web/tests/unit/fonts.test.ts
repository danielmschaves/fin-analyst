import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = join(__dirname, '../../app');

describe('fontes self-hosted', () => {
  it('o layout não baixa fontes do Google no build', () => {
    const layout = readFileSync(join(app, 'layout.tsx'), 'utf8');
    expect(layout).not.toContain('next/font/google');
    expect(layout).toContain('next/font/local');
  });

  it.each(['geist-latin.woff2', 'faustina-latin.woff2', 'OFL-geist.txt', 'OFL-faustina.txt'])(
    '%s existe',
    (f) => {
      expect(existsSync(join(app, 'fonts', f))).toBe(true);
    },
  );
});
