import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Les six familles de page du produit. Une page par abréviation (`/glossary/:slug`)
 * en compte plus de cent, mais elles partagent le même gabarit : `sc` en est
 * l'échantillon.
 */
const ROUTES = [
  { name: 'lecteur', path: '/' },
  { name: 'glossaire', path: '/glossary' },
  { name: 'terme du glossaire', path: '/glossary/sc' },
  { name: 'bien formater son patron', path: '/format-your-pattern' },
  { name: 'convertisseur US ↔ UK', path: '/us-uk-converter' },
  { name: 'mes projets', path: '/my-projects' },
] as const;

/**
 * `data-dim` est le seul état que le thème assombri ajoute au DOM (voir
 * `tokens.css`) : le poser avant navigation suffit à auditer les jetons de
 * couleur qu'il redéfinit, sans dépendre d'une commande d'interface pour
 * le déclencher.
 */
const THEMES = [
  { name: 'normal', dim: false },
  { name: 'assombri', dim: true },
] as const;

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`${route.name} — thème ${theme.name} — aucune violation axe sérieuse`, async ({
      page,
    }) => {
      if (theme.dim) {
        await page.addInitScript(() => document.documentElement.setAttribute('data-dim', 'true'));
      }
      await page.goto(route.path);
      await expect(page.locator('main')).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const serious = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  }
}
