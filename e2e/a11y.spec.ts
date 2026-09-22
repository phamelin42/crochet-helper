import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';

/**
 * Les six familles de page du produit, dans les deux langues : la version
 * française a ses propres libellés, son propre `lang`, et se casse
 * indépendamment. Une page par abréviation (`/glossary/:slug`) en compte plus
 * de cent, mais elles partagent le même gabarit : `sc` / `ms` en sont
 * l'échantillon.
 */
const ROUTES = [
  { name: 'lecteur', path: '/' },
  { name: 'glossaire', path: '/glossary' },
  { name: 'terme du glossaire', path: '/glossary/sc' },
  { name: 'bien formater son patron', path: '/format-your-pattern' },
  { name: 'convertisseur US ↔ UK', path: '/us-uk-converter' },
  { name: 'mes projets', path: '/my-projects' },
  { name: 'lecteur (fr)', path: '/fr' },
  { name: 'glossaire (fr)', path: '/fr/glossaire' },
  { name: 'terme du glossaire (fr)', path: '/fr/glossaire/ms' },
  { name: 'bien formater son patron (fr)', path: '/fr/bien-formater-son-patron' },
  { name: 'convertisseur US ↔ UK (fr)', path: '/fr/convertisseur-us-uk' },
  { name: 'mes projets (fr)', path: '/fr/mes-projets' },
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

      expect(await seriousViolations(page)).toEqual([]);
    });
  }
}

/**
 * L'état principal du lecteur n'est pas la page vide : c'est un patron
 * chargé — étape en très grand, compteurs, abréviations à infobulle, liste des
 * pièces. C'est là que la lectrice passe son temps.
 */
for (const theme of THEMES) {
  test(`lecteur avec un patron chargé — thème ${theme.name} — aucune violation axe sérieuse`, async ({
    page,
  }) => {
    if (theme.dim) {
      await page.addInitScript(() => document.documentElement.setAttribute('data-dim', 'true'));
    }
    await page.goto('/');
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();

    expect(await seriousViolations(page)).toEqual([]);
  });
}

/**
 * WCAG 1.4.10 (reflow) : à 320 px de large — l'équivalent d'un zoom à 400 %
 * sur un écran de 1280 px — aucune page ne défile horizontalement. Axe ne le
 * voit pas ; c'était vérifié à la main.
 */
for (const route of ROUTES) {
  test(`${route.name} — 320 px de large — aucun défilement horizontal`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route.path);
    await expect(page.locator('main')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

async function seriousViolations(page: Page): Promise<unknown[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(({ id, help, nodes }) => ({ id, help, cibles: nodes.map((node) => node.target) }));
}
