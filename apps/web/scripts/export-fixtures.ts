/**
 * Exporta os fixtures de lib/mock para packages/fixtures.
 * - portfolio.json é servido por GET /portfolio (até o F2-3) e validado pelo contrato da API;
 * - todos juntos são a fonte do seed do Postgres no F2-2 (paridade mock × db).
 * Uso: pnpm --filter web fixtures:export
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mcpConnections } from '../lib/mock/assistant';
import { REFERENCE_DATE, assetIndex, mockUser } from '../lib/mock/assets';
import { vale3Income, vale3Peers } from '../lib/mock/fundamentals';
import { octoberPositions, septemberSnapshot } from '../lib/mock/import';
import { portfolioSummary } from '../lib/mock/portfolio';
import { defaultInputs } from '../lib/mock/projection';
import { vale3, vale3PriceHistory } from '../lib/mock/vale3';

const dir = resolve(__dirname, '../../../packages/fixtures');

const fixtures: Record<string, unknown> = {
  'portfolio.json': portfolioSummary,
  'assets.json': { dataDate: REFERENCE_DATE, user: mockUser, assets: assetIndex },
  'asset-vale3.json': { detail: vale3, prices: vale3PriceHistory() },
  'fundamentals-vale3.json': { incomeStatement: vale3Income, peers: vale3Peers },
  'import.json': { octoberPositions, previousSnapshot: septemberSnapshot },
  'projection.json': defaultInputs,
  'assistant.json': { connections: mcpConnections },
};

for (const [name, data] of Object.entries(fixtures)) {
  writeFileSync(resolve(dir, name), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`fixture exportado: packages/fixtures/${name}`);
}
