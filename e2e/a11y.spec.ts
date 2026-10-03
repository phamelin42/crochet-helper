import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Page, expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

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
  // « En cours », pas « présente » : sous charge, Chromium garde parfois dans
  // `getAnimations()` des transitions déjà `finished` (couleur définitive),
  // et attendre une liste vide expirait au bout de 30 s par intermittence.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState === 'finished'),
  );
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
    await pageComplete(page);
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
 * Mode page pleine (fiche 38), état par défaut d'un patron chargé : l'audit
 * porte sur ce que la lectrice voit vraiment — étape, répétitions, boutons,
 * « Outils » — sur téléphone comme sur tablette.
 */
for (const theme of THEMES) {
  test(`lecteur en page pleine — thème ${theme.name} — aucune violation axe sérieuse`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    await expect(page.locator('html[data-focus]')).toBeAttached();
    await expect(page.getByRole('button', { name: 'Tools', exact: true })).toBeVisible();
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
    await pageComplete(page);
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

/** Affichage diagramme (fiche 45) : le dessin, ses commandes et la maille marquée. */
for (const theme of THEMES) {
  test(`lecteur en diagramme — thème ${theme.name} — aucune violation axe sérieuse`, async ({
    page,
  }) => {
    await pageComplete(page);
    await page.goto('/');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.locator('#pattern-source').fill('Tree\nRound 1: 6 sc (6)\nRound 2: 12 sc (12)');
    await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
    await page.locator('.view-toggle').getByText('Chart', { exact: true }).click();
    await page.locator('.chart-cell').nth(7).click();
    await expect(page.getByRole('img', { name: /stitch 2 of 12/ })).toBeVisible();
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

/**
 * Boutons d'en-tête en icône seule à toutes les tailles (Phil, 1er octobre,
 * revenant sur la fiche 32) : nommés par `aria-label`, expliqués au survol
 * par `title`. Sur téléphone, le bouton Discord quitte l'en-tête pour laisser
 * la place au fond sombre : le pied de page garde le lien.
 */
test.describe('en-tête : boutons en icône nommée', () => {
  test('sous 900 px, « Fond sombre » est une icône nommée ; Discord reste au pied de page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const header = page.locator('fil-site-header');
    const dim = header.getByRole('button', { name: 'Dark background' });
    await expect(dim).toBeVisible();
    const content = await dim.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(content).toBe('none');
    await expect(header.getByRole('link', { name: 'Join the Discord' })).toBeHidden();
    await expect(
      page.locator('fil-site-footer').getByRole('link', { name: /Discord/ }),
    ).toBeVisible();

    expect(await seriousViolations(page)).toEqual([]);
  });

  // Phil, 1er octobre : sur ordinateur, « Fond sombre » et Discord perdent
  // leur libellé visible (l'en-tête se répartit la ligne) ; ils restent
  // nommés par aria-label et expliqués au survol par title.
  test('à 1200 px, « Fond sombre » et Discord sont des icônes nommées', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    const header = page.locator('fil-site-header');
    for (const button of [
      header.getByRole('link', { name: 'Join the Discord' }),
      header.getByRole('button', { name: 'Dark background' }),
    ]) {
      await expect(button).toBeVisible();
      const content = await button.evaluate((el) => getComputedStyle(el, '::after').content);
      expect(content).toBe('none');
      expect(await button.getAttribute('title')).toBe(await button.getAttribute('aria-label'));
    }
    // Marque, navigation et boutons sur une seule ligne.
    const marque = (await header.locator('.nav-brand').boundingBox())!;
    const outils = (await header.locator('.tools').boundingBox())!;
    expect(Math.abs(outils.y + outils.height / 2 - (marque.y + marque.height / 2))).toBeLessThan(8);
    expect(await seriousViolations(page)).toEqual([]);
  });
});

/**
 * Mode appli (fiche 43) : barre de titre et onglets en bas, sur l'accueil et
 * sur Réglages, en clair et en sombre. L'onglet actif est en `--color-primary`
 * sur la surface : c'est le contraste à tenir.
 */
for (const theme of THEMES) {
  for (const onglet of ['Read', 'Settings']) {
    test(`mode appli, onglet ${onglet} — thème ${theme.name} — aucune violation axe sérieuse`, async ({
      page,
    }) => {
      await page.goto('/?mode=app');
      await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: onglet, exact: true })
        .click();
      await expect(page.locator('.app-bar')).toHaveText(onglet);
      await applyTheme(page, theme.dim);

      expect(await seriousViolations(page)).toEqual([]);
    });
  }
}

async function seriousViolations(page: Page): Promise<unknown[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(({ id, help, nodes }) => ({ id, help, cibles: nodes.map((node) => node.target) }));
}
