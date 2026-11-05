import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const PROD_PORT = 3101;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /production\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'production',
      testMatch: /production\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${PROD_PORT}` },
    },
  ],
  webServer: [
    {
      command: `pnpm start --port ${PORT}`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `pnpm start --port ${PROD_PORT}`,
      url: `http://127.0.0.1:${PROD_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VERCEL_ENV: 'production' },
    },
  ],
});
