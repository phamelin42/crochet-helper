import AxeBuilder from '@axe-core/playwright';
import { Page, expect, test } from '@playwright/test';
import { appsConstruites, routesPrerendues } from './apps';

async function axe(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target).join(', ')}`);
}

for (const app of appsConstruites()) {
  test.describe(app.nom, () => {
    test.use({ baseURL: `http://localhost:${app.port}` });

    for (const route of routesPrerendues(app.dist)) {
      test(`${route} — axe : aucune violation WCAG 2.1 AA`, async ({ page }) => {
        await page.goto(route);
        await page.locator('mp-shell[data-ready]').waitFor();
        expect(await axe(page)).toEqual([]);
      });

      test(`${route} — reflow : rien ne déborde à 320 px`, async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.goto(route);
        const deborde = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(deborde).toBe(false);
      });

      test(`${route} — contenu présent sans JavaScript`, async ({ browser }) => {
        const contexte = await browser.newContext({
          javaScriptEnabled: false,
          baseURL: `http://localhost:${app.port}`,
        });
        const page = await contexte.newPage();
        await page.goto(route);
        await expect(page.locator('h1')).not.toBeEmpty();
        await contexte.close();
      });
    }

    test('thème sombre, s’il est proposé : explicite et lisible', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      await page.locator('mp-shell[data-ready]').waitFor();
      // Le réglage système ne suffit jamais à passer en sombre.
      expect(await page.locator('html').getAttribute('data-theme')).toBeNull();
      const bouton = page.getByRole('button', { name: 'Fond sombre' });
      test.skip((await bouton.count()) === 0, 'produit sans thème sombre');
      await bouton.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'sombre');
      expect(await axe(page)).toEqual([]);
    });
  });
}
