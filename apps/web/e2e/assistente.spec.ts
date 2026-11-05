import { expect, test } from '@playwright/test';
import { visualSuite } from './helpers/screens';

const QUESTION = 'Por que fiquei abaixo do CDI em 12 meses se rendi mais que ele em outubro?';

test.describe('assistente', () => {
  test('"Perguntar sobre a evolução" abre com o contexto certo e a resposta da prancha', async ({
    page,
  }) => {
    await page.goto('/carteira');
    await page
      .getByRole('button', { name: 'Como ler a evolução em 12 meses e perguntar à IA' })
      .click();
    await page.getByRole('button', { name: 'Perguntar sobre a evolução' }).click();
    const drawer = page.getByRole('dialog', { name: 'Assistente' });
    await expect(drawer).toBeVisible();
    const chips = drawer.getByRole('list', { name: 'Contexto da conversa' });
    await expect(chips.getByRole('listitem')).toHaveText(['Carteira · out/2026', 'Evolução 12M']);
    await expect(drawer).toContainText(QUESTION);
    await expect(drawer).toContainText(
      'Consultou fin-analyst (MCP): rentabilidade mensal, CDI e Ibovespa',
    );
    await expect(drawer).toContainText('A diferença se formou no meio do ano, não em outubro.');
    await expect(drawer).toContainText('Em 12 meses: carteira +11,4%, CDI +11,8%.');
    await expect(drawer).toContainText('Descreve o passado; não é previsão nem recomendação.');
    await expect(drawer.getByRole('link', { name: '2 conexões' })).toBeVisible();
  });

  test('foco preso no drawer e Esc fecha devolvendo o foco', async ({ page }) => {
    await page.goto('/carteira');
    await page.getByRole('button', { name: 'Buscar ativo ou perguntar à IA' }).click();
    await page
      .getByPlaceholder('Buscar ativo ou perguntar à IA')
      .fill('Quanto cada ativo contribuiu no mês?');
    await page.getByRole('option', { name: /Perguntar à IA/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Assistente' });
    await expect(drawer).toContainText('PETR4 foi a que mais somou; VALE3, a que mais tirou.');
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
  });

  test('pergunta digitada no drawer e "Copiar"', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/ativo/VALE3');
    await page.setViewportSize({ width: 360, height: 780 });
    await page.getByRole('button', { name: 'Perguntar à IA', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Assistente' });
    await expect(drawer.getByRole('list', { name: 'Contexto da conversa' })).toContainText('VALE3');
    await drawer.getByLabel('Pergunte à IA').fill(QUESTION);
    await drawer.getByLabel('Pergunte à IA').press('Enter');
    await expect(drawer).toContainText('A diferença se formou no meio do ano');
    await drawer.getByRole('button', { name: 'Copiar' }).click();
    await expect(page.getByText('Resposta copiada')).toBeVisible();
  });

  test('conexões MCP: desligar uma muda a contagem no assistente', async ({ page }) => {
    await page.goto('/conexoes');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'O assistente consulta 2 conexões para responder.',
    );
    await expect(page.getByText('Chega na fase 3')).toBeVisible();
    await page.getByRole('switch', { name: 'Usar Planilha de aportes' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'O assistente consulta 1 conexão para responder.',
    );
    await page.getByRole('button', { name: 'Abrir assistente' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Assistente' }).getByRole('link', { name: '1 conexão' }),
    ).toBeVisible();
  });

  visualSuite('carteira-assistente', '/carteira', async (page) => {
    await page
      .getByRole('button', { name: 'Como ler a evolução em 12 meses e perguntar à IA' })
      .click();
    await page.getByRole('button', { name: 'Perguntar sobre a evolução' }).click();
    await expect(page.getByRole('dialog', { name: 'Assistente' })).toContainText(
      'A diferença se formou',
    );
  });

  visualSuite('conexoes', '/conexoes', async (page) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
