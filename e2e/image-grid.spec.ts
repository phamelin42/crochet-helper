import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { type Page, expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * « Ouvrir une image en grille » (fiche 48) : une image du disque devient un
 * projet grille, sur l'appareil, sans requête vers un autre site.
 */

const FIXTURE = join(process.cwd(), 'tools', 'fixtures', 'quatre-couleurs.png');
const INPUT = '[data-testid="grid-image-file"]';
const DIALOG = 'Turn the picture into a grid';
const PREVIEW_MAX_MS = 1000;

async function home(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

test.beforeEach(({ page }) => pageComplete(page));
// Couleurs au repos pour axe : voir CLAUDE.md, « audit de contraste pendant une transition ».
test.use({ reducedMotion: 'reduce' });

test('une image de 4 couleurs devient une grille de 40 × 30, suivie et retrouvée au rechargement', async ({
  page,
}) => {
  await home(page);
  const origin = new URL(page.url()).origin;
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.locator(INPUT).setInputFiles(FIXTURE);
  const dialog = page.getByRole('dialog', { name: DIALOG });
  await expect(dialog).toBeVisible();

  // 40 mailles est la largeur par défaut ; 6 couleurs → 4.
  for (let i = 0; i < 2; i++) {
    await dialog.getByRole('button', { name: 'Less — Number of colours' }).click();
  }
  await expect(dialog.locator('figcaption')).toHaveText(
    '40 × 30 stitches, 4 colours, 1,200 stitches',
  );
  expect(requests.filter((url) => !url.startsWith(origin) && !url.startsWith('blob:'))).toEqual([]);

  const audit = await new AxeBuilder({ page })
    .include('dialog[open]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);

  await dialog.getByRole('button', { name: 'Create the grid' }).click();
  await expect(dialog).toBeHidden();
  const svg = page.locator('svg.grid-svg');
  await expect(svg).toBeVisible();
  await expect(page.locator('.grid-help')).toContainText('Row 1 · stitch 1 of 40');

  // Première case en haut à gauche : rang 30, travaillé de gauche à droite, maille 1.
  await page.locator('.chart-frame').evaluate((frame) => frame.scrollTo(0, 0));
  await svg.click({ position: { x: 44 + 16, y: 28 + 16 } });
  await expect(page.locator('.grid-help')).toContainText('Row 30 · stitch 1 of 40');

  // Attendre l'écriture avant de recharger.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number | null>((resolve) => {
            const request = indexedDB.open('fil');
            request.onsuccess = () => {
              const all = request.result.transaction('projects').objectStore('projects').getAll();
              all.onsuccess = () => {
                const project = (all.result as { name: string; stepIndex: number }[]).find(
                  (p) => p.name === 'quatre-couleurs',
                );
                resolve(project?.stepIndex ?? null);
                request.result.close();
              };
            };
            request.onerror = () => resolve(null);
          }),
      ),
    )
    .toBe(29);
  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(page.locator('.grid-help')).toContainText('Row 30 · stitch 1 of 40');
});

test('une photo de 4 000 × 3 000 px donne son aperçu en moins d’une seconde sur mobile bridé', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await pageComplete(page);
  await home(page);
  // La photo se fabrique avant le bridage : seul le traitement est mesuré.
  const photo = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(4000, 3000);
    const context = canvas.getContext('2d')!;
    const gradient = context.createLinearGradient(0, 0, 4000, 3000);
    gradient.addColorStop(0, '#f4c2c2');
    gradient.addColorStop(0.5, '#3a6ea5');
    gradient.addColorStop(1, '#e9a53a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 4000, 3000);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  // Comme la lectrice : le bouton, puis le sélecteur de fichiers. Le dialogue
  // se charge pendant qu'elle choisit ; on attend qu'il soit là, ce que le
  // temps du choix fait de lui-même.
  const chooser = page.waitForEvent('filechooser');
  const chunk = page.waitForResponse(/image-grid-dialog/);
  await page.getByRole('button', { name: 'Turn a picture into a grid' }).click();
  const [fileChooser] = await Promise.all([chooser, chunk]);

  const start = Date.now();
  await fileChooser.setFiles({
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(photo, 'base64'),
  });
  await page.locator('.image-grid-preview svg path').first().waitFor({ state: 'attached' });
  const elapsed = Date.now() - start;
  console.log(`image 4 000 × 3 000 : aperçu en ${elapsed} ms (mobile bridé, CPU ÷ 4)`);
  expect(elapsed).toBeLessThan(PREVIEW_MAX_MS);
  await context.close();
});
