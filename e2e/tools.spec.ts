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

test.describe("tailles d'aiguilles (fiche 50)", () => {
  for (const path of ['/knitting-needle-sizes', '/fr/tailles-d-aiguilles']) {
    test(`le HTML brut de « ${path} » contient le tableau de 19 lignes`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      const body = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'));
      expect(body.match(/<tr/g)).toHaveLength(19);
      expect(body).toContain('US 8');
    });
  }

  test('chercher « us8 » affiche « 5 mm »', async ({ page }) => {
    await page.goto('/knitting-needle-sizes');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.getByLabel('A size: 5 mm or US 8').fill('us8');
    await expect(page.locator('.needle-result')).toContainText('5 mm');
  });

  test('320 px de large : aucun débordement horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/fr/tailles-d-aiguilles');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});

test.describe('poids de fil (fiche 51)', () => {
  for (const path of ['/yarn-weight-chart', '/fr/poids-de-fil']) {
    test(`le HTML brut de « ${path} » contient le tableau des 8 catégories`, async ({
      request,
    }) => {
      const html = await (await request.get(path)).text();
      const body = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'));
      expect(body.match(/<tr/g)).toHaveLength(8);
      expect(body).toContain('Worsted');
    });
  }

  test('320 px de large : aucun débordement horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/fr/poids-de-fil');
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

test.describe('calculateur d’échantillon (fiche 28)', () => {
  for (const path of ['/gauge-calculator', '/fr/calculateur-d-echantillon']) {
    test(`le HTML brut de « ${path} » a le formulaire, 500 mots et aucun résultat`, async ({
      request,
    }) => {
      const html = await (await request.get(path)).text();
      expect(html).toContain('id="gauge-pattern-stitches"');
      expect(html).toContain('id="gauge-mine-stitches"');
      expect(html).not.toContain('gauge-advice');
      const article = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
      const text = article.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');
      expect(text.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(500);
    });
  }

  test('14/16 demandés, 16/16 obtenus : « crochet plus gros », et 50 cm donnent 80 mailles', async ({
    page,
  }) => {
    await page.goto('/gauge-calculator');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.locator('#gauge-pattern-stitches').fill('14');
    await page.locator('#gauge-pattern-rows').fill('16');
    await page.locator('#gauge-mine-stitches').fill('16');
    await page.locator('#gauge-mine-rows').fill('16');
    await expect(page.locator('.gauge-advice')).toContainText('Go up a hook size');

    await page.locator('#gauge-width').fill('50');
    await expect(page.locator('.gauge-cast-on')).toContainText('80 stitches to cast on');
  });

  test('320 px de large : aucun débordement horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/fr/calculateur-d-echantillon');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});

test.describe('lire un patron dans l’autre langue (fiche 31)', () => {
  const pages = [
    { path: '/fr/lire-un-patron-anglais', words: 700, cell: 'maille serrée' },
    { path: '/read-a-french-pattern', words: 500, cell: 'single crochet' },
  ];

  for (const { path, words, cell } of pages) {
    test(`le HTML brut de « ${path} » contient le tableau et le contenu`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html).toContain('foreign-table');
      expect(html).toContain(cell);
      const article = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
      const text = article.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');
      expect(text.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(words);
    });
  }

  test('un rang collé est développé, et s’ouvre dans le lecteur avec la même première étape', async ({
    page,
  }) => {
    await page.goto('/fr/lire-un-patron-anglais');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.locator('#foreign-input').fill('Row 1: 6 sc in magic ring, inc in each st around');

    await expect(page.locator('.foreign-output')).toContainText('6 maille serrée (sc)');
    await expect(page.locator('.foreign-output')).toContainText('augmentation (inc)');

    await page.locator('.foreign-open').click();
    await page.waitForURL(/\/fr\/?(#.*)?$/);
    await expect(page.locator('.step-body').first()).toContainText('magic ring');
  });

  test('320 px de large : aucun débordement horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    for (const path of ['/fr/lire-un-patron-anglais', '/read-a-french-pattern']) {
      await page.goto(path);
      await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows, path).toBe(false);
    }
  });
});
