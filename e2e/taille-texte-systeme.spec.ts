import { type Page, expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pageComplete } from './page-complete';

/**
 * Taille du texte du système (fiche 42). Chromium de bureau n'a pas le
 * réglage d'Android : on simule la « taille de police » du système par CDP
 * (`Page.setFontSizes`), que la racine `html` (sans `font-size` propre)
 * reprend. Les crans A / A+ / A++ multiplient cette base.
 */

const CRANS = ['A', 'A+', 'A++'];

async function ouvrir(page: Page, base: number, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: base } });
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.locator('.step-body')).toContainText('in magic ring');
}

const taille = (page: Page, selecteur: string) =>
  page
    .locator(selecteur)
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

test('le HTML pré-rendu de « / » porte la balise text-scale', () => {
  const html = readFileSync('dist/fil-patterns/browser/index.html', 'utf8');
  expect(html).toContain('<meta name="text-scale" content="scale"');
});

test.describe('page complète', () => {
  test.beforeEach(async ({ page }) => pageComplete(page));

  for (const cran of CRANS) {
    test(`taille ${cran} : l'étape et le corps de texte suivent la base du système`, async ({
      page,
    }) => {
      const mesures: Record<number, { etape: number; corps: number }> = {};
      for (const base of [16, 24, 32]) {
        await ouvrir(page, base, { width: 820, height: 1180 });
        await page.getByText(cran, { exact: true }).click();
        mesures[base] = {
          etape: await taille(page, '.step-body'),
          corps: await taille(page, 'body'),
        };
      }
      for (const [base, rapport] of [
        [24, 1.5],
        [32, 2],
      ] as const) {
        expect(mesures[base].etape / mesures[16].etape).toBeCloseTo(rapport, 1);
        expect(mesures[base].corps / mesures[16].corps).toBeCloseTo(rapport, 1);
      }
    });
  }

  test('A++ reste plus grand que A, quelle que soit la base du système', async ({ page }) => {
    for (const base of [16, 24, 32]) {
      await ouvrir(page, base, { width: 820, height: 1180 });
      await page.getByText('A', { exact: true }).click();
      const petit = await taille(page, '.step-body');
      await page.getByText('A++', { exact: true }).click();
      expect(await taille(page, '.step-body')).toBeGreaterThan(petit);
    }
  });

  test('à 390 px et 32 px : aucun débordement horizontal', async ({ page }) => {
    await ouvrir(page, 32, { width: 390, height: 844 });
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(deborde).toBe(false);
  });
});

test('en page pleine, à 390 px et 32 px : étape, compteurs et navigation atteignables', async ({
  page,
}) => {
  await ouvrir(page, 32, { width: 390, height: 844 });
  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(deborde).toBe(false);

  const elements = [
    page.locator('.step-body'),
    page.locator('.step-progress'),
    page.getByRole('button', { name: 'Previous', exact: true }),
    page.getByRole('button', { name: 'Next', exact: true }),
  ];
  const boites = [];
  for (const el of elements) {
    // Le défilement est permis : on amène l'élément, puis on mesure.
    await el.scrollIntoViewIfNeeded();
    await expect(el).toBeVisible();
    boites.push({
      y: await el.evaluate((n) => n.getBoundingClientRect().top + scrollY),
      bas: await el.evaluate((n) => n.getBoundingClientRect().bottom + scrollY),
    });
  }
  // Pas de chevauchement : chaque élément commence sous la fin du précédent.
  for (let i = 1; i < boites.length; i++) {
    const precedents = boites.slice(0, i);
    const chevauche = precedents.some((b) => boites[i].y < b.bas - 1 && boites[i].bas > b.y + 1);
    // « Précédent » et « Suivant » partagent une ligne : seul le cas
    // étape ou compteurs ne doit jamais se recouvrir.
    if (i < 3) expect(chevauche, `élément ${i} chevauche un précédent`).toBe(false);
  }
});
