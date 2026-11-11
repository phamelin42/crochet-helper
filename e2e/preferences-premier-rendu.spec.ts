import { type Page, expect, test } from '@playwright/test';

/**
 * Préférences d'affichage avant le premier rendu (audit front, C-4) : le fond
 * sombre et la taille du texte choisis sont posés par `public/app-mode.js`,
 * script externe chargé avant le rendu. On empêche Angular de démarrer pour
 * prouver que ce n'est pas lui qui les pose : ce qu'on voit est la première image.
 */

async function sansAngular(page: Page): Promise<void> {
  await page.route(/\/main-[^/]+\.js(\?.*)?$/, (route) => route.abort());
}

const fond = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('fond sombre et grand texte enregistrés : la première image les porte déjà', async ({
  page,
}) => {
  await sansAngular(page);
  await page.addInitScript(() => {
    localStorage.setItem('fil.dim', 'true');
    localStorage.setItem('fil.textSize', JSON.stringify('lg'));
  });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-dim', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'lg');
  await expect(page.locator('fil-root[data-ready]')).toHaveCount(0);

  const sombre = await fond(page);
  const [r, g, b] = sombre.match(/\d+/g)!.map(Number);
  expect(r + g + b, `fond ${sombre}`).toBeLessThan(300);
});

test('sans préférence, la première image est claire et de taille normale', async ({ page }) => {
  await sansAngular(page);
  await page.goto('/');

  await expect(page.locator('html')).not.toHaveAttribute('data-dim', /.*/);
  await expect(page.locator('html')).not.toHaveAttribute('data-text-size', /.*/);
  const [r, g, b] = (await fond(page)).match(/\d+/g)!.map(Number);
  expect(r + g + b).toBeGreaterThan(600);
});

for (const valeur of ['pas du json', '"xxl"', '{}']) {
  test(`taille de texte illisible (${valeur}) : ignorée, la page s'affiche`, async ({ page }) => {
    await sansAngular(page);
    await page.addInitScript((v) => localStorage.setItem('fil.textSize', v), valeur);
    await page.goto('/');

    await expect(page.locator('html')).not.toHaveAttribute('data-text-size', /.*/);
    await expect(page.locator('h1').first()).toBeVisible();
  });
}
