import { expect, test } from '@playwright/test';

/**
 * Compteur de rangs en ligne (fiche 27) : première page-outil du plan
 * d'acquisition, indépendante du lecteur.
 */

test('le HTML brut de « /row-counter » contient le contenu et affiche 0', async ({ request }) => {
  const html = await (await request.get('/row-counter')).text();

  expect(html).toContain('What a row counter is for');
  expect(html).toContain('How you lose your row');

  const start = html.indexOf('counter-count');
  expect(start).toBeGreaterThan(-1);
  const afterTag = html.slice(start, start + 200).replace(/<!--[\s\S]*?-->/g, '');
  const closeTag = afterTag.indexOf('>');
  const text = afterTag.slice(closeTag + 1, afterTag.indexOf('<', closeTag + 1));
  expect(text.trim()).toBe('0');
});

test('trois clics sur « +1 » comptent jusqu’à 3, et la valeur survit à un rechargement', async ({
  page,
}) => {
  await page.goto('/row-counter');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  const plus = page.getByRole('button', { name: '+1', exact: true });
  await plus.click();
  await plus.click();
  await plus.click();

  await expect(page.locator('.counter-count')).toContainText('3');

  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(page.locator('.counter-count')).toContainText('3');
});

test('320 px de large : aucun débordement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/row-counter');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
