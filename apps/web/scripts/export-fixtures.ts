/**
 * Exporta os fixtures de lib/mock para packages/fixtures (servidos pela services/api).
 * Uso: pnpm --filter web fixtures:export
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { portfolioSummary } from '../lib/mock/portfolio';

const out = resolve(__dirname, '../../../packages/fixtures/portfolio.json');
writeFileSync(out, `${JSON.stringify(portfolioSummary, null, 2)}\n`);
console.log(`fixture exportado: ${out}`);
