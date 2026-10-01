import { expect, test } from '@playwright/test';

/**
 * « Split into steps » ne doit jamais rester sans effet visible (Phil,
 * 1er octobre) : un patron en prose dit pourquoi il n'est pas découpé, et un
 * patron remis en forme par un assistant IA (Markdown) est découpé.
 */

const PROSE = [
  'Back: Chain 86 plus 4 for turning and work in Wave Pat for 39 cm.',
  'Place a marker each side of last row to mark beginning of the armhole.',
  'Cont in pat until piece measures 58 cm from beginning. Fasten off.',
].join('\n');

const MARKDOWN = [
  '### Back',
  '- **Row 1:** ch 86, sc across.',
  '- **Row 2:** ch 1, sc across.',
].join('\n');

async function decouper(page: import('@playwright/test').Page, texte: string): Promise<void> {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.locator('#pattern-source').fill(texte);
  await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
}

test('un patron sans rang numéroté dit pourquoi il n’est pas découpé', async ({ page }) => {
  await decouper(page, PROSE);
  await expect(page.getByRole('alert')).toContainText('No numbered rows found');
  // Le texte reste dans le champ, prêt à être corrigé.
  await expect(page.locator('#pattern-source')).toHaveValue(PROSE);
});

test('un patron en Markdown d’assistant IA est découpé en étapes', async ({ page }) => {
  await decouper(page, MARKDOWN);
  await expect(page.locator('.step-body')).toContainText('ch 86, sc across.');
  await expect(page.getByText('No numbered rows found')).toHaveCount(0);
});
