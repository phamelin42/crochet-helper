import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Transcrire un diagramme (fiche 36) : depuis l'exemple, avec un vrai
 * diagramme chargé, deux tours écrits au doigt puis ajoutés au patron. Le
 * lecteur doit ensuite proposer la nouvelle pièce et lire son premier tour.
 */

const FIXTURE = join(process.cwd(), 'tools', 'fixtures', 'diagramme.png');

test.beforeEach(({ page }) => pageComplete(page));

test('transcrire : deux tours, ajoutés comme nouvelle pièce que le lecteur lit', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.locator('.step-body')).toBeVisible();
  await page.locator('[data-testid="chart-add-file"]').setInputFiles(FIXTURE);
  await expect(page.getByRole('region', { name: 'Chart 1' })).toBeVisible();

  await page.getByRole('button', { name: 'Transcribe this chart', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Transcribe the chart into text' });
  await expect(dialog).toBeVisible();

  // Le diagramme reste sous les yeux, réduit.
  await expect(dialog.locator('.chart-frame')).toBeVisible();

  // Tour 1 : six mailles serrées dans un cercle magique.
  await dialog.getByText('Magic ring', { exact: true }).click();
  const sc = dialog.getByRole('button', { name: /^sc — / });
  for (let i = 0; i < 6; i++) await sc.click();
  await dialog.getByRole('button', { name: 'Finish the round', exact: true }).click();

  // Tour 2 : six augmentations.
  const inc = dialog.getByRole('button', { name: /^sc inc — / });
  for (let i = 0; i < 6; i++) await inc.click();
  await dialog.getByRole('button', { name: 'Finish the round', exact: true }).click();

  const written = dialog.getByTestId('written-round');
  await expect(written).toHaveText(['Rnd 1: 6 sc in a magic ring (6)', 'Rnd 2: 6 sc inc (12)']);

  // Une palette au doigt : 48 px au moins.
  const box = await sc.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(48);

  await dialog.getByRole('button', { name: 'Add to the pattern', exact: true }).click();
  await expect(dialog).toBeHidden();

  const pieces = page.locator('.pieces');
  await pieces.getByText('Chart 1', { exact: true }).click();
  await expect(page.locator('.step-body')).toContainText('6 sc in a magic ring');
});
