import { type Page, expect, test } from '@playwright/test';

/**
 * « Envoyer ce projet » (fiche 19) transmet le patron et la progression, pas
 * seulement le patron (fiche 06) : la personne qui ouvre le lien doit
 * retrouver la même étape, les mêmes répétitions et le même rang coché,
 * dans un projet neuf — jamais celui de l'expéditrice.
 */

async function stepBody(page: Page): Promise<string> {
  return (await page.locator('.step-body').innerText()).trim();
}

test('lien de projet — même étape, mêmes répétitions et rang coché, dans un nouveau profil', async ({
  browser,
}) => {
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.step-body')).toContainText('inc in each st around');
  await page.getByRole('button', { name: '+', exact: true }).click();
  // La case est visuellement masquée (case personnalisée, `hanami.css`) :
  // on clique le texte du label, comme le ferait une personne. Cocher fait
  // avancer à l'étape suivante (comportement voulu du lecteur) : revenir en
  // arrière pour envoyer depuis l'étape cochée elle-même, rang coché compris
  // (le retour arrière ne le démarque pas).
  await page.getByText('Step done', { exact: true }).click();
  await expect(page.locator('.step-body')).toContainText('[sc, inc] x 6');
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(page.locator('.step-body')).toContainText('inc in each st around');
  const sentStep = await stepBody(page);

  // Le panneau d'import se replie après un chargement réussi : le rouvrir
  // pour atteindre « Send this project ». Le lien se recalcule de façon
  // asynchrone (compression) : on réessaie le clic jusqu'à ce qu'il soit prêt.
  await page.locator('.import-host summary').click();
  const sendButton = page.getByRole('button', { name: 'Send this project', exact: true });
  await expect
    .poll(async () => {
      await sendButton.click();
      return page.evaluate(() => navigator.clipboard.readText());
    })
    .toContain('#j=');
  const link = await page.evaluate(() => navigator.clipboard.readText());

  // Contexte séparé, sans le projet déjà enregistré en IndexedDB par `page` :
  // sinon la réouverture retrouverait ce projet plutôt que de décoder le lien.
  const otherContext = await browser.newContext();
  const reopened = await otherContext.newPage();
  await reopened.goto(link);
  await reopened.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(reopened.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();

  expect(await stepBody(reopened)).toBe(sentStep);
  await expect(reopened.getByRole('checkbox', { name: 'Step done' })).toBeChecked();
  await expect(reopened.locator('.big.reps')).toContainText('1');

  await context.close();
  await otherContext.close();
});

test('un lien de projet modifié à la main ouvre le lecteur sans erreur technique', async ({
  page,
}) => {
  await page.goto('/#j=1not-a-valid-payload');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await expect(page.locator('.step-body')).toContainText('Paste or type your pattern above');
});
