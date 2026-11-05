import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations, useTheme } from './helpers/a11y';

test.describe('/design', () => {
  test('dark é o padrão e o tema alterna para light', async ({ page }) => {
    await page.goto('/design');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: 'Tema escuro' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: 'Tema escuro' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`sem violações de acessibilidade · ${theme}`, async ({ page }) => {
      await useTheme(page, theme);
      await page.goto('/design');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoSeriousA11yViolations(page);
    });
  }
});
