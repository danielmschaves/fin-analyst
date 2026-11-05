import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '../..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('telas não importam mocks', () => {
  it('nenhum arquivo de app/ ou components/ importa lib/mock (dados só pelos repositórios)', () => {
    const offenders = ['app', 'components']
      .flatMap((d) => files(join(root, d)))
      .filter((f) => /from ['"]@\/lib\/mock\//.test(readFileSync(f, 'utf8')))
      .map((f) => relative(root, f));
    expect(offenders).toEqual([]);
  });
});
