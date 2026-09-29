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

test.describe('tailles de crochet (fiche 29)', () => {
  for (const path of ['/crochet-hook-sizes', '/fr/tailles-de-crochet']) {
    test(`le HTML brut de « ${path} » contient le tableau de 14 lignes`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      const body = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'));
      expect(body.match(/<tr/g)).toHaveLength(14);
      expect(body).toContain('G-6');
    });
  }

  test('chercher « g6 » affiche « 4 mm »', async ({ page }) => {
    await page.goto('/crochet-hook-sizes');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.getByLabel('A size: 4 mm or G-6').fill('g6');
    await expect(page.locator('.hook-result')).toContainText('4 mm');
  });

  test('320 px de large : aucun débordement horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/fr/tailles-de-crochet');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
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
