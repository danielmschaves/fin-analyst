import { expect, test } from '@playwright/test';
import { visualSuite } from './helpers/screens';

test.describe('/ativo/[ticker]', () => {
  test('textos e números da prancha P2-B', async ({ page }) => {
    await page.goto('/ativo/VALE3');
    await expect(page.getByRole('heading', { level: 1, name: 'Vale S.A.' })).toBeVisible();
    await expect(page.getByText('Mineração · Metais e mineração')).toBeVisible();
    await expect(page.getByText('no dia · 31/10/2026')).toBeVisible();
    await expect(page.getByRole('img', { name: 'queda de 2,85% no dia' })).toBeVisible();
    await expect(
      page.getByText('A Vale acumula −16,27% no ano, mas segue +32,58% em 5 anos.'),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Subiu até R$ 83,30 em junho e devolveu toda a alta; está 3,0% abaixo de um ano atrás.',
      ),
    ).toBeVisible();

    const strip = page.getByRole('radiogroup', { name: 'Período do gráfico e retorno no período' });
    for (const [w, v] of [
      ['5D', '−6,42%'],
      ['1M', '−16,44%'],
      ['6M', '−25,78%'],
      ['YTD', '−16,27%'],
      ['1A', '−3,00%'],
      ['2A', '+10,89%'],
      ['5A', '+32,58%'],
    ]) {
      await expect(strip.getByRole('radio', { name: new RegExp(w!) })).toContainText(v!);
    }

    const kpis = page.getByRole('region', { name: 'Indicadores' });
    for (const text of [
      'R$256,4 bi',
      '25,4 mi',
      '0,60',
      'oscila menos que o Ibovespa',
      '8,83%',
      'setor: 5,99%',
      '+1,18%',
      'setor: +0,38%',
      '120,11',
      'lucro de 12M está baixo; setor: 51,37',
      '1,42',
      '0,26%',
      'setor: 5,43%',
    ]) {
      await expect(kpis).toContainText(text);
    }
    await expect(page.getByRole('meter', { name: 'Mercado: 85 de 100, Forte' })).toBeVisible();
    await expect(page.getByText('de 100 · Médio')).toBeVisible();

    const pos = page.getByRole('region', { name: 'Minha posição' });
    await expect(pos).toContainText('−R$ 192,50');
    await expect(pos).toContainText('(−6,0%)');
    await expect(pos).toContainText('50 ações');
    await expect(pos).toContainText('R$ 64,10');
    await expect(pos).toContainText('18,6% · 3ª maior');
    await expect(pos).toContainText('Para voltar ao preço médio, a ação precisa subir 6,4%.');

    await expect(
      page.getByRole('link', { name: 'Ver DRE, Balanço e Fluxo de Caixa' }),
    ).toHaveAttribute('href', '/ativo/VALE3/fundamentos');
    await expect(page.getByRole('link', { name: 'Comparar com 6 pares' })).toBeVisible();
  });

  test('o período escolhido muda o gráfico', async ({ page }) => {
    await page.goto('/ativo/VALE3');
    await page.getByRole('radio', { name: /^5A/ }).click();
    await expect(page.getByRole('img', { name: /Preço de VALE3 em 5 anos/ })).toBeVisible();
  });

  test('KPI tem "?" com explicação', async ({ page }) => {
    await page.goto('/ativo/VALE3');
    await page.getByRole('button', { name: 'Como ler Beta e perguntar à IA' }).click();
    await expect(page.getByRole('dialog')).toContainText(
      'Abaixo de 1, a ação oscila menos que o índice.',
    );
  });

  test('ativo sem preço médio mostra o estado indisponível', async ({ page }) => {
    await page.goto('/ativo/PETR4');
    await expect(page.getByText('Preço médio indisponível')).toBeVisible();
    await page
      .getByRole('region', { name: 'Minha posição' })
      .getByRole('link', { name: 'Importar relatório' })
      .click();
    await expect(page).toHaveURL(/\/importar$/);
  });

  test('ticker inexistente → "Ativo não encontrado"', async ({ page }) => {
    const res = await page.goto('/ativo/XPTO3');
    expect(res?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ativo não encontrado' }),
    ).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  visualSuite('ativo', '/ativo/VALE3', async (page) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole('img', { name: /Preço de VALE3/ })
        .locator('svg')
        .first(),
    ).toBeVisible();
  });
});
