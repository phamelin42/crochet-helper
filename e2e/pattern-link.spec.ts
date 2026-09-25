import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Page, expect, test } from '@playwright/test';

/**
 * Le lien copiable (fiche 06) est le cœur du kit créatrices (fiche 23) :
 * c'est ce lien qu'une créatrice diffuse depuis sa boutique. Un test sur du
 * texte collé ne verrait pas un bug d'extraction pdf.js (mise en page en
 * colonnes, sauts de ligne perdus) : le patron doit venir d'un vrai PDF,
 * produit par Chromium, comme celui qu'une cliente importerait.
 */

async function stepBody(page: Page): Promise<string> {
  return (await page.locator('.step-body').innerText()).trim();
}

/**
 * Avance jusqu'à ce que le texte de l'étape n'évolue plus : la dernière. Le
 * bouton « Next » ne se désactive jamais en fin de patron (`store.step()`
 * reste vérité) : on attend donc que le texte change plutôt que de lire une
 * seule fois après le clic, sans quoi une exécution sous charge (plusieurs
 * tests en parallèle) lit le DOM avant que le clic n'ait été traité.
 */
async function lastStepBody(page: Page): Promise<string> {
  const body = page.locator('.step-body');
  const next = page.getByRole('button', { name: 'Next', exact: true });
  for (;;) {
    const before = await body.innerText();
    await next.click();
    try {
      await expect(body).not.toHaveText(before, { timeout: 500 });
    } catch {
      return before;
    }
  }
}

test('permalien créé depuis un vrai PDF — première et dernière étape identiques après réouverture', async ({
  browser,
}) => {
  const patternText = readFileSync(
    join(__dirname, '../src/app/features/reader/data/fixtures/04-lip-balm-case.txt'),
    'utf8',
  );

  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // Un vrai PDF : chaque ligne du patron dans son propre bloc, pour que
  // pdf.js retrouve un saut de ligne par rang à l'extraction.
  const pdfPage = await context.newPage();
  await pdfPage.setContent(
    `<!doctype html><html><body>${patternText
      .split('\n')
      .map((line) => `<div>${line}</div>`)
      .join('')}</body></html>`,
  );
  const pdfPath = join(tmpdir(), 'lip-balm-case.pdf');
  await pdfPage.pdf({ path: pdfPath });
  await pdfPage.close();

  const page = await context.newPage();
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();

  const firstStep = await stepBody(page);
  const lastStep = await lastStepBody(page);

  // Le panneau d'import se replie après un chargement réussi (voir
  // `pattern-import.ts`) : le rouvrir pour atteindre « Copy link ».
  await page.locator('.import-host summary').click();
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('#p=');

  // Contexte séparé, sans le projet déjà enregistré en IndexedDB par `page` :
  // sinon la réouverture retrouverait ce projet plutôt que de décoder le lien,
  // ce qu'une cliente qui ouvre le lien sur son propre appareil ne fait pas.
  const otherContext = await browser.newContext();
  const reopened = await otherContext.newPage();
  await reopened.goto(link);
  await reopened.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  // Le décodage du lien (décompression, import paresseux) est asynchrone.
  await expect(reopened.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();

  expect(await stepBody(reopened)).toBe(firstStep);
  expect(await lastStepBody(reopened)).toBe(lastStep);

  await context.close();
  await otherContext.close();
});
