import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * « Ouvrir une image en grille » : une image du disque devient un projet
 * grille. Dans un vrai navigateur : le décodage, la réduction et l'aperçu
 * passent par `createImageBitmap` et `OffscreenCanvas`, que jsdom n'a pas.
 */

const IMAGE = join(process.cwd(), 'tools', 'fixtures', 'image-grille.png'); // 40 × 30, 4 couleurs
const GRID_INPUT = '[data-testid="grid-open-file"]';
// Mise en page de la grille de lecture : gouttière de 44, bandeau de 28, maille de 32 (grid-view.spec.ts).
const GUTTER = 44;
const TOP = 28;
const SIDE = 32;

test.beforeEach(({ page }) => pageComplete(page));
// Couleurs au repos pour axe : voir CLAUDE.md, « audit de contraste pendant une transition ».
test.use({ reducedMotion: 'reduce' });

test('une image devient une grille de 40 mailles et 4 couleurs, suivie puis retrouvée', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  const origin = new URL(page.url()).origin;
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.locator(GRID_INPUT).setInputFiles(IMAGE);
  const dialog = page.getByRole('dialog', { name: 'Open an image as a grid' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Number of colours').fill('4');
  await dialog.getByLabel('Number of colours').blur();
  await expect(dialog.getByRole('status')).toHaveText(
    /^40 × 30 stitches, 4 colours, 1,200 stitches$/,
  );

  const audit = await new AxeBuilder({ page })
    .include('dialog[open]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);

  await dialog.getByRole('button', { name: 'Create the grid' }).click();
  await expect(dialog).toBeHidden();
  // Le calcul se fait sur l'appareil : rien ne sort vers un autre site.
  expect(requests.filter((url) => !url.startsWith(origin) && !url.startsWith('blob:'))).toEqual([]);

  const svg = page.locator('svg.grid-svg');
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute('aria-label', 'Row 1 of 30, stitch 1 of 40');

  // Rang 3 (de bas en haut), 6e colonne depuis la gauche : un rang impair se travaille de droite à gauche.
  const viewBox = (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
  const box = (await svg.boundingBox())!;
  const scale = box.width / viewBox[2];
  await svg.click({
    position: {
      x: (GUTTER + 5 * SIDE + SIDE / 2) * scale,
      y: (TOP + (30 - 3) * SIDE + SIDE / 2) * scale,
    },
  });
  await expect(svg).toHaveAttribute('aria-label', 'Row 3 of 30, stitch 35 of 40');

  // Le suivi est écrit avant le rechargement : on attend l'écriture en base, pas l'état affiché.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number | null>((resolve) => {
            const open = indexedDB.open('fil');
            open.onsuccess = () => {
              const all = open.result
                .transaction('projects', 'readonly')
                .objectStore('projects')
                .getAll();
              all.onsuccess = () => {
                open.result.close();
                resolve((all.result[0]?.stitch as number | undefined) ?? null);
              };
            };
            open.onerror = () => resolve(null);
          }),
      ),
    )
    .toBe(34);
  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(page.locator('svg.grid-svg')).toHaveAttribute(
    'aria-label',
    'Row 3 of 30, stitch 35 of 40',
  );
});

test('un fichier qui n’est pas une image est refusé avec le message du diagramme', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.locator(GRID_INPUT).setInputFiles({
    name: 'patron.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Rang 1 : 6 ms'),
  });
  await expect(page.getByRole('alert').filter({ hasText: 'isn’t a readable chart' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
