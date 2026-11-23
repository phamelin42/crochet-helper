import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { type Page, expect, test } from '@playwright/test';
import { ACCESS_TOKEN, CODE, REFRESH_TOKEN, simulerCompte } from './ravelry-simule';

/**
 * Connexion à Ravelry (fiche 62, ADR-004), sur le build « compte » (projet Playwright
 * `ravelry-compte`) : la recherche est réservée aux lectrices connectées. Ravelry ET le
 * Worker sont simulés par `page.route` : aucun appel réel, aucun vrai jeton.
 */
test.use({ reducedMotion: 'reduce' });

const EN = {
  recherche: '/find-a-pattern',
  titre: 'Connect with Ravelry',
  connecter: 'Connect with Ravelry',
  deconnecter: 'Disconnect from Ravelry',
  connectee: 'Connected to Ravelry',
  champ: 'What do you want to crochet or knit?',
  plus: 'Show more projects',
};
const FR = {
  recherche: '/fr/trouver-un-patron',
  titre: 'Se connecter avec Ravelry',
  connecter: 'Se connecter avec Ravelry',
  deconnecter: 'Se déconnecter de Ravelry',
  connectee: 'Connectée à Ravelry',
};

async function ouvrir(page: Page, chemin: string): Promise<void> {
  await page.goto(chemin);
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

/** Ce qui est écrit dans IndexedDB (jetons) et dans les deux stockages de la page. */
async function stockage(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('fil');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const session = await new Promise<unknown>((resolve) => {
      const r = db
        .transaction('ravelry-session', 'readonly')
        .objectStore('ravelry-session')
        .get('session');
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => resolve(null);
    });
    db.close();
    return {
      session: session as {
        accessToken: string;
        refreshToken: string | null;
        expiresAt: number;
      } | null,
      local: JSON.stringify({ ...localStorage }),
      session_storage: JSON.stringify({ ...sessionStorage }),
    };
  });
}

/** Parcours complet jusqu'à la recherche connectée. */
async function seConnecter(page: Page, chemin = `${EN.recherche}?q=christmas+tree&craft=crochet`) {
  await ouvrir(page, chemin);
  await page.getByRole('button', { name: EN.connecter, exact: true }).click();
  await expect(page.getByText(EN.connectee)).toBeVisible();
}

test('mode compte sans connexion : l’écran de connexion remplace la recherche, rien ne part', async ({
  page,
}) => {
  const compte = await simulerCompte(page);
  await ouvrir(page, EN.recherche);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find a pattern');
  await expect(page.getByRole('heading', { name: EN.titre, level: 2 })).toBeVisible();
  // Pourquoi, ce qui est vu, ce qui n'est pas fait.
  await expect(page.getByText('Ravelry asks that its patterns and their photos')).toBeVisible();
  await expect(page.getByText('Read-only access: free patterns and their photos.')).toBeVisible();
  await expect(page.getByText('does not read your messages')).toBeVisible();
  const creer = page.getByRole('link', { name: /Create a free Ravelry account/ });
  await expect(creer).toHaveAttribute('target', '_blank');
  await expect(creer).toHaveAttribute('rel', /noopener/);
  await expect(creer).toContainText('(opens in a new tab)');
  // Ni formulaire de recherche, ni appel au Worker.
  await expect(page.getByRole('search')).toHaveCount(0);
  await expect(page.getByLabel('What do you want to crochet or knit?')).toHaveCount(0);
  expect(compte.appels).toEqual([]);
});

test('même écran en français, et la fiche d’un patron est aussi derrière la connexion', async ({
  page,
}) => {
  const compte = await simulerCompte(page);
  await ouvrir(page, `${FR.recherche}?id=101`);
  await expect(page.getByRole('heading', { name: FR.titre, level: 2 })).toBeVisible();
  await expect(page.getByText('Ravelry demande que ses patrons et leurs photos')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajouter à mes favoris' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Créer un compte Ravelry gratuit/ })).toBeVisible();
  expect(compte.appels).toEqual([]);
});

test('les favoris enregistrés restent consultables sans connexion', async ({ page }) => {
  const compte = await simulerCompte(page);
  await ouvrir(page, '/my-favorites');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My favourites');
  await expect(page.getByRole('heading', { name: EN.titre })).toHaveCount(0);
  expect(compte.appels).toEqual([]);
});

test('connexion complète : PKCE, state, jetons sur l’appareil, retour à la recherche, adresse propre', async ({
  page,
}) => {
  const compte = await simulerCompte(page);
  await ouvrir(page, `${EN.recherche}?q=christmas+tree&craft=crochet`);
  await page.getByRole('button', { name: EN.connecter, exact: true }).click();

  // Retour à la page d'origine, connectée, avec ses résultats.
  await expect(page.getByText(EN.connectee)).toBeVisible();
  await expect(page).toHaveURL(/\/find-a-pattern\?q=christmas(%20|\+)tree&craft=crochet$/);
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);

  // La demande faite à Ravelry : PKCE S256, scope unique, adresse de retour unique.
  const demande = compte.autorisations_ravelry[0];
  const origine = new URL(page.url()).origin;
  expect(demande.get('response_type')).toBe('code');
  expect(demande.get('client_id')).toBe('client-de-test');
  expect(demande.get('redirect_uri')).toBe(`${origine}/ravelry-callback`);
  expect(demande.get('scope')).toBe('offline_access');
  expect(demande.get('code_challenge_method')).toBe('S256');
  const echange = compte.corpsOauth.find((c) => c.chemin === '/oauth/jeton')!.corps;
  expect(echange['code']).toBe(CODE);
  expect(echange['redirect_uri']).toBe(`${origine}/ravelry-callback`);
  expect(echange['code_verifier']).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
  expect(createHash('sha256').update(echange['code_verifier']).digest('base64url')).toBe(
    demande.get('code_challenge'),
  );

  // Jetons : IndexedDB seulement ; ni stockage lisible, ni adresse, ni historique.
  const s = await stockage(page);
  expect(s.session).toMatchObject({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN });
  expect(s.local).not.toContain('at-exemple');
  expect(s.session_storage).not.toContain('at-exemple');
  expect(s.session_storage).not.toContain('code_verifier');
  expect(page.url()).not.toMatch(/code=|state=|at-exemple/);
  // Le départ gardé le temps de l'aller-retour est effacé.
  expect(s.session_storage).not.toContain('fil.ravelry.flow');

  // La recherche part avec le jeton de la lectrice, jamais sans.
  expect(compte.autorisations.length).toBeGreaterThan(0);
  expect(compte.autorisations.every((a) => a === `Bearer ${ACCESS_TOKEN}`)).toBe(true);
});

test('recherche, fiche et galerie des ouvrages, connectée', async ({ page }) => {
  const compte = await simulerCompte(page);
  await seConnecter(page);
  await page.getByRole('link', { name: 'Petit sapin au crochet' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Petit sapin au crochet');

  // Galerie : photo avec alt, lien vers Ravelry en nouvel onglet, rien d'autre.
  await expect(
    page.getByRole('heading', { name: 'Projects made with this pattern' }),
  ).toBeVisible();
  const images = page.locator('.projects-grid img');
  await expect(images).toHaveCount(3);
  await expect(images.first()).toHaveAttribute('alt', 'Project made with this pattern, photo 1');
  const lien = page.getByRole('link', { name: /View on Ravelry, project 2/ });
  await expect(lien).toHaveAttribute('href', 'https://www.ravelry.com/projects/exemple/ouvrage-2');
  await expect(lien).toHaveAttribute('target', '_blank');
  await expect(lien).toHaveAttribute('rel', /noopener/);

  await page.getByRole('button', { name: EN.plus, exact: true }).click();
  await expect(images).toHaveCount(4);
  await expect(page.getByRole('button', { name: EN.plus, exact: true })).toHaveCount(0);
  expect(compte.appels.filter((a) => a.includes('/projets'))).toHaveLength(2);
  expect(compte.autorisations.every((a) => a === `Bearer ${ACCESS_TOKEN}`)).toBe(true);
});

test('un patron sans ouvrage : « Nobody has shared a project yet. »', async ({ page }) => {
  await simulerCompte(page);
  await seConnecter(page);
  await page.getByRole('link', { name: 'Sapin de table' }).click();
  await expect(page.getByText('Nobody has shared a project yet.')).toBeVisible();
});

test('se déconnecter efface tout sur l’appareil, le dit, et referme la recherche', async ({
  page,
}) => {
  const compte = await simulerCompte(page);
  await seConnecter(page);
  await page.getByRole('button', { name: EN.deconnecter, exact: true }).click();

  await expect(page.getByRole('heading', { name: EN.titre, level: 2 })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'You are disconnected from Ravelry' }),
  ).toContainText('open your Ravelry account settings');
  const s = await stockage(page);
  expect(s.session).toBeNull();
  expect(s.local + s.session_storage).not.toContain('at-exemple');
  // Plus rien de la recherche en mémoire : se reconnecter repart de zéro.
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(0);

  // Après rechargement : toujours déconnectée.
  const avant = compte.appels.length;
  await ouvrir(page, EN.recherche);
  await expect(page.getByRole('heading', { name: EN.titre, level: 2 })).toBeVisible();
  expect(compte.appels.length).toBe(avant);
});

test('la connexion survit à un rechargement : la lectrice reste connectée', async ({ page }) => {
  await simulerCompte(page);
  await seConnecter(page);
  await ouvrir(page, `${EN.recherche}?q=christmas+tree&craft=crochet`);
  await expect(page.getByText(EN.connectee)).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
});

test('un state falsifié est refusé : aucune connexion, aucun échange', async ({ page }) => {
  const compte = await simulerCompte(page);
  await ouvrir(page, EN.recherche);
  compte.prochainRetour('state-falsifie');
  await page.getByRole('button', { name: EN.connecter, exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'The connection could not be verified, please try again.',
  );
  await expect(page).toHaveURL(/\/ravelry-callback$/);
  expect(compte.corpsOauth).toEqual([]);
  expect((await stockage(page)).session).toBeNull();
});

test('en français, le refus d’un state falsifié est dit en français', async ({ page }) => {
  const compte = await simulerCompte(page);
  await ouvrir(page, FR.recherche);
  compte.prochainRetour('state-falsifie');
  await page.getByRole('button', { name: FR.connecter, exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'La connexion n’a pas pu être vérifiée, réessayez.',
  );
  await expect(
    page.getByRole('link', { name: 'Retour à la recherche de patrons' }),
  ).toHaveAttribute('href', '/fr/trouver-un-patron');
});

test('un refus d’accès est dit, rien n’est partagé ni enregistré', async ({ page }) => {
  const compte = await simulerCompte(page);
  await ouvrir(page, FR.recherche);
  compte.prochainRetour('refus');
  await page.getByRole('button', { name: FR.connecter, exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Vous avez refusé l’accès : rien n’a été partagé.',
  );
  expect(compte.corpsOauth).toEqual([]);
  expect((await stockage(page)).session).toBeNull();
});

test('un retour de Ravelry sans départ (adresse ouverte à la main) est refusé', async ({
  page,
}) => {
  const compte = await simulerCompte(page);
  await ouvrir(page, `/ravelry-callback?code=${CODE}&state=quelconque`);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/ravelry-callback$/);
  expect(compte.corpsOauth).toEqual([]);
});

test('session expirée : un seul renouvellement, puis « Votre connexion à Ravelry a expiré »', async ({
  page,
}) => {
  const compte = await simulerCompte(page);
  await seConnecter(page, `${FR.recherche}?q=christmas+tree&craft=crochet`);
  await expect(page.getByText(FR.connectee)).toBeVisible();
  compte.expirer();
  await page.getByLabel('Que voulez-vous crocheter ou tricoter ?').fill('guirlande');
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();

  await expect(page.getByRole('heading', { name: FR.titre, level: 2 })).toBeVisible();
  await expect(page.getByText('Votre connexion à Ravelry a expiré.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Se reconnecter', exact: true })).toBeVisible();
  // Un seul renouvellement : jamais de boucle.
  expect(compte.corpsOauth.filter((c) => c.chemin === '/oauth/rafraichir')).toHaveLength(1);
  expect((await stockage(page)).session).toBeNull();

  // Se reconnecter ramène à la recherche.
  await page.getByRole('button', { name: 'Se reconnecter', exact: true }).click();
  await expect(page.getByText(FR.connectee)).toBeVisible();
});

test('Réglages : la section Ravelry connecte et déconnecte', async ({ page }) => {
  await simulerCompte(page);
  await ouvrir(page, '/settings');
  await expect(page.getByRole('heading', { name: 'Ravelry', exact: true })).toBeVisible();
  await page.getByRole('button', { name: EN.connecter, exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText(EN.connectee)).toBeVisible();
  await page.getByRole('button', { name: EN.deconnecter, exact: true }).click();
  await expect(page.getByRole('button', { name: EN.connecter, exact: true })).toBeVisible();
  await expect(page.getByText('You are disconnected from Ravelry')).toBeVisible();
  expect((await stockage(page)).session).toBeNull();
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

const ETATS = {
  'écran de connexion': async (page: Page) => {
    await simulerCompte(page);
    await ouvrir(page, EN.recherche);
    await expect(page.getByRole('button', { name: EN.connecter, exact: true })).toBeVisible();
  },
  'écran de connexion expirée': async (page: Page) => {
    const compte = await simulerCompte(page);
    await seConnecter(page);
    compte.expirer();
    await page.getByLabel('What do you want to crochet or knit?').fill('x');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByText('Your connection to Ravelry has expired.')).toBeVisible();
  },
  'page de retour (refus de vérification)': async (page: Page) => {
    await simulerCompte(page);
    await ouvrir(page, '/ravelry-callback?code=x&state=y');
    await expect(page.getByRole('alert')).toBeVisible();
  },
  'fiche avec la galerie': async (page: Page) => {
    await simulerCompte(page);
    await seConnecter(page);
    await page.getByRole('link', { name: 'Petit sapin au crochet' }).click();
    await expect(page.locator('.projects-grid img')).toHaveCount(3);
  },
  'recherche connectée': async (page: Page) => {
    await simulerCompte(page);
    await seConnecter(page);
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  },
  'Réglages, section Ravelry': async (page: Page) => {
    await simulerCompte(page);
    await ouvrir(page, '/settings');
    await expect(page.getByRole('button', { name: EN.connecter, exact: true })).toBeVisible();
  },
};

for (const [nom, preparer] of Object.entries(ETATS)) {
  for (const theme of THEMES) {
    test(`${nom} — thème ${theme.nom} — aucune violation axe`, async ({ page }) => {
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
      await preparer(page);
      const debord = await page.evaluate(() => {
        const l = document.documentElement.clientWidth;
        return {
          px: document.documentElement.scrollWidth - l,
          fautifs: [...document.querySelectorAll('main *')]
            .filter((e) => e.getBoundingClientRect().right > l + 0.5)
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

test('toute commande de la connexion fait 48 px, tout texte lu 16 px au moins', async ({
  page,
}) => {
  for (const [nom, preparer] of Object.entries(ETATS)) {
    await preparer(page);
    const trop = await page.evaluate(() => {
      const visible = (e: Element) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
      };
      const petitesCommandes = [...document.querySelectorAll('main button, main a.btn')]
        .filter(visible)
        .map((e) => ({ e, h: e.getBoundingClientRect().height }))
        .filter(({ h }) => h < 47.5)
        .map(({ e, h }) => `${e.textContent?.trim().slice(0, 40)} ${Math.round(h)}px`);
      const petitsTextes = [
        ...document.querySelectorAll(
          '.connect-panel p, .connect-panel h3, .ravelry-connection-state, .ravelry-connection-message, .project-item a',
        ),
      ]
        .filter(visible)
        .map((e) => ({ e, px: parseFloat(getComputedStyle(e).fontSize) }))
        .filter(({ px }) => px < 16)
        .map(({ e, px }) => `${e.textContent?.trim().slice(0, 40)} ${px}px`);
      return { petitesCommandes, petitsTextes };
    });
    expect(trop, nom).toEqual({ petitesCommandes: [], petitsTextes: [] });
  }
});
