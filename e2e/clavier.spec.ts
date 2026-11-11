import { type Page, expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Raccourcis clavier du lecteur (audit front, B-1). Espace, PageHaut/Bas et les
 * flèches faisaient avancer l'étape depuis n'importe quel bouton, bloquaient le
 * défilement de l'accueil et le geste natif des résumés ; Échap dans un dialogue
 * quittait aussi la page pleine. Chaque cas est parcouru **en entier** : toutes
 * les touches sur tous les types d'éléments.
 */

const PATRON = [
  'Round 1: sc in each st (6)',
  'Round 2: inc in each st (12)',
  'Round 3: sc around (12)',
  'Round 4: sc around (12)',
].join('\n');

const TOUCHES = [' ', 'PageDown', 'PageUp', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];

async function ouvrir(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

async function charger(page: Page): Promise<void> {
  await ouvrir(page);
  await page.locator('#pattern-source').fill(PATRON);
  await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
  await expect(page.locator('.stepcount')).toContainText('Step 1 / 4');
}

const etape = (page: Page) => page.locator('.stepcount').textContent();

test.describe('sans patron chargé : la page défile comme partout', () => {
  for (const touche of [' ', 'PageDown', 'ArrowDown']) {
    test(`touche « ${touche === ' ' ? 'Espace' : touche} » sur l’accueil`, async ({ page }) => {
      await ouvrir(page);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      await page.keyboard.press(touche);

      await expect
        .poll(() => page.evaluate(() => window.scrollY), { message: 'la page n’a pas défilé' })
        .toBeGreaterThan(0);
    });
  }

  test('Espace sur le résumé d’une question de la FAQ l’ouvre', async ({ page }) => {
    await ouvrir(page);
    const resume = page.locator('.faq summary').first();
    await resume.focus();
    await expect(page.locator('.faq details').first()).not.toHaveAttribute('open', '');

    await page.keyboard.press(' ');

    await expect(page.locator('.faq details').first()).toHaveAttribute('open', '');
  });
});

test.describe('patron chargé : une touche appartient d’abord à l’élément qui a le focus', () => {
  test.beforeEach(({ page }) => pageComplete(page));

  const CIBLES: Record<string, (page: Page) => Promise<void>> = {
    'bouton (« Reset repeats »)': (page) =>
      page.getByRole('button', { name: 'Reset repeats', exact: true }).focus(),
    'lien de l’en-tête': (page) =>
      page.getByRole('link', { name: 'Glossary', exact: true }).focus(),
    'résumé d’un panneau': (page) => page.locator('summary').first().focus(),
    'abréviation (role=button)': (page) => page.locator('.step-body .abbr').first().focus(),
    'champ de texte': async (page) => {
      await page.getByRole('button', { name: 'Change pattern', exact: true }).click();
      await expect(page.locator('#pattern-source')).toBeFocused();
    },
  };

  for (const [nom, focaliser] of Object.entries(CIBLES)) {
    test(`focus sur ${nom} : aucune touche ne fait avancer l’étape`, async ({ page }) => {
      await charger(page);
      await focaliser(page);
      const avant = await etape(page);

      for (const touche of TOUCHES) {
        await page.keyboard.press(touche);
        expect(await etape(page), `« ${touche} » sur ${nom}`).toBe(avant);
        // Une touche sur un lien ne doit pas non plus changer de page.
        expect(new URL(page.url()).pathname).toBe('/');
      }
    });
  }

  test('Espace sur « Next » avance d’une seule étape (le clic natif, pas deux fois)', async ({
    page,
  }) => {
    await charger(page);
    await page.getByRole('button', { name: 'Next', exact: true }).focus();

    await page.keyboard.press(' ');

    await expect(page.locator('.stepcount')).toContainText('Step 2 / 4');
  });

  test('Espace sur « Previous » ne fait pas avancer le patron', async ({ page }) => {
    await charger(page);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.locator('.stepcount')).toContainText('Step 2 / 4');
    await page.getByRole('button', { name: 'Previous', exact: true }).focus();

    await page.keyboard.press(' ');

    await expect(page.locator('.stepcount')).toContainText('Step 1 / 4');
  });

  test('sur la page, hors de tout contrôle, les flèches et Espace conduisent toujours la lecture', async ({
    page,
  }) => {
    await charger(page);
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await (
      await page.evaluateHandle(() => document.activeElement as HTMLElement)
    ).evaluate((el) => el.blur());

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.stepcount')).toContainText('Step 2 / 4');
    await page.keyboard.press(' ');
    await expect(page.locator('.stepcount')).toContainText('Step 3 / 4');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.stepcount')).toContainText('Step 2 / 4');
  });
});

test.describe('dialogue ouvert : il garde le clavier', () => {
  // Sans choix retenu, « Example » pose la question « Written steps / Chart ».
  test.use({ storageState: { cookies: [], origins: [] } });

  const question = (page: Page) =>
    page.getByRole('dialog', { name: 'How do you want to follow this pattern?' });

  async function ouvrirQuestion(page: Page): Promise<void> {
    await ouvrir(page);
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    await expect(question(page)).toBeVisible();
  }

  test('Échap ferme le dialogue seulement : la page pleine reste', async ({ page }) => {
    await ouvrirQuestion(page);
    await expect(page.locator('html[data-focus]')).toBeAttached();

    await page.keyboard.press('Escape');

    await expect(question(page)).toBeHidden();
    await expect(page.locator('html[data-focus]')).toBeAttached();
  });

  for (const touche of TOUCHES) {
    test(`touche « ${touche === ' ' ? 'Espace' : touche} » dans le dialogue : l’étape ne bouge pas`, async ({
      page,
    }) => {
      await ouvrirQuestion(page);
      const avant = await etape(page);
      await question(page).getByRole('button', { name: 'Chart', exact: true }).focus();

      await page.keyboard.press(touche);

      // Espace active « Chart » (le dialogue se ferme) : l'étape reste la même.
      await expect.poll(() => etape(page)).toBe(avant);
    });
  }

  test('Espace sur « Written steps » choisit l’affichage au lieu de faire avancer le patron', async ({
    page,
  }) => {
    await ouvrirQuestion(page);
    const avant = await etape(page);
    await question(page).getByRole('button', { name: 'Written steps', exact: true }).focus();

    await page.keyboard.press(' ');

    await expect(question(page)).toBeHidden();
    expect(await etape(page)).toBe(avant);
  });
});

test.describe('infobulle ouverte', () => {
  test('Échap ferme l’infobulle sans quitter la page pleine', async ({ page }) => {
    await ouvrir(page);
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    await expect(page.locator('.step-body')).toContainText('in magic ring');
    await expect(page.locator('html[data-focus]')).toBeAttached();
    await page.locator('.step-body .abbr').first().focus();
    await expect(page.locator('.tip.on')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.locator('.tip.on')).toHaveCount(0);
    await expect(page.locator('html[data-focus]')).toBeAttached();

    // Une seconde fois, plus d'infobulle : Échap retrouve son rôle.
    await page.keyboard.press('Escape');
    await expect(page.locator('html[data-focus]')).toHaveCount(0);
  });
});
