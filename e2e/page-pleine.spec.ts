import { type Page, expect, test } from '@playwright/test';

/**
 * Mode page pleine (fiche 38) : une fois le patron chargé, l'écran ne montre
 * que l'étape, ses répétitions et « Précédent » / « Suivant », sans défilement.
 */

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
];

async function ouvrirExemple(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.locator('.step-body')).toContainText('in magic ring');
}

async function dansLePremierEcran(page: Page, cible: ReturnType<Page['locator']>): Promise<void> {
  const box = await cible.boundingBox();
  const hauteur = page.viewportSize()!.height;
  expect(box, 'élément visible').not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(hauteur);
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport });

    test('après « Example » : l’étape et de quoi la suivre, rien d’autre, sans défilement', async ({
      page,
    }) => {
      await ouvrirExemple(page);
      await expect(page.locator('html[data-focus]')).toBeAttached();

      for (const masque of [
        page.locator('.nav'),
        page.getByRole('button', { name: 'Share this pattern' }),
        page.getByText('Progress', { exact: true }),
        page.getByRole('contentinfo'),
      ]) {
        await expect(masque).toBeHidden();
      }

      const visibles = [
        page.locator('.stepcount'),
        page.locator('.step-body'),
        page.locator('.step-progress'),
        page.locator('.reps-tile'),
        page.getByRole('button', { name: 'Previous', exact: true }),
        page.getByRole('button', { name: 'Next', exact: true }),
        page.getByRole('button', { name: 'Tools', exact: true }),
      ];
      for (const element of visibles) {
        await expect(element).toBeVisible();
        await dansLePremierEcran(page, element);
      }
      const defile = await page.evaluate(
        () => document.documentElement.scrollHeight > window.innerHeight,
      );
      expect(defile, 'la page tient dans l’écran').toBe(false);
    });

    test('« Tools » rend la page complète, « Full page » y revient', async ({ page }) => {
      await ouvrirExemple(page);
      const outils = page.getByRole('button', { name: 'Tools', exact: true });
      await expect(outils).toHaveAttribute('aria-pressed', 'true');
      await expect(outils).toHaveAttribute('aria-keyshortcuts', 'Escape');
      await outils.click();

      await expect(page.locator('html[data-focus]')).toHaveCount(0);
      await expect(page.locator('.nav')).toBeVisible();
      await expect(page.getByText('Progress', { exact: true })).toBeVisible();
      const retour = page.getByRole('button', { name: 'Full page', exact: true });
      await expect(retour).toHaveAttribute('aria-pressed', 'false');
      await expect(retour).toBeFocused();

      await retour.click();
      await expect(page.locator('html[data-focus]')).toBeAttached();
      await expect(page.getByRole('button', { name: 'Tools', exact: true })).toBeFocused();
    });

    test('Échap quitte la page pleine, et le choix survit à un rechargement', async ({ page }) => {
      await ouvrirExemple(page);
      await page.keyboard.press('Escape');
      await expect(page.locator('html[data-focus]')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Full page', exact: true })).toBeFocused();

      await page.reload();
      await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
      await expect(page.locator('.step-body')).toContainText('in magic ring');
      await expect(page.locator('.nav')).toBeVisible();
      await expect(page.locator('html[data-focus]')).toHaveCount(0);
    });

    test('les répétitions se comptent depuis la page pleine', async ({ page }) => {
      await ouvrirExemple(page);
      await page.getByRole('button', { name: '+', exact: true }).click();
      await expect(page.locator('.reps-tile .big')).toContainText('1');
      await page.getByRole('button', { name: 'Tools', exact: true }).click();
      await expect(page.locator('.reps-tile .big')).toContainText('1');
    });
  });
}

test('la page d’accueil pré-rendue ne porte pas data-focus', async ({ request }) => {
  for (const chemin of ['/', '/fr']) {
    const html = await (await request.get(chemin)).text();
    expect(html, chemin).not.toContain('data-focus');
  }
});
