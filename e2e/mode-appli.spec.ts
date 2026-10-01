import { type Page, expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Mode appli (fiche 43) : le site installé, ou l'application du Play Store
 * (`?mode=app`), prend la forme d'une application — barre de titre, onglets en
 * bas, plus d'en-tête ni de pied de page de site, plus de présentation.
 */

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
];

const ONGLETS = [
  { nom: 'Read', chemin: '/' },
  { nom: 'My projects', chemin: '/my-projects' },
  { nom: 'Glossary', chemin: '/glossary' },
  { nom: 'Settings', chemin: '/settings' },
];

async function attendreHydratation(page: Page): Promise<void> {
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

async function ouvrirEnModeAppli(page: Page, url = '/?mode=app'): Promise<void> {
  await page.goto(url);
  await attendreHydratation(page);
}

// `display-mode: standalone` ne s'émule pas : `Emulation.setEmulatedMedia` de
// Chromium ignore cette caractéristique (essayé). Le site installé est couvert
// par `app-mode.service.spec.ts` (détection) et `tools/mode-appli-css.test.mjs`
// (le bloc `@media` est identique à celui de `html[data-app]`, testé ici).

const barre = (page: Page) => page.getByRole('navigation', { name: 'Main navigation' });

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport });

    test('plus d’en-tête, de pied de page ni de présentation ; quatre onglets nommés', async ({
      page,
    }) => {
      await ouvrirEnModeAppli(page);

      await expect(page.locator('html[data-app]')).toBeAttached();
      for (const masque of [
        page.locator('.nav'),
        page.getByRole('contentinfo'),
        page.locator('.proof-list'),
        page.locator('.how-it-works'),
        page.locator('.home-hero img'),
      ]) {
        await expect(masque).toBeHidden();
      }

      await expect(barre(page)).toBeVisible();
      for (const { nom } of ONGLETS) {
        await expect(barre(page).getByRole('link', { name: nom, exact: true })).toBeVisible();
      }
      await expect(barre(page).getByRole('link', { name: 'Read' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      // De quoi importer, sans le texte de présentation.
      await expect(page.getByRole('button', { name: 'Example', exact: true })).toBeVisible();
    });

    test('chaque onglet mène à son écran, avec le bon aria-current et le bon titre', async ({
      page,
    }) => {
      await ouvrirEnModeAppli(page);

      for (const { nom, chemin } of ONGLETS) {
        await barre(page).getByRole('link', { name: nom, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`${chemin}$`));
        await expect(barre(page).getByRole('link', { name: nom, exact: true })).toHaveAttribute(
          'aria-current',
          'page',
        );
        await expect(page.locator('.app-bar')).toHaveText(nom);
        // Un seul onglet est courant.
        await expect(barre(page).locator('[aria-current="page"]')).toHaveCount(1);
      }
    });

    test('le dernier élément de chaque écran n’est pas caché sous la barre d’onglets', async ({
      page,
    }) => {
      await ouvrirEnModeAppli(page);

      for (const { nom } of ONGLETS) {
        await barre(page).getByRole('link', { name: nom, exact: true }).click();
        await expect(page.locator('.app-bar')).toHaveText(nom);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const haut = (await barre(page).boundingBox())!.y;
        // Le bas du dernier élément réellement dessiné, pas celui de `main`
        // (qui compte sa propre marge basse, justement réservée aux onglets).
        const dernier = await page.evaluate(() =>
          Math.max(
            ...[...document.querySelectorAll('main *')]
              .map((element) => element.getBoundingClientRect())
              .filter((boite) => boite.height > 0 && boite.width > 0)
              .map((boite) => boite.bottom),
          ),
        );
        // Le contenu finit au-dessus de la barre : rien n'est caché dessous.
        expect(dernier, `bas du contenu de « ${nom} »`).toBeLessThanOrEqual(haut);
      }
    });

    test('page pleine : la barre d’onglets laisse tout l’écran à l’étape', async ({ page }) => {
      await ouvrirEnModeAppli(page);
      await page.getByRole('button', { name: 'Example', exact: true }).click();
      await expect(page.locator('html[data-focus]')).toBeAttached();

      await expect(barre(page)).toBeHidden();
      await expect(page.locator('.app-bar')).toBeHidden();
      const hauteur = page.viewportSize()!.height;
      const bas = await page.getByRole('button', { name: 'Next', exact: true }).boundingBox();
      expect(bas!.y + bas!.height).toBeLessThanOrEqual(hauteur);
    });
  });
}

test.describe('reflow à 320 px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('aucun écran ne défile en largeur, onglets compris', async ({ page }) => {
    await ouvrirEnModeAppli(page);
    for (const { nom } of ONGLETS) {
      await barre(page).getByRole('link', { name: nom, exact: true }).click();
      await expect(page.locator('.app-bar')).toHaveText(nom);
      const debordement = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(debordement, `débordement de « ${nom} »`).toBeLessThanOrEqual(0);
      // Libellés entiers : « My projects » ne déborde pas de son onglet.
      const lien = barre(page).getByRole('link', { name: nom, exact: true });
      const trop = await lien.evaluate((a) => a.scrollWidth - a.clientWidth);
      expect(trop, `onglet « ${nom} »`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('retour arrière', () => {
  test.use({ viewport: VIEWPORTS[0] });

  test('d’un onglet à l’autre, puis retour : l’onglet précédent', async ({ page }) => {
    await ouvrirEnModeAppli(page);
    await barre(page).getByRole('link', { name: 'Glossary', exact: true }).click();
    await expect(page).toHaveURL(/\/glossary$/);
    await barre(page).getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL(/\/settings$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/glossary$/);
    await expect(barre(page).getByRole('link', { name: 'Glossary', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.goBack();
    await expect(page).toHaveURL(/\/(\?mode=app.*)?$/);
    await expect(barre(page).getByRole('link', { name: 'Read', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('en page pleine, retour quitte la page pleine, pas l’écran', async ({ page }) => {
    await ouvrirEnModeAppli(page);
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    await expect(page.locator('html[data-focus]')).toBeAttached();

    await page.goBack();
    await expect(page.locator('html[data-focus]')).not.toBeAttached();
    await expect(page.locator('.step-body')).toContainText('in magic ring');
    await expect(barre(page)).toBeVisible();
  });

  test('quitter la page pleine par Échap ne laisse pas d’entrée d’historique en trop', async ({
    page,
  }) => {
    await ouvrirEnModeAppli(page);
    await barre(page).getByRole('link', { name: 'Glossary', exact: true }).click();
    await expect(page).toHaveURL(/\/glossary$/);
    await barre(page).getByRole('link', { name: 'Read', exact: true }).click();
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    await expect(page.locator('html[data-focus]')).toBeAttached();

    await page.keyboard.press('Escape');
    await expect(page.locator('html[data-focus]')).not.toBeAttached();
    // Un seul retour suffit pour revenir au glossaire.
    await page.goBack();
    await expect(page).toHaveURL(/\/glossary$/);
  });
});

test.describe('ouverture', () => {
  test.use({ viewport: VIEWPORTS[0] });

  test('avec un projet enregistré, l’ouverture mène à « Mes projets »', async ({
    page,
    context,
  }) => {
    await pageComplete(context);
    await page.goto('/');
    await attendreHydratation(page);
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    await expect(page.locator('.step-body')).toContainText('in magic ring');

    // L'écriture en IndexedDB suit le clic d'un tour de planificateur : on
    // attend qu'une page neuve, qui relit la base, voie le projet.
    await expect(async () => {
      const sonde = await context.newPage();
      await sonde.goto('/my-projects');
      await sonde.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
      const nombre = await sonde.locator('.projects-list li').count();
      await sonde.close();
      expect(nombre).toBeGreaterThan(0);
    }).toPass();

    // Une page neuve, donc une session neuve : c'est une ouverture de l'appli.
    const ouverture = await context.newPage();
    await ouvrirEnModeAppli(ouverture);
    await expect(ouverture).toHaveURL(/\/my-projects$/);
    await expect(ouverture.locator('.app-bar')).toHaveText('My projects');
  });

  test('sans projet, l’ouverture reste sur l’import', async ({ page }) => {
    await ouvrirEnModeAppli(page);
    await expect(page).toHaveURL(/\/(\?mode=app.*)?$/);
    await expect(page.locator('#pattern-source')).toBeVisible();
  });
});

test.describe('hors mode appli, rien ne change', () => {
  test('le HTML pré-rendu est celui du site : ni data-app, ni onglets visibles', async ({
    page,
    request,
  }) => {
    const html = await (await request.get('/')).text();
    expect(html).not.toContain('data-app');

    await page.goto('/');
    await attendreHydratation(page);
    await expect(page.locator('html[data-app]')).not.toBeAttached();
    await expect(barre(page)).toBeHidden();
    await expect(page.locator('.nav')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.locator('.proof-list')).toBeVisible();
  });

  test('la route Réglages n’est pas indexée', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
