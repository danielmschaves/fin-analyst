import { expect, test, type Page } from '@playwright/test';
import {
  expectNoHorizontalScroll,
  expectNoSeriousA11yViolations,
  useTheme,
  type Theme,
} from './a11y';

export const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '360', width: 360, height: 780 },
] as const;
export const THEMES: Theme[] = ['light', 'dark'];

/** Para cada tema × largura: axe, sem rolagem horizontal e screenshot da página inteira. */
export function visualSuite(name: string, path: string, ready: (page: Page) => Promise<void>) {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      test(`${name} · ${theme} · ${vp.name}px`, async ({ page }) => {
        await useTheme(page, theme);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(path);
        await ready(page);
        await page.evaluate(() => document.fonts.ready);
        await expectNoSeriousA11yViolations(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot(`${name}-${theme}-${vp.name}.png`, { fullPage: true });
      });
    }
  }
}
