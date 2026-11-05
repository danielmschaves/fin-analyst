import { expect, test } from '@playwright/test';

test('a raiz leva para a carteira', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/carteira$/);
});
