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

/**
 * Page des tailles de crochet (fiche 29) : le tableau et le texte doivent être
 * dans le HTML pré-rendu, sans attendre le JavaScript, dans les deux langues.
 */
for (const path of ['/crochet-hook-sizes', '/fr/tailles-de-crochet']) {
  test(`le HTML brut de « ${path} » contient le tableau des 14 tailles et au moins 500 mots`, async ({
    request,
  }) => {
    const html = await (await request.get(path)).text();

    const tbody = /<tbody[^>]*>([\s\S]*?)<\/tbody>/.exec(html)?.[1] ?? '';
    expect(tbody.match(/<tr\b/g) ?? []).toHaveLength(14);
    expect(tbody).toContain('G-6');
    expect(tbody).toContain('K-10½');
    expect(tbody).toContain('N/P-15');

    const prose = /<article class="prose"[^>]*>([\s\S]*?)<\/article>/.exec(html)?.[1] ?? '';
    const words = prose
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter((word) => /\p{L}/u.test(word));
    expect(words.length).toBeGreaterThanOrEqual(500);
  });
}

test('chercher « g6 » affiche « 4 mm »', async ({ page }) => {
  await page.goto('/crochet-hook-sizes');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await page.getByLabel('Your hook size').fill('g6');
  await expect(page.locator('.hook-size-result')).toContainText('4 mm');

  await page.getByLabel('Your hook size').fill('Z');
  await expect(page.getByText('This size is not in the standard.')).toBeVisible();
});

test('tailles de crochet, 320 px de large : aucun débordement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/fr/tailles-de-crochet');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
