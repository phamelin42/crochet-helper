import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Page, expect, test } from '@playwright/test';

/**
 * Audit mené **mouvement réduit**. Les boutons transitionnent leur
 * `background-color` sur 0,12 s : en posant `data-dim` puis en lançant axe
 * aussitôt, l'audit lisait des couleurs à mi-interpolation et rapportait de
 * faux défauts de contraste — `.btn-secondary` mesuré à 1,80:1 alors qu'il vaut
 * 7,70:1 au repos. Le test échouait donc sur du code correct, et seulement
 * quand la machine lançait axe dans les 120 ms : un échec intermittent.
 * `reducedMotion` déclenche la règle `prefers-reduced-motion` de
 * `tokens.css`, qui ramène toute transition à 0,01 ms : les couleurs sont
 * définitives après un rendu (voir `applyTheme`, qui l'attend), sans délai arbitraire.
 */
test.use({ reducedMotion: 'reduce' });

/**
 * Toutes les familles de page, dans les deux langues, **déduites de
 * `route-paths.json`** : une famille ajoutée par une fiche entre d'elle-même
 * dans l'audit. Les pages d'abréviation (`/glossary/:slug`) sont plus de cent
 * mais partagent un gabarit : `sc` et `ms` en sont l'échantillon.
 */
const ROUTE_PATHS = JSON.parse(
  readFileSync(join(__dirname, '../src/app/core/i18n/route-paths.json'), 'utf8'),
) as Record<string, { fr: string; en: string }>;

const ROUTES = [
  ...Object.entries(ROUTE_PATHS).flatMap(([name, paths]) => [
    { name, path: paths.en },
    { name: `${name} (fr)`, path: paths.fr === '/' ? '/fr' : `/fr${paths.fr}` },
  ]),
  { name: 'terme du glossaire', path: '/glossary/sc' },
  { name: 'terme du glossaire (fr)', path: '/fr/glossaire/ms' },
  // Route déclarée directement dans `app.routes.ts`, pas dans `route-paths.json`
  // (page d'équipe sans version anglaise) : elle échapperait sinon à l'audit.
  { name: 'vitrine du design system', path: '/design-system' },
];

/**
 * `data-dim` est le seul état que le thème sombre ajoute au DOM (voir
 * `tokens.css`) : le poser sur la page chargée suffit à auditer les jetons de
 * couleur qu'il redéfinit, sans dépendre d'une commande d'interface pour
 * le déclencher. Pas par `addInitScript` : le script tourne avant que
 * `<html>` existe, l'attribut était perdu et l'audit « assombri » relisait
 * en fait le thème clair.
 */
const THEMES = [
  { name: 'clair', dim: false },
  { name: 'sombre', dim: true },
] as const;

async function applyTheme(page: Page, dim: boolean): Promise<void> {
  if (!dim) return;
  await page.evaluate(() => document.documentElement.setAttribute('data-dim', 'true'));
  await expect(page.locator('html[data-dim="true"]')).toBeAttached();
  // Même à 0,01 ms, une transition n'est finie qu'après un rendu : sur un
  // runner chargé, axe lisait encore la couleur d'avant. On attend une image
  // puis l'absence de toute transition en cours, plutôt qu'un délai arbitraire.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await page.waitForFunction(() => document.getAnimations().length === 0);
}

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`${route.name} — thème ${theme.name} — aucune violation axe sérieuse`, async ({
      page,
    }) => {
      await page.goto(route.path);
      await expect(page.locator('main')).toBeVisible();
      await applyTheme(page, theme.dim);

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
    await page.goto('/');
    // Avant l'hydratation, le clic serait perdu (pas de rejeu d'événements).
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
    await applyTheme(page, theme.dim);

    expect(await seriousViolations(page)).toEqual([]);
  });
}

/**
 * La ligne de liste d'attente (fiche 22) n'apparaît qu'à partir de la
 * troisième étape lue : l'auditer là où elle est visible, pas seulement à
 * l'étape 1 couverte par le test précédent.
 */
for (const theme of THEMES) {
  test(`lecteur à la troisième étape — thème ${theme.name} — aucune violation axe sérieuse`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    const next = page.getByRole('button', { name: 'Next', exact: true });
    await next.click();
    await next.click();
    await applyTheme(page, theme.dim);

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
