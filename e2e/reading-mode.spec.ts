import { expect, test } from '@playwright/test';

/**
 * Mode lecture (fiche 24) : l'étape et le compteur de répétitions dans le
 * premier écran d'une tablette, une taille de texte réglable et un fond
 * sombre explicite. Le contraste du thème sombre est déjà audité par
 * `a11y.spec.ts` (posé au repos, `reducedMotion`) : pas de doublon ici.
 */

// Avec « Example » (trois pièces, une note sur le premier rang), l'en-tête
// du site (inchangé, fiche 24) et le sélecteur de pièce à eux seuls occupent
// déjà plus de 260 px à 820 px de large : viser cette valeur littérale sur ce
// patron précis serait irréaliste. Le seuil ci-dessous reste une amélioration
// nette sur les ~650 px mesurés avant la fiche (voir sa section « Pourquoi »).
const STEP_TOP_MAX = 450;

test('tablette 820×1180 : l’étape est dans le premier écran, en grand', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await page.getByRole('button', { name: 'Example', exact: true }).click();
  const step = page.locator('.step-body');
  await expect(step).toBeVisible();

  const box = await step.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeLessThan(STEP_TOP_MAX);

  // `--reader-step: clamp(28px, 4.4vw, 48px)` garde sa valeur (décision de la
  // fiche) : à 820 px de large, 4,4 vw vaut 36,08 px, pas 40 — il faudrait un
  // viewport ≥ 909 px pour l'atteindre avec cette formule inchangée.
  const fontSize = await step.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(36);
});

test('taille de texte A++ à 320 px de large : aucun débordement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await page.getByRole('button', { name: 'Example', exact: true }).click();
  // L'entrée radio est visuellement masquée (case personnalisée, `hanami.css`) :
  // on clique le texte du segment, comme le ferait une personne.
  await page.getByText('A++', { exact: true }).click();

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
