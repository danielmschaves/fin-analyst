import { expect, test } from '@playwright/test';
import { visualSuite } from './helpers/screens';

test.describe('/carteira', () => {
  test('frase, números do topo e insights da prancha P2-A', async ({ page }) => {
    await page.goto('/carteira');
    await expect(page.getByText('Outubro de 2026 · posição em 31/10')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Sua carteira rendeu +1,33% em outubro, acima do CDI.',
    );
    await expect(
      page.getByText('Em 12 meses, porém, ficou 0,4 p.p. abaixo dele: +11,4% contra +11,8%.'),
    ).toBeVisible();
    const stats = page.getByRole('region', { name: 'Números do mês' });
    await expect(stats).toContainText('R$16.188,02');
    await expect(stats).toContainText('7 posições em 3 classes');
    await expect(stats).toContainText('+R$212,40');
    await expect(stats).toContainText('CDI +0,89%');
    await expect(stats).toContainText('+11,4%');
    await expect(stats).toContainText('CDI 12M: +11,8%');
    await expect(stats).toContainText('≈ R$ 1.279 por ano');

    await expect(
      page.getByRole('img', {
        name: /Rentabilidade acumulada: carteira \+11,4%, CDI \+11,8%, Ibovespa \+6,3%/,
      }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Como ler a evolução em 12 meses e perguntar à IA' })
      .click();
    const help = page.getByRole('dialog');
    await expect(help).toContainText('Maior distância do CDI: −2,6 p.p.');
    await expect(help).toContainText('Acima do CDI em 2 de 12 meses');
    await expect(help).toContainText('Dezembro e abril.');
    await expect(help).toContainText('Pior mês: −1,4% (jun), contra −2,0% do índice (jul).');
    await page.keyboard.press('Escape');

    await expect(page.getByText('Só PETR4 e VALE3 somam 42% da carteira.')).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Por classe: Ações 61,2%, FIIs 19,0%, Renda fixa 19,8%' }),
    ).toBeVisible();
    await expect(page.getByText('Equivalem a 28% do resultado do mês.')).toBeVisible();
    await expect(page.getByText('R$ 59,80')).toBeVisible();
  });

  test('tabela de posições: grupos, ordenação por valor e colunas', async ({ page }) => {
    await page.goto('/carteira');
    const table = page.getByRole('table', { name: 'Posições da carteira por classe' });
    await expect(table.getByRole('rowheader', { name: 'Ações · 61,2%' })).toBeVisible();
    await expect(table.getByRole('rowheader', { name: 'Renda fixa · 19,8%' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: /Valor/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    const vale = table.getByRole('row', { name: /VALE3/ });
    await expect(vale).toContainText('3.012,50');
    await expect(vale.getByRole('img', { name: 'Classificação 51 de 100, Médio' })).toBeVisible();
    await expect(vale.getByRole('img', { name: 'queda de 16,4% no mês' })).toBeVisible();
    await page.getByRole('button', { name: 'Colunas de posições' }).click();
    await page.getByRole('menuitemcheckbox', { name: 'Preço' }).click();
    await page.keyboard.press('Escape');
    await expect(table.getByRole('columnheader', { name: 'Preço' })).toHaveCount(0);
    await table.getByRole('link', { name: /VALE3/ }).click();
    await expect(page).toHaveURL(/\/ativo\/VALE3$/);
  });

  test('período 6M rebaseia o gráfico', async ({ page }) => {
    await page.goto('/carteira');
    await page.getByRole('button', { name: '6M', exact: true }).click();
    await expect(page.getByRole('button', { name: '6M', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      page.getByRole('img', { name: /^Rentabilidade acumulada: carteira \+5,2%/ }),
    ).toBeVisible();
  });

  test('"Perguntar sobre a evolução" abre o assistente com o contexto', async ({ page }) => {
    await page.goto('/carteira');
    await page
      .getByRole('button', { name: 'Como ler a evolução em 12 meses e perguntar à IA' })
      .click();
    await page.getByRole('button', { name: 'Perguntar sobre a evolução' }).click();
    await expect(page.getByRole('dialog', { name: 'Assistente' })).toBeVisible();
  });

  visualSuite('carteira', '/carteira', async (page) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole('img', { name: /Rentabilidade acumulada/ })
        .locator('svg')
        .first(),
    ).toBeVisible();
  });
});
