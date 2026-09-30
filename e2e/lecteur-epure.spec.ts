import { expect, test } from '@playwright/test';

/**
 * Retours de Phil du 30 septembre sur mobile : un lecteur qui ne dit chaque
 * chose qu'une fois. Chaque test ici garde un de ces retours.
 */
test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
});

test('en-tête : la navigation tient sur une seule ligne', async ({ page }) => {
  const links = page.locator('.nav-links a');
  const tops = await links.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(1);
  // Marque, boutons et navigation : deux lignes en tout, pas quatre.
  expect((await page.locator('.nav').boundingBox())!.height).toBeLessThan(160);
});

test('le compteur de répétitions n’apparaît que si l’étape en annonce une', async ({ page }) => {
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  // « Round 1: in magic ring, 6 sc (6) » : aucune répétition.
  await expect(page.locator('.step-body')).toContainText('in magic ring');
  await expect(page.locator('.reps-tile')).toHaveCount(0);

  const next = page.getByRole('button', { name: 'Next', exact: true });
  await next.click();
  await next.click();
  // « Round 3: [sc, inc] x 6 (18) » : six répétitions à compter.
  await expect(page.locator('.step-body')).toContainText('[sc, inc] x 6');
  await expect(page.locator('.reps-tile')).toContainText('/ 6');
});

test('la position n’est dite qu’une fois, sans badge de rang ni de pièce', async ({ page }) => {
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.locator('.stepmeta')).toHaveText(/^\s*Step 1 \/ \d+\s*$/);
  await expect(page.getByRole('button', { name: /Spell out/ })).toHaveCount(0);
  await expect(page.getByText('All steps')).toHaveCount(0);
});

test('un seul bouton de partage, et « Lien copié » s’efface de lui-même', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Example', exact: true }).click();

  await expect(page.getByRole('button', { name: /Send this project/ })).toHaveCount(0);
  const share = page.getByRole('button', { name: 'Share this pattern', exact: true });
  await expect
    .poll(async () => {
      await share.click();
      return page.evaluate(() => navigator.clipboard.readText());
    })
    .toContain('#p=');
  await expect(page.getByText('Link copied to clipboard.')).toBeVisible();
  await expect(page.getByText('Link copied to clipboard.')).toHaveCount(0, { timeout: 6000 });
  await context.close();
});
