import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Page-outil « image en grille » (fiche 49) : trouvable, lisible sans
 * JavaScript, et le parcours image → grille → lecteur marche depuis elle.
 */

const IMAGE = join(process.cwd(), 'tools', 'fixtures', 'image-grille.png');
const PAGES = [
  {
    url: '/image-to-crochet-chart',
    h1: 'Turn an image into a crochet chart',
    faq: ['Is it free?', 'Is my image sent anywhere?', 'Which stitch should I use?'],
  },
  {
    url: '/fr/image-en-grille-crochet',
    h1: 'Transformer une image en grille de crochet',
    faq: ['Est-ce gratuit ?', 'Mon image est-elle envoyée quelque part ?', 'Quel point utiliser ?'],
  },
];

test.beforeEach(({ page }) => pageComplete(page));

for (const { url, h1, faq } of PAGES) {
  test(`le HTML brut de « ${url} » contient le titre, la FAQ et les données structurées`, async ({
    request,
  }) => {
    const html = await (await request.get(url)).text();
    expect(html).toContain(h1);
    for (const question of faq) expect(html).toContain(question);
    expect(html).toContain('FAQPage');
    expect(html).toContain('hreflang');
  });

  test(`aucun débordement horizontal à 320 px sur « ${url} »`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(url);
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('une image choisie sur la page devient une grille ouverte dans le lecteur', async ({
  page,
}) => {
  await page.goto('/image-to-crochet-chart');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await page.locator('[data-testid="image-grid-file"]').setInputFiles(IMAGE);
  const dialog = page.getByRole('dialog', { name: 'Open an image as a grid' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Create the grid' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Create the grid' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('svg.grid-svg')).toBeVisible();
});

test('en français, la grille ouvre le lecteur français', async ({ page }) => {
  await page.goto('/fr/image-en-grille-crochet');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await page.locator('[data-testid="image-grid-file"]').setInputFiles(IMAGE);
  const dialog = page.getByRole('dialog', { name: 'Ouvrir une image en grille' });
  await dialog.getByRole('button', { name: 'Créer la grille' }).click();

  await expect(page).toHaveURL(/\/fr$/);
  await expect(page.locator('svg.grid-svg')).toBeVisible();
});
