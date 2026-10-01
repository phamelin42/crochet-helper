import { expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Défauts relevés sur les captures du Play Store (1er octobre) : sur
 * téléphone, les noms de pièces étaient coupés en plein mot (« Trur » pour
 * « Trunk »), et le glossaire n'affichait aucun terme dans le premier écran.
 */

for (const width of [320, 360, 390]) {
  test(`${width} px : les noms de pièces ne sont pas coupés`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await pageComplete(page);
    await page.goto('/');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    const pieces = page.locator('.pieces');
    await expect(pieces).toBeVisible();
    const { visible, total } = await pieces.evaluate((el) => ({
      visible: el.clientWidth,
      total: el.scrollWidth,
    }));
    expect(total, 'les pièces tiennent sans défiler').toBeLessThanOrEqual(visible + 1);
  });
}

test('390 × 844 : le premier terme du glossaire est dans le premier écran', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/glossary');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  const premier = page.locator('.glossary-list tbody th[scope="row"]').first();
  const box = (await premier.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(844);
});
