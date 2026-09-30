import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Fiche 39 : proposer l'installation, dire que ça marche hors ligne.
 * Chromium n'émet pas `beforeinstallprompt` en test : on le simule, comme le
 * ferait un navigateur qui juge le site installable.
 */

const CARD_TITLE = 'Keep your patterns at hand';

async function ready(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

/** Attend que la carte ait chargé son service (donc son écouteur), puis déclenche l'invite. */
async function firePrompt(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector('fil-install-slot') !== null);
  // L'écouteur naît avec le chunk `install-card`, chargé après le premier rendu :
  // on réémet jusqu'à ce que la carte apparaisse plutôt que de parier sur un délai.
  await expect(async () => {
    await page.evaluate(() => {
      const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(event);
    });
    await expect(page.getByRole('heading', { name: CARD_TITLE })).toBeVisible({ timeout: 500 });
  }).toPass();
}

test('l’accueil ne montre aucune carte sans invite d’installation', async ({ page }) => {
  await ready(page);
  await expect(page.locator('fil-install-slot')).toBeAttached();
  await expect(page.getByRole('heading', { name: CARD_TITLE })).toHaveCount(0);
});

test('un beforeinstallprompt fait apparaître « Install » sur l’accueil', async ({ page }) => {
  await ready(page);
  await firePrompt(page);

  await expect(page.getByRole('button', { name: 'Install', exact: true })).toBeVisible();
  await expect(page.getByText('works without a connection')).toBeVisible();
});

test('en français, la carte parle français', async ({ page }) => {
  await ready(page, '/fr');
  await page.waitForFunction(() => document.querySelector('fil-install-slot') !== null);
  await expect(async () => {
    await page.evaluate(() => {
      const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(event);
    });
    await expect(
      page.getByRole('heading', { name: 'Gardez vos patrons sous la main' }),
    ).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(page.getByRole('button', { name: 'Installer', exact: true })).toBeVisible();
});

test('ouverte en mode autonome, l’application ne propose pas de s’installer', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query.includes('display-mode: standalone')
        ? ({ ...original('all'), matches: true, media: query } as MediaQueryList)
        : original(query);
  });
  await ready(page);
  await page.waitForTimeout(500);
  await page.evaluate(() =>
    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      }),
    ),
  );
  await expect(page.getByRole('heading', { name: CARD_TITLE })).toHaveCount(0);
});

test('« Later » masque la carte et le choix survit au rechargement', async ({ page }) => {
  await ready(page);
  await firePrompt(page);
  await page.getByRole('button', { name: 'Later', exact: true }).click();
  await expect(page.getByRole('heading', { name: CARD_TITLE })).toHaveCount(0);

  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.waitForTimeout(500);
  await page.evaluate(() =>
    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      }),
    ),
  );
  await expect(page.getByRole('heading', { name: CARD_TITLE })).toHaveCount(0);
});

test('la carte n’apparaît jamais quand un patron est ouvert', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await expect(page.locator('fil-install-slot')).toHaveCount(0);
});

test('la carte est aussi en tête de « Mes projets »', async ({ page }) => {
  await ready(page, '/my-projects');
  await firePrompt(page);
  await expect(page.getByRole('button', { name: 'Install', exact: true })).toBeVisible();
});

test('la carte d’installation ne viole aucune règle axe sérieuse', async ({ page }) => {
  await ready(page);
  await firePrompt(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
});

test('hors ligne : le patron et l’étape reviennent après rechargement', async ({
  page,
  context,
}) => {
  await ready(page);
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();

  // Le worker s'enregistre quand l'application est stable, puis précharge tout le site.
  await expect(async () => {
    const state = await page.evaluate(async () => (await fetch('/ngsw/state')).text());
    expect(state).toContain('Driver state: NORMAL');
  }).toPass({ timeout: 30_000 });
  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  const step = await page.locator('.step-body').innerText();

  await context.setOffline(true);
  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  expect(await page.locator('.step-body').innerText()).toBe(step);
});
