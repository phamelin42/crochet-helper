import { expect, test } from '@playwright/test';
import { WORKER } from './ravelry-simule';

/**
 * L'interrupteur de la recherche Ravelry (ADR-004) est éteint dans le build
 * livré : aucun lien vers la recherche ni vers les favoris, nulle part, et
 * l'adresse directe dit « bientôt disponible » sans rien demander au Worker.
 */
const CHEMINS = ['/find-a-pattern', '/my-favorites', '/fr/trouver-un-patron', '/fr/mes-favoris'];
const PAGES = ['/', '/fr', '/my-projects', '/glossary', '/settings', '/privacy', '/fr/reglages'];

test('aucun lien vers la recherche ni les favoris : en-tête, pied de page, pages', async ({
  page,
}) => {
  for (const chemin of PAGES) {
    await page.goto(chemin);
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((liens) => liens.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
    for (const interdit of CHEMINS) {
      expect(hrefs, `${chemin} ne doit pas lier ${interdit}`).not.toContain(interdit);
    }
  }
});

test('le HTML pré-rendu ne lie ni la recherche ni les favoris', async ({ request }) => {
  for (const chemin of ['/', '/fr', '/my-projects', '/glossary']) {
    const html = await (await request.get(chemin)).text();
    for (const interdit of CHEMINS) {
      expect(html, `${chemin} ne doit pas citer ${interdit}`).not.toContain(`href="${interdit}`);
    }
  }
});

test('l’écran de fin ne propose pas de chercher un autre patron', async ({ page }) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  const suivante = page.getByRole('button', { name: 'Next', exact: true });
  await expect(suivante).toBeEnabled();
  const titre = page.locator('.celebration-title');
  for (let i = 0; i < 120 && !(await titre.isVisible()); i++) {
    await suivante.click({ timeout: 1500 }).catch(() => undefined);
  }
  await expect(titre).toBeVisible();
  await expect(page.getByRole('link', { name: /Find another pattern/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'My projects', exact: true })).toBeVisible();
});

test('mode appli : aucun onglet vers la recherche', async ({ page }) => {
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  const tout = await page
    .locator('a[href]')
    .evaluateAll((l) => l.map((a) => (a as HTMLAnchorElement).pathname));
  expect(tout).not.toContain('/find-a-pattern');
});

for (const chemin of CHEMINS) {
  test(`${chemin} : « bientôt disponible », aucun appel au Worker`, async ({ page }) => {
    const appels: string[] = [];
    await page.route(`${WORKER}/**`, (route) => {
      appels.push(route.request().url());
      return route.abort();
    });
    await page.goto(`${chemin}?q=christmas+tree&craft=crochet`);
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    const fr = chemin.startsWith('/fr');
    await expect(
      page.getByText(fr ? 'Cette page arrive bientôt' : 'This page is coming soon'),
    ).toBeVisible();
    await expect(page.getByRole('search')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    expect(appels).toEqual([]);
  });
}

test('la page de retour de Ravelry existe mais n’appelle rien : ni le Worker, ni Ravelry', async ({
  page,
}) => {
  const appels: string[] = [];
  await page.route(`${WORKER}/**`, (route) => {
    appels.push(route.request().url());
    return route.abort();
  });
  await page.route('https://auth.ravelry.com/**', (route) => {
    appels.push(route.request().url());
    return route.abort();
  });
  // Un faux retour : l'interrupteur éteint ne vérifie ni n'échange rien.
  await page.goto('/ravelry-callback?code=code-secret&state=state-secret');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(page.getByRole('alert')).toContainText('Connecting to Ravelry is not available');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  // L'adresse est nettoyée, rien n'est gardé.
  await expect(page).toHaveURL(/\/ravelry-callback$/);
  expect(appels).toEqual([]);
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
  ).not.toContain('secret');
});

test('le HTML pré-rendu de la page de retour : texte d’attente, noindex, hors du sitemap', async ({
  request,
}) => {
  const html = await (await request.get('/ravelry-callback')).text();
  expect(html).toContain('Connexion à Ravelry en cours');
  expect(html).toMatch(/<meta name="robots" content="[^"]*noindex/);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).not.toContain('ravelry-callback');
});

test('aucun lien ne mène à la page de retour', async ({ page }) => {
  for (const chemin of PAGES) {
    await page.goto(chemin);
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((liens) => liens.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
    expect(hrefs).not.toContain('/ravelry-callback');
  }
});

test('les réglages ne montrent pas de section Ravelry', async ({ page }) => {
  for (const [chemin, titre] of [
    ['/settings', 'Ravelry'],
    ['/fr/reglages', 'Ravelry'],
  ]) {
    await page.goto(chemin);
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await expect(page.getByRole('heading', { name: titre, exact: true })).toHaveCount(0);
  }
});
