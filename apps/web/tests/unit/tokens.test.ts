import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allColorTokens } from '@/lib/tokens';

const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8').toLowerCase();
const light = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'));
const dark = css.slice(css.indexOf('.dark {'), css.indexOf('@theme inline'));

describe('globals.css implementa todos os tokens da prancha P2-Tokens', () => {
  it.each(allColorTokens)('$name', ({ name, light: l, dark: d }) => {
    expect(light).toContain(`${name}: ${l.toLowerCase()};`);
    expect(dark).toContain(`${name}: ${d.toLowerCase()};`);
  });

  it('inclui raios, elevação e movimento', () => {
    for (const t of [
      '--radius-sm',
      '--radius-md',
      '--radius-lg',
      '--radius-full',
      '--duration',
      '--ease',
    ]) {
      expect(light).toContain(t);
    }
    for (const t of ['--elevation-0', '--elevation-1', '--elevation-2', '--elevation-3']) {
      expect(light).toContain(t);
      expect(dark).toContain(t);
    }
  });

  it('mapeia os aliases do shadcn', () => {
    for (const t of ['--card', '--primary', '--muted', '--popover', '--destructive', '--input']) {
      expect(light).toContain(`${t}:`);
    }
  });
});
