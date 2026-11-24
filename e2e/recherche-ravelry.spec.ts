import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { FICHE_101, IMAGE, PDF_URL, WORKER, simulerCompte, simulerWorker } from './ravelry-simule';

/**
 * Recherche de patrons gratuits (fiche 61, ADR-004), sur le build dont
 * l'interrupteur est renseigné (projet Playwright `ravelry`) ; le Worker est
 * simulé par `page.route`. Le build livré, interrupteur éteint, est couvert par
 * `recherche-ravelry-eteinte.spec.ts`.
 */
test.use({ reducedMotion: 'reduce' });

const EN = {
  recherche: '/find-a-pattern',
  favoris: '/my-favorites',
  champ: 'What do you want to crochet or knit?',
  bouton: 'Search',
  plus: 'Show more patterns',
  ajouter: 'Add to my favourites',
  retirer: 'Remove from my favourites',
  commencer: /Start this pattern/,
  note: 'Pattern Reader is not affiliated with or endorsed by Ravelry. Data and photos: Ravelry and their authors.',
};
const FR = {
  recherche: '/fr/trouver-un-patron',
  favoris: '/fr/mes-favoris',
  champ: 'Que voulez-vous crocheter ou tricoter ?',
  bouton: 'Rechercher',
  plus: 'Voir plus de patrons',
  ajouter: 'Ajouter à mes favoris',
  retirer: 'Retirer de mes favoris',
  commencer: /Commencer ce patron/,
  note: 'Pattern Reader n’est ni affilié à Ravelry ni approuvé par Ravelry. Données et photos : Ravelry et leurs auteurs.',
};

async function ouvrir(page: Page, chemin: string): Promise<void> {
  await page.goto(chemin);
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

async function chercher(page: Page, l: typeof EN, terme = 'christmas tree'): Promise<void> {
  await page.getByLabel(l.champ).fill(terme);
  await page.getByRole('button', { name: l.bouton, exact: true }).click();
}

test('recherche, fiche, favori, liste hors ligne, retrait confirmé', async ({ page }) => {
  const worker = await simulerWorker(page);
  await ouvrir(page, EN.recherche);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find a pattern');
  await expect(page.getByText(EN.note)).toBeVisible();

  // Rien ne part tant que la lectrice n'a pas lancé la recherche, et pas à la frappe.
  await page.getByLabel(EN.champ).pressSequentially('christmas', { delay: 20 });
  expect(worker.appels).toEqual([]);
  await page.getByLabel(EN.champ).fill('christmas tree');
  await page.getByLabel(EN.champ).press('Enter');

  await expect(page).toHaveURL(/\?q=christmas(%20|\+)tree&craft=crochet$/);
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  await expect(page.getByRole('status').first()).toContainText('3 free patterns shown.');
  await expect(page.getByText('Free', { exact: true })).toHaveCount(3);
  // La vignette porte le nom du patron pour alt, avec ses dimensions.
  const vignette = page.getByAltText('Petit sapin au crochet').first();
  await expect(vignette).toHaveAttribute('loading', 'lazy');
  await expect(vignette).toHaveAttribute('width', '240');
  expect(worker.appels.filter((a) => a.includes('/recherche'))).toHaveLength(1);

  // Fiche : attribution, créatrice, description en texte brut (jamais du HTML).
  await page.getByRole('link', { name: 'Petit sapin au crochet' }).click();
  await expect(page).toHaveURL(/id=101/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Petit sapin au crochet');
  await expect(page.locator('.discover-by')).toContainText('by Camille Exemple');
  await expect(page.getByText(EN.note)).toBeVisible();
  const description = page.locator('.discover-text').first();
  await expect(description).toContainText('<b>en amigurumi</b>');
  await expect(page.locator('.discover-detail b')).toHaveCount(0);
  await expect(page.getByText('DK', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /See on Ravelry/ })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await expect(page.getByRole('button', { name: /Photo 2 of 3/ })).toBeVisible();

  // Favori : libellé qui change, état annoncé, écriture confirmée.
  await page.getByRole('button', { name: EN.ajouter, exact: true }).click();
  await expect(page.getByRole('button', { name: EN.retirer, exact: true })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Added to your favourites.' }),
  ).toHaveCount(1);

  // Retour : les résultats sont là, sans nouvel appel.
  await page.getByRole('link', { name: /Back to results/ }).click();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  expect(worker.appels.filter((a) => a.includes('/recherche'))).toHaveLength(1);

  // Mes favoris : liste lue d'IndexedDB, même sans réseau.
  await page.getByRole('link', { name: 'My favourites' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My favourites');
  await expect(page.getByRole('link', { name: 'Petit sapin au crochet' })).toBeVisible();
  // Hors ligne : ni le Worker ni les photos ne répondent, la liste vient d'IndexedDB.
  await page.route(`${WORKER}/**`, (route) => route.abort('internetdisconnected'));
  await page.route(`${IMAGE}/**`, (route) => route.abort('internetdisconnected'));
  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(page.getByRole('link', { name: 'Petit sapin au crochet' })).toBeVisible();
  // Vignette absente : un espace réservé tient la place, aucun trou.
  await expect(page.locator('.pattern-card-placeholder')).toHaveCount(1);
  await expect(page.locator('.pattern-card-media img')).toHaveCount(0);

  // Retrait : confirmation d'abord, « Annuler » ne retire rien.
  await page
    .getByRole('button', { name: 'Remove Petit sapin au crochet from my favourites' })
    .click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Petit sapin au crochet' })).toBeVisible();
  await page
    .getByRole('button', { name: 'Remove Petit sapin au crochet from my favourites' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByText('No favourites yet.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('No favourites yet.')).toBeVisible();
});

test('« Retirer tous mes favoris » demande confirmation, puis vide la liste', async ({ page }) => {
  await simulerWorker(page);
  await ouvrir(page, `${EN.recherche}?q=christmas+tree&craft=crochet&id=101`);
  await page.getByRole('button', { name: EN.ajouter, exact: true }).click();
  await expect(page.getByRole('button', { name: EN.retirer, exact: true })).toBeVisible();
  await page.goto(`${EN.recherche}?id=102`);
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: EN.ajouter, exact: true }).click();
  await expect(page.getByRole('button', { name: EN.retirer, exact: true })).toBeVisible();

  await ouvrir(page, EN.favoris);
  await expect(page.getByRole('status').first()).toContainText('2 favourites.');
  await page.getByRole('button', { name: 'Remove all my favourites', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'The 2 patterns will be removed from this device.',
  );
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Petit sapin au crochet' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove all my favourites', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remove all my favourites', exact: true })
    .click();
  await expect(page.getByText('No favourites yet.')).toBeVisible();
});

test('« Voir plus » ajoute la page suivante, sans défilement infini', async ({ page }) => {
  const worker = await simulerWorker(page);
  await ouvrir(page, EN.recherche);
  await chercher(page, EN);
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  await page.getByRole('button', { name: EN.plus, exact: true }).click();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(4);
  await expect(page.getByRole('button', { name: EN.plus, exact: true })).toHaveCount(0);
  expect(worker.appels.filter((a) => a.includes('page=2'))).toHaveLength(1);
});

test('aucun résultat : un message utile ; Tricot est transmis au Worker', async ({ page }) => {
  const worker = await simulerWorker(page);
  await ouvrir(page, EN.recherche);
  await page.getByText('Knitting', { exact: true }).click();
  await chercher(page, EN, 'zzzz');
  await expect(page.getByText(/No free pattern found for “zzzz”/).first()).toBeVisible();
  expect(worker.appels.some((a) => a.includes('craft=knitting'))).toBe(true);
});

test('champ vide : la recherche ne part pas et le dit', async ({ page }) => {
  const worker = await simulerWorker(page);
  await ouvrir(page, EN.recherche);
  await page.getByRole('button', { name: EN.bouton, exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Type something to look for');
  expect(worker.appels).toEqual([]);
});

test.describe('erreurs', () => {
  const cas = [
    {
      nom: '429 de Ravelry',
      reponse: {
        status: 429,
        corps: { raison: 'trop-de-demandes' },
        entetes: { 'retry-after': '5' },
      },
      message: 'Ravelry asks you to wait a little. Try again in 5 s.',
    },
    { nom: 'réseau coupé', reponse: 'reseau' as const, message: 'could not reach the service' },
    {
      nom: 'service indisponible',
      reponse: { status: 503, corps: { raison: 'indisponible' } },
      message: 'unavailable right now',
    },
    {
      nom: 'limite du jour',
      reponse: { status: 429, corps: { raison: 'quota-jour' } },
      message: 'reached today’s search limit',
    },
  ];
  for (const c of cas) {
    test(`${c.nom} : message dit, « Try again » relance`, async ({ page }) => {
      const worker = await simulerWorker(page);
      await ouvrir(page, EN.recherche);
      worker.prochaineRecherche(c.reponse);
      await chercher(page, EN);
      const alerte = page.getByRole('alert');
      await expect(alerte).toContainText(c.message);
      await alerte.getByRole('button', { name: 'Try again', exact: true }).click();
      await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
      await expect(page.getByRole('alert')).toHaveCount(0);
    });
  }

  test('fiche introuvable : message et retour', async ({ page }) => {
    await simulerWorker(page);
    await ouvrir(page, `${EN.recherche}?id=999`);
    await expect(page.getByRole('alert')).toContainText('does not exist, or is not free');
  });
});

test('« Commencer ce patron » ouvre la source, le lecteur montre le bandeau, le projet garde son origine', async ({
  page,
}) => {
  await simulerWorker(page);
  await ouvrir(page, `${EN.recherche}?q=christmas+tree&craft=crochet&id=101`);

  const lien = page.getByRole('link', { name: EN.commencer });
  await expect(lien).toHaveAttribute('href', PDF_URL);
  await expect(lien).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(lien).toHaveAttribute('target', '_blank');
  await expect(lien).toContainText('(new tab)');
  const [popup] = await Promise.all([page.waitForEvent('popup'), lien.click()]);
  await popup.waitForLoadState();
  expect(popup.url()).toBe(PDF_URL);

  // Cet onglet-ci passe au lecteur, qui dit quel patron attend son texte.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.ravelry-start')).toContainText(
    'Drop the PDF of Petit sapin au crochet here, or paste its text.',
  );
  await expect(page.locator('#pattern-source')).toBeFocused();

  await page
    .locator('#pattern-source')
    .fill('Round 1: 6 sc in a magic ring (6)\nRound 2: inc in each st (12)');
  await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
  await expect(page.locator('.step-body:not(.empty)')).toBeVisible();

  // Le projet est un nouveau projet, relié à son patron.
  await page.goto('/my-projects');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  const origine = page.getByRole('link', { name: /From a pattern by Camille Exemple on Ravelry/ });
  await expect(origine).toHaveAttribute('href', FICHE_101.lien);
  await expect(origine).toHaveAttribute('target', '_blank');
  await expect(origine).toHaveAttribute('rel', 'noopener noreferrer');

  // Le bandeau ne revient pas pour le patron suivant.
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(page.locator('.ravelry-start')).toHaveCount(0);
});

test('le bandeau ne s’ajoute pas au-dessus de l’étape d’un patron chargé', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await simulerWorker(page);
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.locator('.step-body:not(.empty)')).toBeVisible();
  const sans = (await page.locator('.step-body').boundingBox())!;

  await ouvrir(page, `${EN.recherche}?id=101`);
  await page.getByRole('link', { name: EN.commencer }).click();
  await expect(page.locator('.ravelry-start')).toBeVisible();
  const avec = (await page.locator('.step-body').boundingBox())!;
  expect(avec.y).toBeLessThanOrEqual(sans.y + 1);
  expect(avec.height).toBeLessThan(450);
});

test('le même parcours en français', async ({ page }) => {
  await simulerWorker(page);
  await ouvrir(page, FR.recherche);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rechercher un patron');
  await expect(page.getByText(FR.note)).toBeVisible();
  await chercher(page, FR, 'christmas tree');
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  await page.getByRole('link', { name: 'Petit sapin au crochet' }).click();
  await expect(page.locator('.discover-by')).toContainText('par Camille Exemple');
  await page.getByRole('button', { name: FR.ajouter, exact: true }).click();
  await expect(page.getByRole('button', { name: FR.retirer, exact: true })).toBeVisible();
  await ouvrir(page, FR.favoris);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mes favoris');
  await expect(page.getByText(FR.note)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Retirer tous mes favoris', exact: true }),
  ).toBeVisible();
});

test('l’écran de fin propose de chercher un autre patron quand la recherche est ouverte', async ({
  page,
}) => {
  await ouvrir(page, '/');
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  const suivante = page.getByRole('button', { name: 'Next', exact: true });
  await expect(suivante).toBeEnabled();
  const titre = page.locator('.celebration-title');
  for (let i = 0; i < 120 && !(await titre.isVisible()); i++) {
    await suivante.click({ timeout: 1500 }).catch(() => undefined);
  }
  await expect(page.getByRole('link', { name: 'Find another pattern', exact: true })).toBeVisible();
});

/* ——— mode « ouvert » (fiche 62) : la connexion ne sert qu'à la galerie ——— */

test('mode ouvert : recherche et fiche sans connexion, la galerie propose de se connecter', async ({
  page,
}) => {
  const compte = await simulerCompte(page, 'ouvert');
  await ouvrir(page, `${EN.recherche}?q=christmas+tree&craft=crochet`);
  // Aucun écran de connexion, aucun jeton : comme au lot 5.
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Connect with Ravelry' })).toHaveCount(0);
  await expect(page.getByText('Connected to Ravelry')).toHaveCount(0);
  expect(compte.autorisations.every((a) => a === null)).toBe(true);

  await page.getByRole('link', { name: 'Petit sapin au crochet' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Petit sapin au crochet');
  await expect(page.locator('.projects-grid img')).toHaveCount(0);
  expect(compte.appels.some((a) => a.includes('/projets'))).toBe(false);

  const connecter = page.getByRole('button', {
    name: 'Connect to see projects made with this pattern',
    exact: true,
  });
  await connecter.click();
  // Retour sur la même fiche, avec la galerie.
  await expect(page.getByText('Connected to Ravelry')).toBeVisible();
  await expect(page.locator('.projects-grid img')).toHaveCount(3);
  await expect(page).toHaveURL(/id=101/);
});

/* ——— accessibilité, reflow, cibles ——— */

const THEMES = [
  { nom: 'clair', dim: false },
  { nom: 'sombre', dim: true },
] as const;

async function pretPourAxe(page: Page, dim: boolean): Promise<void> {
  if (dim) {
    await page.evaluate(() => document.documentElement.setAttribute('data-dim', 'true'));
    await expect(page.locator('html[data-dim="true"]')).toBeAttached();
  }
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState === 'finished'),
  );
}

async function violations(page: Page): Promise<unknown[]> {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return r.violations.map(({ id, help, nodes }) => ({
    id,
    help,
    cibles: nodes.map((n) => n.target),
  }));
}

/** Les trois états de l'écran, chacun prêt à être audité. */
const ETATS = {
  'recherche avec résultats': async (page: Page) => {
    await ouvrir(page, `${EN.recherche}?q=christmas+tree&craft=crochet`);
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  },
  'fiche d’un patron': async (page: Page) => {
    await ouvrir(page, `${EN.recherche}?id=101`);
    await expect(page.getByRole('button', { name: EN.ajouter, exact: true })).toBeVisible();
    await expect(page.locator('.gallery-main')).toBeVisible();
  },
  'Mes favoris vide': async (page: Page) => {
    await ouvrir(page, EN.favoris);
    await expect(page.getByText('No favourites yet.')).toBeVisible();
  },
  'Mes favoris avec un patron': async (page: Page) => {
    await ouvrir(page, `${EN.recherche}?id=101`);
    await page.getByRole('button', { name: EN.ajouter, exact: true }).click();
    await expect(page.getByRole('button', { name: EN.retirer, exact: true })).toBeVisible();
    await ouvrir(page, EN.favoris);
    await expect(page.getByRole('link', { name: 'Petit sapin au crochet' })).toBeVisible();
  },
  'erreur de recherche': async (page: Page) => {
    await ouvrir(page, EN.recherche);
    // Le Worker est simulé en erreur par l'appelant.
    await chercher(page, EN);
    await expect(page.getByRole('alert')).toBeVisible();
  },
};

for (const [nom, preparer] of Object.entries(ETATS)) {
  for (const theme of THEMES) {
    test(`${nom} — thème ${theme.nom} — aucune violation axe`, async ({ page }) => {
      const worker = await simulerWorker(page);
      if (nom === 'erreur de recherche') {
        worker.prochaineRecherche({ status: 503, corps: { raison: 'indisponible' } });
      }
      await preparer(page);
      await pretPourAxe(page, theme.dim);
      expect(await violations(page)).toEqual([]);
    });
  }
}

for (const largeur of [320, 390, 820]) {
  for (const [nom, preparer] of Object.entries(ETATS)) {
    test(`${nom} à ${largeur} px : pas de défilement horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 800 });
      const worker = await simulerWorker(page);
      if (nom === 'erreur de recherche') {
        worker.prochaineRecherche({ status: 503, corps: { raison: 'indisponible' } });
      }
      await preparer(page);
      const debord = await page.evaluate(() => {
        const largeur = document.documentElement.clientWidth;
        return {
          px: document.documentElement.scrollWidth - largeur,
          // Qui dépasse, pour que l'échec se lise sans rejouer la page.
          fautifs: [...document.querySelectorAll('main *')]
            .filter((e) => e.getBoundingClientRect().right > largeur + 0.5)
            .map(
              (e) => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().right)}`,
            )
            .slice(0, 8),
        };
      });
      expect(debord.fautifs).toEqual([]);
      expect(debord.px).toBeLessThanOrEqual(0);
    });
  }
}

test('toute commande des nouvelles pages fait 48 px, tout texte lu 16 px au moins', async ({
  page,
}) => {
  await simulerWorker(page);
  for (const [nom, preparer] of Object.entries(ETATS)) {
    if (nom === 'erreur de recherche') continue;
    await preparer(page);
    const mesures = await page.evaluate(() => {
      const commandes = [
        ...document.querySelectorAll<HTMLElement>(
          'main button, main .btn, main input:not([type=radio]), main .gallery-thumb, main .card-title a',
        ),
      ].filter((el) => el.getClientRects().length > 0 && !el.closest('.visually-hidden'));
      return commandes.map((el) => ({
        nom: (el.getAttribute('aria-label') ?? el.textContent ?? el.tagName).trim().slice(0, 40),
        h: el.getBoundingClientRect().height,
      }));
    });
    expect(mesures.length, nom).toBeGreaterThan(0);
    for (const m of mesures) expect(m.h, `${nom} : ${m.nom}`).toBeGreaterThanOrEqual(47.5);
    const petits = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          'main p, main li, main dd, main dt, main label, main button, main a',
        ),
      ]
        .filter(
          (el) =>
            el.getClientRects().length > 0 &&
            el.textContent?.trim() &&
            !el.closest('.visually-hidden'),
        )
        .map((el) => ({
          t: el.textContent!.trim().slice(0, 30),
          px: parseFloat(getComputedStyle(el).fontSize),
        }))
        .filter((x) => x.px < 14),
    );
    expect(petits, `${nom} : texte sous 14 px`).toEqual([]);
  }
});
