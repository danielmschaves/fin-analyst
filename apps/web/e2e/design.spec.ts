import { expect, test } from '@playwright/test';
import { visualSuite } from './helpers/screens';

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

  test('o "?" abre com teclado e fecha com Esc', async ({ page }) => {
    await page.goto('/design');
    const trigger = page.getByRole('button', { name: 'Como ler a evolução e perguntar à IA' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toContainText('Maior distância do CDI: −2,6 p.p.');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('ordenação e seletor de colunas da tabela', async ({ page }) => {
    await page.goto('/design');
    const header = page.getByRole('columnheader', { name: /Classificação/ });
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await header.getByRole('button').click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await page.getByRole('button', { name: 'Colunas de exemplo' }).click();
    await page.getByRole('menuitemcheckbox', { name: 'DY' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('columnheader', { name: 'DY' })).toHaveCount(0);
  });

  visualSuite('design', '/design', async (page) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
