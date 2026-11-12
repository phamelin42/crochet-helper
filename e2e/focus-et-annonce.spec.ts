import { type Page, expect, test } from '@playwright/test';

/**
 * Focus et annonce (audit front, I-1) : à chaque changement de page, le focus
 * va sur `<main>` et le titre passe dans une région `aria-live` polie ; après le
 * chargement d'un patron ou la fermeture d'un dialogue, le focus ne tombe pas
 * sur `<body>` (la lectrice repartirait du haut de la page).
 */

async function ouvrir(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

const region = (page: Page) => page.locator('fil-root > [aria-live="polite"]');
const actif = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName ?? '', id: el?.id ?? '', classe: el?.className ?? '' };
  });

test('au premier chargement, rien n’est annoncé et le focus reste au début', async ({ page }) => {
  await ouvrir(page);

  await expect(region(page)).toHaveText('');
  expect((await actif(page)).tag).toBe('BODY');
});

for (const lien of ['Glossary', 'My projects']) {
  test(`« ${lien} » : le focus va sur <main> et le titre de la page est annoncé`, async ({
    page,
  }) => {
    await ouvrir(page);

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: lien }).click();

    await expect.poll(async () => (await actif(page)).id).toBe('main');
    await expect(region(page)).toHaveText(await page.title());
    expect((await page.title()).length).toBeGreaterThan(5);
  });
}

test('retour à une page déjà vue : la page est annoncée de nouveau', async ({ page }) => {
  await ouvrir(page);
  const nav = page.getByRole('navigation', { name: 'Main' });
  await nav.getByRole('link', { name: 'Glossary' }).click();
  await expect(page).toHaveURL(/glossary/);
  const glossaire = await page.title();
  await nav.getByRole('link', { name: 'Read', exact: true }).click();
  await expect.poll(() => page.title()).not.toBe(glossaire);

  await expect(region(page)).toHaveText(await page.title());
  expect((await actif(page)).id).toBe('main');
});

test('un simple changement de fragment ne déplace pas le focus', async ({ page }) => {
  await ouvrir(page);
  const lien = page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Glossary' });
  await lien.focus();

  await page.evaluate(() => (location.hash = 'faq'));
  await page.waitForTimeout(300);

  await expect(lien).toBeFocused();
  await expect(region(page)).toHaveText('');
});

test('après « Example », le focus est sur l’étape et pas sur <body>', async ({ page }) => {
  await ouvrir(page);

  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.locator('.step-body')).toContainText('in magic ring');

  await expect.poll(async () => (await actif(page)).tag).not.toBe('BODY');
  expect((await actif(page)).classe).toContain('step-body');
});

test.describe('fermeture d’un dialogue', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const geste of ['Escape', 'choix']) {
    test(`par ${geste === 'Escape' ? 'Échap' : 'un choix'} : le focus ne tombe pas sur <body>`, async ({
      page,
    }) => {
      await ouvrir(page);
      await page
        .locator('#pattern-source')
        .fill(['Tree', 'Round 1: 6 sc (6)', 'Round 2: 12 sc (12)'].join('\n'));
      await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
      const question = page.getByRole('dialog', {
        name: 'How do you want to follow this pattern?',
      });
      await expect(question).toBeVisible();

      if (geste === 'Escape') await page.keyboard.press('Escape');
      else await question.getByRole('button', { name: 'Written steps', exact: true }).click();

      await expect(question).toBeHidden();
      await expect.poll(async () => (await actif(page)).tag).not.toBe('BODY');
    });
  }
});
