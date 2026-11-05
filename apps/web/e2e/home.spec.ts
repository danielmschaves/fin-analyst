import { expect, test } from '@playwright/test';

test('abre a página inicial', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'fin-analyst' })).toBeVisible();
});
