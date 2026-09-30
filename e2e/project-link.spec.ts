import { expect, test } from '@playwright/test';
import { DEMO_PATTERN } from '../src/app/features/reader/data/demo-pattern';
import { encodeProject } from '../src/app/features/reader/data/project-link';
import { pageComplete } from './page-complete';

/**
 * Un lien de projet (fiche 19) transmet le patron et la progression : la
 * personne qui l'ouvre doit retrouver la même étape, les mêmes répétitions et
 * le même rang coché, dans un projet neuf — jamais celui de l'expéditrice.
 */

test.beforeEach(({ page }) => pageComplete(page));

test('un lien de projet reçu rouvre la même étape, les mêmes répétitions et le rang coché', async ({
  page,
}) => {
  // Le bouton « Envoyer ce projet » a été retiré (un seul bouton de partage,
  // le lien du patron) : les liens de projet déjà envoyés doivent pourtant
  // toujours s'ouvrir. On en fabrique un avec l'encodeur de l'application.
  const link = `/#j=${await encodeProject({
    source: DEMO_PATTERN,
    name: 'Tiny Tree',
    pieceIndex: 0,
    stepIndex: 2,
    done: { '0:2': true },
    reps: { '0:2': 1 },
  })}`;

  await page.goto(link);
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();

  await expect(page.locator('.step-body')).toContainText('[sc, inc] x 6');
  await expect(page.getByRole('checkbox', { name: 'Step done' })).toBeChecked();
  await expect(page.locator('.big.reps')).toContainText('1');
});

test('un lien de projet modifié à la main ouvre le lecteur sans erreur technique', async ({
  page,
}) => {
  await page.goto('/#j=1not-a-valid-payload');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await expect(page.locator('.step-body')).toContainText('Paste or type your pattern above');
});
