import { expect, test } from '@playwright/test';

test('/design responde 404 com VERCEL_ENV=production', async ({ page }) => {
  const response = await page.goto('/design');
  expect(response?.status()).toBe(404);
});
