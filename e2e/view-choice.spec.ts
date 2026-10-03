import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Choix d'affichage à l'import (fiche 46) : la question, « Retenir mon
 * choix », et le retour à « Demander » dans les Réglages. Les autres tests
 * partent d'un choix retenu (`playwright.config.ts`) ; celui-ci repart de zéro.
 */
test.use({ reducedMotion: 'reduce', storageState: { cookies: [], origins: [] } });
test.beforeEach(({ page }) => pageComplete(page));

const FIRST = ['Tree', 'Round 1: 6 sc (6)', 'Round 2: 12 sc (12)'].join('\n');
const SECOND = ['Leaf', 'Round 1: 8 sc (8)', 'Round 2: 16 sc (16)'].join('\n');

async function paste(page: Page, text: string): Promise<void> {
  await page.locator('#pattern-source').fill(text);
  await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
}

const question = (page: Page) =>
  page.getByRole('dialog', { name: 'How do you want to follow this pattern?' });

test('coller, choisir Diagramme et retenir : le suivant s’ouvre en diagramme sans question', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await paste(page, FIRST);

  await expect(question(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).include('dialog').analyze();
  expect(results.violations).toEqual([]);

  await question(page).getByText('Remember my choice').click();
  await question(page).getByRole('button', { name: 'Chart', exact: true }).click();
  await expect(question(page)).toBeHidden();
  await expect(page.locator('.chart-cell')).toHaveCount(18);

  // Un autre patron : un autre projet, ouvert directement en diagramme.
  await page.getByRole('button', { name: 'Change pattern', exact: true }).click();
  await paste(page, SECOND);
  await expect(page.locator('.chart-cell')).toHaveCount(24);
  await expect(question(page)).toBeHidden();
});

test('Réglages → Demander : la question revient', async ({ page }) => {
  await page.goto('/settings');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  // Les boutons radio sont masqués : on clique leur libellé, comme la lectrice.
  await page.locator('.seg').getByText('Chart', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Chart' })).toBeChecked();
  await page.locator('.seg').getByText('Ask me', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Ask me' })).toBeChecked();

  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await paste(page, FIRST);
  await expect(question(page)).toBeVisible();
});
