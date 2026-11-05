import Ajv2020 from 'ajv/dist/2020';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PortfolioSummary } from '@/lib/contracts';
import { portfolioSummary } from '@/lib/mock/portfolio';

const root = join(__dirname, '../../../..');
const schema = JSON.parse(
  readFileSync(join(root, 'packages/contracts/portfolio-summary.schema.json'), 'utf8'),
);
const fixture = JSON.parse(
  readFileSync(join(root, 'packages/fixtures/portfolio.json'), 'utf8'),
) as PortfolioSummary;

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

describe('contrato PortfolioSummary: lib/contracts.ts × services/api', () => {
  it('o mock tipado por lib/contracts.ts é válido no schema da API (sem campos a mais ou a menos)', () => {
    const ok = validate(portfolioSummary);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it('o fixture servido por GET /portfolio é o mesmo do mock (rode `pnpm --filter web fixtures:export`)', () => {
    expect(fixture).toEqual(JSON.parse(JSON.stringify(portfolioSummary)));
  });

  it('o schema recusa um campo que não existe no contrato', () => {
    expect(validate({ ...portfolioSummary, extra: 1 })).toBe(false);
    const withoutMonth: Partial<PortfolioSummary> = { ...portfolioSummary };
    delete withoutMonth.month;
    expect(validate(withoutMonth)).toBe(false);
  });

  it('cada chave de PortfolioPosition existe no schema', () => {
    const props = Object.keys(schema.$defs.PortfolioPosition.properties).sort();
    expect(props).toEqual(Object.keys(portfolioSummary.positions[0]!).sort());
  });
});
