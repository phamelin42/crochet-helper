import { expect, test } from '@playwright/test';

/**
 * Fiche 26 : l'accueil doit expliquer l'outil avant de le montrer vide.
 * Le premier test lit le HTML brut, sans JavaScript (`request.get`) — c'est
 * ce que reçoit un moteur de recherche ou une visiteuse au premier octet.
 */

test('le HTML brut de « / » contient les preuves et la FAQ, jamais le dialogue de lien', async ({
  request,
}) => {
  const html = await (await request.get('/')).text();

  expect(html).toContain('Free, no account');
  expect(html).toContain('Your patterns stay on your device');
  expect(html).toContain('Any pattern: a bought PDF, a blog, a magazine');
  expect(html).toContain('Is it free?');
  expect(html).not.toContain('Open this shared pattern?');
});

test('le HTML brut de « /fr » contient les preuves et la FAQ, jamais le dialogue de lien', async ({
  request,
}) => {
  const html = await (await request.get('/fr')).text();

  expect(html).toContain('Gratuit, sans compte');
  expect(html).toContain('Vos patrons restent sur votre appareil');
  expect(html).toContain('PDF acheté, blog, magazine');
  expect(html).toContain('Est-ce gratuit');
  expect(html).not.toContain('Ouvrir ce patron partagé');
});

test('le clic sur « Voir un exemple » amène l’étape dans la fenêtre et la remplit', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await page.getByRole('button', { name: 'See an example', exact: true }).click();

  const stepBody = page.locator('.step-body');
  await expect(stepBody).toBeInViewport();
  await expect(stepBody).toContainText('magic ring');
});
