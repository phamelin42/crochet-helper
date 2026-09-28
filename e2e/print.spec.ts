import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * « Imprimer » (fiche 25) : vérifier sur un vrai PDF produit par Chromium, pas
 * sur `innerText`, qui renvoie aussi le texte des éléments masqués à l'écran
 * (`.print-only`, toujours dans le DOM — voir `print-view.ts`). On compte les
 * objets `/Type /Page` du PDF plutôt que de lire son contenu texte, compressé
 * dans le flux et donc pas cherchable en simple sous-chaîne.
 */
test('le livret imprimé (mise en page « print ») produit au moins une page', async ({ page }) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.locator('.step-body')).not.toHaveText('');

  // « Imprimer » appelle `window.print()`, qui ouvre une boîte de dialogue du
  // système — non pilotable en headless : on vérifie plutôt directement le
  // bouton (présent, activé) et le contenu réellement imprimable, produit par
  // Chromium via `page.pdf()`, indépendant du clic.
  await expect(page.getByRole('button', { name: 'Print', exact: true })).toBeEnabled();

  const pdfPath = join(tmpdir(), 'fil-print.pdf');
  await page.pdf({ path: pdfPath });
  const pdf = readFileSync(pdfPath).toString('latin1');

  const pageCount = (pdf.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pageCount).toBeGreaterThan(0);
});
