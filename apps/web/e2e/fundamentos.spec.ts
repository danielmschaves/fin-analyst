import { expect, test } from '@playwright/test';
import { visualSuite } from './helpers/screens';

test.describe('/ativo/[ticker]/fundamentos', () => {
  test('textos e números da prancha P2-C', async ({ page }) => {
    await page.goto('/ativo/VALE3/fundamentos');
    await expect(page.getByRole('link', { name: 'Fundamentos', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(
      page.getByText(
        'A receita ficou estável (+1,2% em 12 meses), mas o lucro encolheu: a margem líquida caiu de 11,8% no 4T24 para 2,9% no 3T26.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        'O prejuízo do 1T26 veio do resultado financeiro (−R$ 11,8 bi), não da operação: o EBITDA do trimestre foi de R$ 17,0 bi.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: /3T26: receita 52,2 bi, lucro 1,5 bi, margem 2,9%/ }),
    ).toBeVisible();

    const dre = page.getByRole('table', { name: 'DRE trimestral em R$ bi' });
    await expect(dre.getByRole('row', { name: /EBITDA/ })).toContainText('20,9');
    await expect(dre.getByRole('row', { name: /IR\/CS e outros/ })).toContainText('−8,3');
    await expect(dre.getByRole('row', { name: /Lucro líquido/ })).toContainText('−21,1%');

    const peers = page.getByRole('table', { name: 'VALE3 comparada a 6 pares e à média do setor' });
    await expect(peers.getByRole('columnheader', { name: /Classificação/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    await expect(peers.getByRole('rowheader')).toHaveText([
      /VALE3/,
      'Média do setor',
      /GGBR4/,
      /USIM5/,
      /CMIN3/,
      /KLBN11/,
      /CSNA3/,
      /FESA4/,
    ]);
    await expect(peers.getByRole('row', { name: /CSNA3/ })).toContainText('N/A');
    await expect(peers.getByRole('row', { name: /USIM5/ })).toContainText('—');
    await expect(
      page.getByText(
        'VALE3 tem a 2ª menor classificação e o 2º maior P/L do grupo; o DY (8,83%) fica acima da média (5,99%).',
      ),
    ).toBeVisible();
  });

  test('"Comparar com 6 pares" leva à seção de pares', async ({ page }) => {
    await page.goto('/ativo/VALE3');
    await page.getByRole('link', { name: 'Comparar com 6 pares' }).click();
    await expect(page).toHaveURL(/\/ativo\/VALE3\/fundamentos#pares$/);
    await expect(page.getByRole('heading', { name: 'Pares', level: 2 })).toBeInViewport();
  });

  test.describe('360 px', () => {
    test.use({ viewport: { width: 360, height: 780 } });

    test('a primeira coluna da DRE fica fixa ao rolar a tabela', async ({ page }) => {
      await page.goto('/ativo/VALE3/fundamentos');
      const table = page.getByRole('table', { name: 'DRE trimestral em R$ bi' });
      const header = table.getByRole('rowheader', { name: 'Receita líquida' });
      const before = await header.boundingBox();
      await table.evaluate((t) => {
        t.parentElement!.scrollLeft = 400;
      });
      expect(await table.evaluate((t) => t.parentElement!.scrollLeft)).toBeGreaterThan(0);
      const after = await header.boundingBox();
      expect(after!.x).toBeCloseTo(before!.x, 0);
      // a coluna fixa cobre o conteúdo que passa por baixo
      await expect(header).toHaveCSS('position', 'sticky');
    });
  });

  visualSuite('fundamentos', '/ativo/VALE3/fundamentos', async (page) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole('img', { name: /Receita líquida e lucro/ })
        .locator('svg')
        .first(),
    ).toBeVisible();
  });
});
