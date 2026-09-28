import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Page, expect, test } from '@playwright/test';

/**
 * Les photos d'un PDF (fiche 34) : un vrai PDF produit par Chromium, avec deux
 * JPEG, parce qu'un test sur des objets simulés ne verrait ni la lecture des
 * images par pdf.js, ni leur place dans la page, ni le rechargement depuis
 * IndexedDB.
 */

/** Un JPEG uni, assez grand pour ne pas passer pour une puce (80 px au moins). */
function jpeg(page: Page, color: string): Promise<string> {
  return page.evaluate((fill) => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 180;
    const context = canvas.getContext('2d')!;
    context.fillStyle = fill;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, color);
}

/** Étape enregistrée du projet : on attend l'écriture avant de recharger. */
function savedStepIndex(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const request = indexedDB.open('fil');
        request.onsuccess = () => {
          const db = request.result;
          const all = db.transaction('projects').objectStore('projects').getAll();
          all.onsuccess = () => {
            resolve((all.result[0] as { stepIndex?: number } | undefined)?.stepIndex ?? -1);
            db.close();
          };
        };
        request.onerror = () => resolve(-1);
      }),
  );
}

async function expectPhotoLoaded(page: Page): Promise<void> {
  const full = page.locator('.photo-full');
  await expect(full).toBeVisible();
  await expect
    .poll(() => full.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0);
}

test('photos d’un PDF : vignette à l’étape qui la cite, agrandie, retrouvée au rechargement', async ({
  page,
  context,
}) => {
  const pdfPage = await context.newPage();
  const [pink, blue] = [await jpeg(pdfPage, '#e89aa8'), await jpeg(pdfPage, '#7fa7d9')];
  await pdfPage.setContent(
    `<!doctype html><html><body>
      <h1>Bunny</h1>
      <div>Row 1: ch 13, sc in each ch across (12)</div>
      <img src="${pink}" width="240" height="180">
      <div>Row 2: ch 1, turn, sc across (12)</div>
      <div>Row 3: ch 1, turn, sc across (12), see image 1</div>
      <div>Row 4: ch 1, turn, sc across (12)</div>
      <img src="${blue}" width="240" height="180">
    </body></html>`,
  );
  const pdfPath = join(tmpdir(), 'bunny-photos.pdf');
  await pdfPage.pdf({ path: pdfPath });
  await pdfPage.close();

  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.locator('input[type="file"]').setInputFiles(pdfPath);

  const next = page.getByRole('button', { name: 'Next', exact: true });
  const body = page.locator('.step-body');
  const stepView = page.locator('fil-step-view');
  await expect(next).toBeEnabled();
  await expect(body).toContainText('ch 13');
  // L'image 1 suit le rang 1 dans la page, mais le rang 3 la cite : elle va au rang 3.
  await expect(stepView.locator('.photo-thumb')).toHaveCount(0);

  await next.click();
  await expect(body).toContainText('ch 1, turn, sc across (12)');
  await next.click();
  await expect(body).toContainText('see image 1');

  await expect(stepView.locator('.photo-thumb')).toHaveCount(1);
  await stepView.getByRole('button', { name: 'Photo 1', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Photo 1' });
  await expect(dialog).toBeVisible();
  await expectPhotoLoaded(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await expect.poll(() => savedStepIndex(page)).toBe(2);
  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await expect(body).toContainText('see image 1');
  await stepView.getByRole('button', { name: 'Photo 1', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Photo 1' })).toBeVisible();
  await expectPhotoLoaded(page);
});
