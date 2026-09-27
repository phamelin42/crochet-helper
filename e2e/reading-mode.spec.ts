import { expect, test } from '@playwright/test';

/**
 * Mode lecture (fiche 24) : l'étape et le compteur de répétitions dans le
 * premier écran d'une tablette, une taille de texte réglable et un fond
 * sombre explicite. Le contraste du thème sombre est déjà audité par
 * `a11y.spec.ts` (posé au repos, `reducedMotion`) : pas de doublon ici.
 */

test('tablette 820×1180 : l’étape est dans le premier écran, en grand', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await page.getByRole('button', { name: 'Example', exact: true }).click();
  const step = page.locator('.step-body');
  await expect(step).toBeVisible();

  const box = await step.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeLessThan(260);

  const fontSize = await step.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(40);
});

test('taille de texte A++ à 320 px de large : aucun débordement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await page.getByRole('radio', { name: 'A++' }).click();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

test('« Darken » pose data-dim et survit à un rechargement', async ({ page }) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await page.getByRole('button', { name: 'Darken', exact: true }).click();
  await expect(page.locator('html[data-dim="true"]')).toBeAttached();

  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(page.locator('html[data-dim="true"]')).toBeAttached();
});
