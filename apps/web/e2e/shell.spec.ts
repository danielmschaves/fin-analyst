import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from './helpers/a11y';
import { visualSuite } from './helpers/screens';

test.describe('shell', () => {
  test('navegação por teclado na barra lateral', async ({ page }) => {
    await page.goto('/carteira');
    const nav = page.getByRole('navigation', { name: 'Navegação principal' }).first();
    await expect(nav.getByRole('link', { name: 'Carteira' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
    const projecoes = nav.getByRole('link', { name: 'Projeções' });
    for (
      let i = 0;
      i < 6 && !(await projecoes.evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press('Tab');
    }
    await expect(projecoes).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/projecoes$/);
    await expect(nav.getByRole('link', { name: 'Projeções' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('"Comparar" fica desabilitado com a dica "em breve"', async ({ page }) => {
    await page.goto('/carteira');
    const nav = page.getByRole('navigation', { name: 'Navegação principal' }).first();
    await expect(nav.getByRole('link', { name: /Comparar/ })).toHaveCount(0);
    await expect(nav.getByText('em breve')).toBeVisible();
  });

  test('⌘K → "VALE3" → /ativo/VALE3', async ({ page }) => {
    await page.goto('/carteira');
    await page.keyboard.press('ControlOrMeta+k');
    const input = page.getByPlaceholder('Buscar ativo ou perguntar à IA');
    await expect(input).toBeFocused();
    await input.fill('VALE3');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/ativo\/VALE3$/);
  });

  test('texto livre no ⌘K abre o assistente', async ({ page }) => {
    await page.goto('/carteira');
    await page.getByRole('button', { name: 'Buscar ativo ou perguntar à IA' }).click();
    await page
      .getByPlaceholder('Buscar ativo ou perguntar à IA')
      .fill('por que fiquei abaixo do CDI?');
    await page.getByRole('option', { name: /Perguntar à IA/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Assistente' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('por que fiquei abaixo do CDI?');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('topo mostra a data dos dados e o menu troca o tema', async ({ page }) => {
    await page.goto('/carteira');
    await expect(page.getByText('Dados de 31/10/2026')).toBeVisible();
    await page
      .getByRole('button', { name: 'Menu do usuário: conta, tema e conexões' })
      .first()
      .click();
    await page.getByRole('menuitemradio', { name: 'Claro' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('rodapé com disclaimer e fonte D-1 em todas as telas', async ({ page }) => {
    for (const path of ['/carteira', '/ativos', '/projecoes', '/importar']) {
      await page.goto(path);
      await expect(page.getByRole('contentinfo')).toContainText(
        'não é recomendação de compra ou venda',
      );
      await expect(page.getByRole('contentinfo')).toContainText(
        'Fonte: relatório mensal B3 · cotações de fechamento (D-1)',
      );
    }
  });

  test.describe('360 px', () => {
    test.use({ viewport: { width: 360, height: 780 } });

    test('barra inferior com 4 itens, sem rolagem horizontal', async ({ page }) => {
      await page.goto('/carteira');
      const bottom = page.getByRole('navigation', { name: 'Navegação principal' }).last();
      await expect(bottom).toBeVisible();
      await expect(bottom.getByRole('link')).toHaveText([
        'Carteira',
        'Ativos',
        'Projeções',
        'Importar',
      ]);
      for (const link of await bottom.getByRole('link').all()) {
        const box = await link.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      await expectNoHorizontalScroll(page);
      await bottom.getByRole('link', { name: 'Ativos' }).click();
      await expect(page).toHaveURL(/\/ativos$/);
      await expect(page.getByRole('banner').getByText('Ativos', { exact: true })).toBeVisible();
    });

    test('busca pelo ícone no topo mobile', async ({ page }) => {
      await page.goto('/carteira');
      await page.getByRole('button', { name: 'Buscar ativo' }).click();
      await page.getByPlaceholder('Buscar ativo ou perguntar à IA').fill('taee11');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/ativo\/TAEE11$/);
      await expect(page.getByRole('link', { name: 'Voltar' })).toBeVisible();
    });
  });

  visualSuite('ativos', '/ativos', async (page) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
