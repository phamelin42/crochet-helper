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
  await page.locator('#pattern-source').fill(PATRON.join(' '));
  if (cocher) await page.getByLabel(CASE).check();
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
    await expect(page.getByText('you have 2 left today')).toBeVisible();
    const boite = await page.locator('.step-body').boundingBox();
    expect(boite!.y).toBeLessThan(450);
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
    const rapport = await new AxeBuilder({ page }).include('.import-body').analyze();
    expect(rapport.violations).toEqual([]);
  });
});
