import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { routesPrerendues } from './routes';

for (const route of routesPrerendues()) {
  test.describe(route, () => {
    test('axe : aucune violation WCAG 2.1 AA', async ({ page }) => {
      await page.goto(route);
      await page.locator('app-root[data-ready]').waitFor();
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual(
        [],
      );
    });

    test('reflow : rien ne déborde à 320 px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(route);
      const deborde = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(deborde).toBe(false);
    });

    test('contenu présent sans JavaScript (pré-rendu)', async ({ browser }) => {
      const contexte = await browser.newContext({ javaScriptEnabled: false });
      const page = await contexte.newPage();
      await page.goto(route);
      await expect(page.locator('h1')).not.toBeEmpty();
      await contexte.close();
    });
  });
}
