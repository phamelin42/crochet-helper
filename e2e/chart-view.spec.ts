import { type Page, expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Affichage diagramme (fiche 45) : la pièce dessinée, une maille touchée est
 * retenue et retrouvée au rechargement. L'audit axe de cet affichage est dans
 * `a11y.spec.ts`.
 */

const PATTERN = ['Tree', 'Round 1: 6 sc (6)', 'Round 2: 12 sc (12)'].join('\n');
const PROSE = 'Round 1: work around until the piece measures 10 cm';

interface Saved {
  stepIndex: number;
  stitch?: number;
  view?: string;
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
            const project = all.result[0] as Saved | undefined;
            resolve(project ?? null);
            db.close();
          };
        };
        request.onerror = () => resolve(null);
      }),
  );
}

async function open(page: Page, text: string): Promise<void> {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.locator('#pattern-source').fill(text);
  await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
  await expect(page.locator('.step-body')).toBeVisible();
}

test.beforeEach(({ page }) => pageComplete(page));

test('toucher la 5e maille du tour 2 : retenue, retrouvée au rechargement en diagramme', async ({
  page,
}) => {
  await open(page, PATTERN);
  await page.locator('.view-toggle').getByText('Chart', { exact: true }).click();
  await expect(page.locator('.chart-cell')).toHaveCount(18);

  await page
    .locator('.chart-cell')
    .nth(6 + 4)
    .click();
  const frame = page.getByRole('img', { name: 'Round 2 of 2, stitch 5 of 12' });
  await expect(frame).toBeVisible();

  await expect
    .poll(async () => await saved(page))
    .toMatchObject({ stepIndex: 1, stitch: 4, view: 'chart' });
  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await expect(page.getByRole('img', { name: 'Round 2 of 2, stitch 5 of 12' })).toBeVisible();
  await expect(page.locator('.chart-mark')).toHaveCount(1);
});

test('le survol d’une maille dit laquelle c’est', async ({ page }) => {
  await open(page, PATTERN);
  await page.locator('.view-toggle').getByText('Chart', { exact: true }).click();

  await page.locator('.chart-cell').nth(1).hover();

  await expect(page.getByRole('tooltip')).toContainText('Round 1 · stitch 2');
});

test('revenir au texte garde la maille : « stitch 5 of 12 » sur la ligne de l’étape', async ({
  page,
}) => {
  await open(page, PATTERN);
  await page.locator('.view-toggle').getByText('Chart', { exact: true }).click();
  await page
    .locator('.chart-cell')
    .nth(6 + 4)
    .click();

  await page.locator('.view-toggle').getByText('Text', { exact: true }).click();

  await expect(page.locator('.stepcount')).toContainText('stitch 5 of 12');
  await expect(page.locator('.step-body')).toContainText('Round 2');
});

test('un patron qui ne se dessine pas : « Chart » est grisé et dit pourquoi', async ({ page }) => {
  await open(page, PROSE);

  await expect(page.locator('.view-toggle input[type="radio"]').nth(1)).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'not available' })).toBeVisible();
});
