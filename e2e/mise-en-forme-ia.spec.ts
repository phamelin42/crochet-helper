import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Mise en forme par IA (fiche 53, ADR-003). Tant que `AI_FORMAT_URL` est vide
 * (Worker pas encore déployé), la case est absente et rien ne part ; une fois
 * renseignée, les réponses du Worker sont simulées par `page.route`.
 */

const URL_WORKER = readFileSync('src/app/features/reader/data/ai-format.ts', 'utf8').match(
  /AI_FORMAT_URL\s*=\s*'([^']*)'/,
)?.[1];

const PATRON = ['Rang 1 : 6 ms dans un cercle magique (6)', 'Rang 2 : 1 aug dans chaque m (12)'];
const CASE = /Tidy up with AI/;

async function ouvrir(page: Page): Promise<void> {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

async function decouper(page: Page, cocher: boolean): Promise<void> {
  await page.locator('#pattern-source').fill(PATRON.join('\n'));
  if (cocher) {
    // `Checkbox` masque l'<input> natif : comme la lectrice, on clique l'étiquette.
    await page.locator('label.check', { hasText: CASE }).click();
    await expect(page.getByLabel(CASE)).toBeChecked();
  }
  await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
}

test.describe('Worker non renseigné', () => {
  test.skip(!!URL_WORKER, 'Le Worker est renseigné : voir les scénarios simulés.');

  test('la case est absente et le patron se découpe comme avant', async ({ page }) => {
    await ouvrir(page);
    await expect(page.getByLabel(CASE)).toHaveCount(0);
    await decouper(page, false);
    await expect(page.locator('.step-body')).toContainText('6 ms');
  });
});

test.describe('Worker renseigné', () => {
  test.skip(!URL_WORKER, 'AI_FORMAT_URL est vide : la case n’apparaît pas.');
  // Le service worker de l'application capte les requêtes avant `page.route` :
  // sans ce blocage, l'appel simulé partirait vraiment vers le Worker.
  test.use({ serviceWorkers: 'block' });

  test('case décochée : aucune requête vers le Worker', async ({ page }) => {
    const requetes: string[] = [];
    await page.route(URL_WORKER!, (route) => {
      requetes.push(route.request().url());
      return route.abort();
    });
    await ouvrir(page);
    await expect(page.getByLabel(CASE)).not.toBeChecked();
    await decouper(page, false);
    await expect(page.locator('.step-body')).toBeVisible();
    expect(requetes).toEqual([]);
  });

  test('réussite : le texte remis en forme est découpé, l’étape reste haute', async ({ page }) => {
    await page.route(URL_WORKER!, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ texte: PATRON.join('\n'), restant: 2 }),
      }),
    );
    await ouvrir(page);
    await decouper(page, true);
    await expect(page.locator('.step-body')).toContainText('6 ms');
    // Page pleine : l'étape seule à l'écran, le panneau d'import est masqué.
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'true');
    const boite = await page.locator('.step-body').boundingBox();
    expect(boite!.y).toBeLessThan(450);
    // Échap quitte la page pleine : la ligne et « revenir au texte d'origine » apparaissent.
    await page.keyboard.press('Escape');
    await expect(page.getByText('you have 2 left today')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go back to the original text' })).toBeVisible();
  });

  test('limite du jour : patron chargé, message de Phil, aucune violation axe', async ({
    page,
  }) => {
    await page.route(URL_WORKER!, (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ raison: 'quota-jour' }),
      }),
    );
    await ouvrir(page);
    await decouper(page, true);
    await expect(page.locator('.step-body')).toContainText('6 ms');
    await expect(page.getByText('You’ve used your 3 AI tidy-ups for today')).toBeVisible();
    await expect(page.getByText('Unfortunately, using AI isn’t free')).toBeVisible();
    // Le message est lisible : pas de page pleine tant qu'il n'a pas été lu.
    await expect(page.locator('html')).not.toHaveAttribute('data-focus');
    const rapport = await new AxeBuilder({ page }).include('.import-body').analyze();
    expect(rapport.violations).toEqual([]);
    // Elle passe à l'étape suivante : le message est lu, la page pleine reprend.
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-focus', 'true');
  });

  test('refus précis : « trop de texte supprimé », avec son code technique', async ({ page }) => {
    await page.route(URL_WORKER!, (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ raison: 'echec', detail: 'trop-court:25%' }),
      }),
    );
    await ouvrir(page);
    await decouper(page, true);
    await expect(page.locator('.step-body')).toContainText('6 ms');
    await expect(page.getByText('The AI removed too much text')).toBeVisible();
    await expect(page.getByText('Technical code: echec · trop-court:25%')).toBeVisible();
    const rapport = await new AxeBuilder({ page }).include('.import-body').analyze();
    expect(rapport.violations).toEqual([]);
  });

  test('Worker injoignable : le message le dit, code « reseau »', async ({ page }) => {
    await page.route(URL_WORKER!, (route) => route.abort('failed'));
    await ouvrir(page);
    await decouper(page, true);
    await expect(page.locator('.step-body')).toContainText('6 ms');
    await expect(page.getByText('The AI service couldn’t be reached')).toBeVisible();
    await expect(page.getByText('Technical code: reseau')).toBeVisible();
  });
});
