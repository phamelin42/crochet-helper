import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Page, expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * « Ouvrir un diagramme » : un patron donné seulement en diagramme devient
 * des étapes. Sur de vraies images, dans un vrai navigateur : la lecture
 * passe par le décodage d'image et le dessin des gabarits SVG, que jsdom
 * n'a pas.
 */

const FIXTURES = join(process.cwd(), 'tools', 'fixtures', 'charts');
const OPEN_INPUT = '[data-testid="chart-open-file"]';
const DIALOG = 'Check the chart reading';

/** Les diagrammes nets du jeu d'essai de la fiche 37 (les deux cas difficiles sont à part). */
const CLEAN = ['ring-1', 'ring-2', 'ring-3', 'ring-5', 'ring-8', 'flat-1', 'flat-3', 'flat-5'];

const counts = (lines: readonly string[]) => lines.map((line) => line.match(/\((\d+)\)$/)?.[1]);

async function home(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

async function writtenRounds(page: Page): Promise<string[]> {
  const dialog = page.getByRole('dialog', { name: DIALOG });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  // Les tours lus arrivent par un effet, un rendu après l'ouverture du dialogue.
  await expect(dialog.getByTestId('written-round').first()).toBeVisible();
  return (await dialog.getByTestId('written-round').allTextContents()).map((t) => t.trim());
}

test.beforeEach(({ page }) => pageComplete(page));
// Couleurs au repos pour axe : voir CLAUDE.md, « audit de contraste pendant une transition ».
test.use({ reducedMotion: 'reduce' });

test('ouvrir un diagramme sans patron : lu, relu, découpé en étapes, retrouvé au rechargement', async ({
  page,
}) => {
  await home(page);
  const origin = new URL(page.url()).origin;
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.locator(OPEN_INPUT).setInputFiles(join(FIXTURES, 'ring-2.png'));

  expect(await writtenRounds(page)).toEqual(['Rnd 1: 6 sc (6)', 'Rnd 2: 6 sc inc (12)']);
  // Lecture dans le navigateur : rien ne sort vers un autre site.
  expect(requests.filter((url) => !url.startsWith(origin) && !url.startsWith('blob:'))).toEqual([]);

  const dialog = page.getByRole('dialog', { name: DIALOG });
  const audit = await new AxeBuilder({ page })
    .include('dialog[open]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/chart-open-dialog.png', fullPage: false });

  await dialog.getByRole('button', { name: 'Split into steps' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.locator('.step-body')).toContainText('6 sc');
  await expect(page.getByRole('region', { name: 'Chart 1' })).toBeAttached();

  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(page.locator('.step-body')).toContainText('6 sc');
  await expect(page.getByRole('region', { name: 'Chart 1' })).toBeAttached();
});

test('la lectrice corrige un tour lu avant de découper', async ({ page }) => {
  await home(page);
  await page.locator(OPEN_INPUT).setInputFiles(join(FIXTURES, 'ring-1.png'));
  expect(await writtenRounds(page)).toEqual(['Rnd 1: 6 sc (6)']);

  const dialog = page.getByRole('dialog', { name: DIALOG });
  await dialog.getByRole('button', { name: 'Edit the round 1' }).click();
  await dialog.getByRole('button', { name: /^Remove 6 × sc/ }).click();
  await expect(dialog.getByTestId('current-count')).toHaveText(/^0 /);
  for (let i = 0; i < 6; i++) {
    await dialog.getByRole('button', { name: /^hdc — / }).click();
  }
  await expect(dialog.getByTestId('current-count')).toHaveText(/^6 /);
  await dialog.getByRole('button', { name: 'Finish the round' }).click();
  // Le rendu suit le clic d'un tour de planificateur : une assertion qui réessaie, pas une lecture.
  await expect(dialog.getByTestId('written-round')).toHaveText(['Rnd 1: 6 hdc (6)']);

  await dialog.getByRole('button', { name: 'Split into steps' }).click();
  await expect(page.locator('.step-body')).toContainText('6 hdc');
});

test('chaque diagramme net du jeu d’essai : le bon nombre de tours, au bon compte', async ({
  page,
}) => {
  test.setTimeout(120_000);
  for (const name of CLEAN) {
    await home(page);
    await page.locator(OPEN_INPUT).setInputFiles(join(FIXTURES, `${name}.png`));
    const expected = readFileSync(join(FIXTURES, `${name}.expected.txt`), 'utf8')
      .trim()
      .split('\n');

    const lines = await writtenRounds(page);

    expect(counts(lines), name).toEqual(counts(expected));
    expect(
      lines.map((l) => l.split(':')[0]),
      name,
    ).toEqual(expected.map((l) => l.split(':')[0]));
  }
});
