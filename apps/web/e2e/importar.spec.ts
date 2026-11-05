import { expect, test, type Page } from '@playwright/test';
import { visualSuite } from './helpers/screens';

const FILE = 'relatorio-consolidado-mensal-2026-outubro.xlsx';

async function upload(
  page: Page,
  name = FILE,
  size = 48 * 1024,
  mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
) {
  await page
    .getByLabel('Escolher arquivo')
    .setInputFiles({ name, mimeType, buffer: Buffer.alloc(size, 1) });
}

test.describe('/importar', () => {
  test('fluxo completo: enviar → revisar → confirmar → toast', async ({ page }) => {
    await page.goto('/importar');
    await expect(page.getByRole('listitem').filter({ hasText: 'Enviar arquivo' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    await upload(page);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Encontramos 7 posições no relatório de outubro.',
    );
    await expect(
      page.getByText('Confira antes de atualizar a carteira. Nada muda até você confirmar.'),
    ).toBeVisible();
    await expect(page.getByText(FILE)).toBeVisible();
    await expect(
      page.getByText('Relatório consolidado mensal B3 · 31/10/2026 · 48 KB'),
    ).toBeVisible();

    const table = page.getByRole('table', { name: 'Posições encontradas no relatório' });
    await expect(table.getByRole('columnheader', { name: 'Comparado a setembro' })).toBeVisible();
    await expect(table.getByRole('row', { name: /MXRF11/ })).toContainText('quantidade +50');
    await expect(table.getByRole('row', { name: /CDB DI/ })).toContainText('valor atualizado');
    await expect(table.getByRole('row', { name: /PETR4/ })).toContainText('sem mudança');

    const summary = page.getByRole('complementary', { name: 'Resumo da importação' });
    await expect(summary).toContainText('Posições7');
    await expect(summary).toContainText('Novas0');
    await expect(summary).toContainText('Alteradas2');
    await expect(summary).toContainText('Patrimônio após importarR$ 16.188,02');
    await expect(page.getByRole('note')).toContainText('CDB DI sem preço unitário');

    // desmarcar uma posição atualiza o resumo
    await page.getByRole('checkbox', { name: 'Incluir TAEE11' }).uncheck();
    await expect(summary).toContainText('Posições6');
    await expect(summary).toContainText('R$ 15.138,02');
    await page.getByRole('checkbox', { name: 'Incluir TAEE11' }).check();

    await page.getByRole('button', { name: 'Continuar para confirmação' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Confirmar' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    await page.getByRole('button', { name: 'Atualizar carteira' }).click();

    await expect(page.getByText('Carteira atualizada', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('7 posições de outubro foram consolidadas.').first()).toBeVisible();
    await page.getByRole('link', { name: 'Ver carteira' }).first().click();
    await expect(page).toHaveURL(/\/carteira$/);
  });

  test('recusa tipo de arquivo não aceito', async ({ page }) => {
    await page.goto('/importar');
    await upload(page, 'extrato.csv', 1000, 'text/csv');
    await expect(page.getByText('Arquivo não reconhecido')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Envie o relatório mensal da B3.',
    );
  });

  test('recusa arquivo maior que 10 MB', async ({ page }) => {
    await page.goto('/importar');
    await upload(page, FILE, 10 * 1024 * 1024 + 1);
    await expect(page.getByText('Arquivo maior que 10 MB')).toBeVisible();
  });

  test('aceita .pdf', async ({ page }) => {
    await page.goto('/importar');
    await upload(
      page,
      'relatorio-consolidado-mensal-2026-outubro.pdf',
      120 * 1024,
      'application/pdf',
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Encontramos 7 posições no relatório de outubro.',
    );
  });

  test('"Trocar arquivo" volta ao primeiro passo', async ({ page }) => {
    await page.goto('/importar');
    await upload(page);
    await page.getByRole('button', { name: 'Trocar arquivo' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Envie o relatório mensal da B3.',
    );
  });

  visualSuite('importar', '/importar', async (page) => {
    await upload(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Encontramos 7 posições/);
  });
});
