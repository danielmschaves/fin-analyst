import { expect, test } from '@playwright/test';
import { visualSuite } from './helpers/screens';

test.describe('/projecoes', () => {
  test('textos e números da prancha P2-E', async ({ page }) => {
    await page.goto('/projecoes');
    await expect(page.getByText('Projeções · simulação a partir de 31/10/2026')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Mantendo R$ 500 por mês e o ritmo dos últimos 12 meses, a carteira chegaria a cerca de R$ 67 mil em 5 anos.',
    );
    await expect(
      page.getByText(
        'Em valores de hoje (IPCA de 4% a.a.), cerca de R$ 55 mil. Entre os cenários, de R$ 61 mil a R$ 74 mil.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: /meta de R\$ 50 mil em jun\/2030 no cenário base/ }),
    ).toBeVisible();

    const table = page.getByRole('table', { name: 'Cenários de projeção em 5 anos' });
    await expect(table.getByRole('row', { name: /Conservador/ })).toContainText('61.056,84');
    await expect(table.getByRole('row', { name: /Conservador/ })).toContainText('50.184,27');
    await expect(table.getByRole('row', { name: /Conservador/ })).toContainText('+14.868,82');
    await expect(table.getByRole('row', { name: /Conservador/ })).toContainText('out/2030');
    await expect(table.getByRole('row', { name: /^Base/ })).toContainText('67.367,68');
    await expect(table.getByRole('row', { name: /^Base/ })).toContainText('jun/2030');
    await expect(table.getByRole('row', { name: /Otimista/ })).toContainText('74.270,01');
    await expect(table.getByRole('row', { name: /Otimista/ })).toContainText('fev/2030');
    await expect(table.getByRole('row', { name: /Só aportes/ })).toContainText('46.188,02');
    await expect(table.getByRole('row', { name: /Só aportes/ })).toContainText('jun/2032');

    const weight = page.getByRole('region', { name: 'O que mais pesa' });
    await expect(weight).toContainText('Neste horizonte, o aporte pesa mais que a rentabilidade.');
    await expect(weight).toContainText('+R$7.919');
    await expect(weight).toContainText('+R$2.233');
    await expect(weight).toContainText('≈ R$ 5.322');
    await expect(page.getByText(/Não é previsão nem recomendação/)).toBeVisible();
  });

  test('mudar o aporte atualiza a frase e a tabela', async ({ page }) => {
    await page.goto('/projecoes');
    await page.getByLabel('Aporte mensal').fill('600,00');
    await page.getByRole('button', { name: 'Recalcular' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Mantendo R$ 600 por mês e o ritmo dos últimos 12 meses, a carteira chegaria a cerca de R$ 75 mil em 5 anos.',
    );
    const table = page.getByRole('table', { name: 'Cenários de projeção em 5 anos' });
    // base + sensibilidade de R$ 100/mês = 67.367,68 + 7.918,97
    await expect(table.getByRole('row', { name: /^Base/ })).toContainText('75.286,65');
    await expect(table.getByRole('row', { name: /Só aportes/ })).toContainText('52.188,02');

    await page.getByRole('button', { name: 'Restaurar' }).click();
    await expect(table.getByRole('row', { name: /^Base/ })).toContainText('67.367,68');
  });

  test('valor inválido mostra erro e não recalcula', async ({ page }) => {
    await page.goto('/projecoes');
    await page.getByRole('textbox', { name: /^Meta/ }).fill('abc');
    await page.getByRole('textbox', { name: /^Meta/ }).press('Enter');
    await expect(page.getByRole('textbox', { name: /^Meta/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.getByText('Digite um número (ex.: 1.000,00)')).toBeVisible();
  });

  test('horizonte de 10 anos troca a tabela', async ({ page }) => {
    await page.goto('/projecoes');
    await page.getByRole('button', { name: '10 anos' }).click();
    await expect(
      page.getByRole('table', { name: 'Cenários de projeção em 10 anos' }),
    ).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Em out/2036' })).toBeVisible();
  });

  test('chaves de proventos e valores de hoje', async ({ page }) => {
    await page.goto('/projecoes');
    const reinvest = page.getByRole('switch', { name: 'Reinvestir proventos' });
    await expect(reinvest).toHaveAttribute('aria-checked', 'true');
    await reinvest.click();
    await expect(page.getByText(/proventos retirados/)).toBeVisible();
    await page.getByRole('switch', { name: 'Mostrar em valores de hoje' }).click();
    await expect(page.getByText(/^Valores de hoje · /)).toBeVisible();
  });

  visualSuite('projecoes', '/projecoes', async (page) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole('img', { name: /Projeção do patrimônio/ })
        .locator('svg')
        .first(),
    ).toBeVisible();
  });
});
