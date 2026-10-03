import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Page-outil « image en grille » (fiche 49) : trouvable sans JavaScript, et
 * le parcours image → grille → lecteur marche depuis elle. L'audit axe la
 * couvre d'office (famille déclarée dans `route-paths.json`).
 */

const FIXTURE = join(process.cwd(), 'tools', 'fixtures', 'quatre-couleurs.png');
const PAGES = [
  {
    path: '/image-to-crochet-chart',
    h1: 'Turn a picture into a crochet chart',
    faq: 'Is my picture uploaded anywhere?',
    pick: 'Choose a picture',
    create: 'Create the grid',
    reader: '/',
  },
  {
    path: '/fr/image-en-grille-crochet',
    h1: 'Une image en grille de crochet',
    faq: 'Mon image est-elle envoyée quelque part ?',
    pick: 'Choisir une image',
    create: 'Créer la grille',
    reader: '/fr',
  },
] as const;

test.beforeEach(({ page }) => pageComplete(page));

for (const p of PAGES) {
  test(`${p.path} : HTML pré-rendu avec le titre et la FAQ, et dans le sitemap`, async ({
    request,
  }) => {
    const html = await (await request.get(p.path)).text();
    expect(html).toContain(`<h1>${p.h1}</h1>`);
    expect(html).toContain(p.faq);
    expect(html).toContain('"@type":"FAQPage"');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain(`${p.path}</loc>`);
  });

  test(`${p.path} : une image devient une grille ouverte dans le lecteur`, async ({ page }) => {
    await page.goto(p.path);
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: p.pick }).click();
    await (await chooser).setFiles(FIXTURE);

    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('figcaption')).toBeVisible();
    await dialog.getByRole('button', { name: p.create }).click();

    await expect(page).toHaveURL((url) => url.pathname === p.reader);
    await expect(page.locator('svg.grid-svg')).toBeVisible();
  });
}

test('aucun débordement horizontal à 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const p of PAGES) {
    await page.goto(p.path);
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, p.path).toBeLessThanOrEqual(0);
  }
});
