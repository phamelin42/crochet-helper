import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Page, expect, test } from '@playwright/test';

/**
 * Les diagrammes (fiche 35) : un vrai PNG, un vrai PDF produit par Chromium,
 * parce qu'un test sur des objets simulés ne verrait ni le décodage et la
 * réduction de l'image, ni le rendu des pages par pdf.js, ni le zoom dans son
 * cadre, ni le rechargement depuis IndexedDB.
 */

const FIXTURE = join(process.cwd(), 'tools', 'fixtures', 'diagramme.png');
const CHART_INPUT = 'input[accept*="image/png"]';

interface Saved {
  readonly charts: Record<string, number>;
  readonly pieceIndex: number;
}

/** Ce que le projet a écrit en base : on attend l'écriture avant de recharger. */
function saved(page: Page): Promise<Saved | null> {
  return page.evaluate(
    () =>
      new Promise<Saved | null>((resolve) => {
        const request = indexedDB.open('fil');
        request.onsuccess = () => {
          const db = request.result;
          const all = db.transaction('projects').objectStore('projects').getAll();
          all.onsuccess = () => {
            const project = all.result[0] as
              { charts?: Record<string, number>; pieceIndex: number } | undefined;
            resolve(
              project ? { charts: project.charts ?? {}, pieceIndex: project.pieceIndex } : null,
            );
            db.close();
          };
        };
        request.onerror = () => resolve(null);
      }),
  );
}

async function openExample(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.locator('.step-body')).toBeVisible();
}

async function expectChartLoaded(page: Page, name: string): Promise<void> {
  const frame = page.getByRole('region', { name });
  await expect(frame).toBeVisible();
  const image = frame.locator('img');
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0);
}

test('diagramme : chargé, épinglé à la pièce 2, retrouvé au rechargement', async ({ page }) => {
  await openExample(page);
  await page.locator(CHART_INPUT).setInputFiles(FIXTURE);

  // Rangé d'office à la pièce en cours, la première.
  await expectChartLoaded(page, 'Chart 1');
  await expect(page.locator('fil-chart-panel details')).toHaveAttribute('open', '');

  // Épinglé à la pièce 2 : la case « Trunk » du panneau.
  await page.locator('.chart-for').getByText('Trunk', { exact: true }).click();
  await expect.poll(async () => (await saved(page))?.charts).toEqual({ '1': 1 });

  // Pièce 2 : le panneau montre l'image.
  await page.locator('.pieces').getByText('Trunk', { exact: true }).click();
  await expectChartLoaded(page, 'Chart 1');
  await expect(page.locator('fil-chart-panel details')).toHaveAttribute('open', '');

  // Pièce 1 : plus de diagramme, et le dit une fois le panneau déplié.
  await page.locator('.pieces').getByText('Tree', { exact: true }).click();
  await expect(page.locator('fil-chart-panel details')).not.toHaveAttribute('open', '');
  await page.locator('fil-chart-panel summary').click();
  await expect(page.getByText('No chart for this piece')).toBeVisible();

  await page.locator('.pieces').getByText('Trunk', { exact: true }).click();
  await expect.poll(async () => (await saved(page))?.pieceIndex).toBe(1);
  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await expectChartLoaded(page, 'Chart 1');
  await expect(page.locator('fil-chart-panel details')).toHaveAttribute('open', '');
});

test('diagramme à 320 px : aucun débordement horizontal, le zoom reste dans son cadre', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openExample(page);
  await page.locator(CHART_INPUT).setInputFiles(FIXTURE);
  await expectChartLoaded(page, 'Chart 1');

  const zoomIn = page.getByRole('button', { name: 'Zoom +', exact: true });
  for (let i = 0; i < 12; i++) await zoomIn.click();
  await page.getByRole('button', { name: 'Rotate', exact: true }).click();

  const frame = page.locator('.chart-frame');
  const box = await frame.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
  // Agrandi, le diagramme dépasse son cadre : c'est le cadre qui défile.
  const scrolls = await frame.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(scrolls).toBe(true);
});

test('diagramme : plein écran, et la légende des symboles', async ({ page }) => {
  await openExample(page);
  await page.locator(CHART_INPUT).setInputFiles(FIXTURE);
  await expectChartLoaded(page, 'Chart 1');

  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Chart 1' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Zoom +', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Key', exact: true }).click();
  const legend = page.getByRole('dialog', { name: 'Symbol key' });
  await expect(legend.locator('li')).toHaveCount(23);
  await expect(legend.getByText('sl st', { exact: true })).toBeVisible();
});

test('diagramme : pages d’un PDF, cochées puis rangées dans le projet', async ({
  page,
  context,
}) => {
  const pdfPage = await context.newPage();
  await pdfPage.setContent(
    `<!doctype html><html><body>
      <h1 style="page-break-after: always">Page un</h1>
      <h1 style="page-break-after: always">Page deux</h1>
      <h1>Page trois</h1>
    </body></html>`,
  );
  const pdfPath = join(tmpdir(), 'diagramme-pages.pdf');
  await pdfPage.pdf({ path: pdfPath });
  await pdfPage.close();

  await openExample(page);
  await page.locator(CHART_INPUT).setInputFiles(pdfPath);

  const dialog = page.getByRole('dialog', { name: 'Which pages hold a chart?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.chart-pages li')).toHaveCount(3);
  await expect(dialog.getByRole('button', { name: 'Add the ticked pages' })).toBeDisabled();
  // La vignette est une vraie page rendue, pas une image vide.
  await expect
    .poll(() =>
      dialog
        .locator('.chart-pages img')
        .first()
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth),
    )
    .toBeGreaterThan(0);

  await dialog.getByText('Page 2', { exact: true }).click();
  await dialog.getByText('Page 3', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Add the ticked pages' }).click();

  await expect(dialog).toBeHidden();
  await expectChartLoaded(page, 'Chart 1');
  await expect(page.locator('fil-chart-panel .state')).toHaveText('2');
});
