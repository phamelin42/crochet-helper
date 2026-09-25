import { type Page, expect, test } from '@playwright/test';
import { DEMO_PATTERN } from '../src/app/features/reader/data/demo-pattern';

/**
 * Les événements partent-ils vraiment des parcours réels ? `window.umami` est
 * remplacé par un espion avant le démarrage de l'application : on vérifie ce
 * que le site construit appelle, sans dépendre de visites ni du collecteur.
 * Un point d'instrumentation supprimé ou un nom d'événement changé fait
 * échouer ces tests.
 */

type Emis = [string, Record<string, string | number> | undefined];

declare global {
  interface Window {
    __evenements: Emis[];
  }
}

async function espionner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__evenements = [];
    Object.defineProperty(window, 'umami', {
      value: { track: (nom: string, props?: never) => window.__evenements.push([nom, props]) },
    });
  });
}

async function emis(page: Page): Promise<Emis[]> {
  return page.evaluate(() => window.__evenements.splice(0));
}

/** Avant l'hydratation, un clic est perdu : attendre que l'application soit prête. */
async function ouvrir(page: Page, chemin: string): Promise<void> {
  await page.goto(chemin);
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

function noms(liste: Emis[]): string[] {
  return liste.map(([nom]) => nom);
}

function props(liste: Emis[], nom: string): Record<string, string | number> {
  const trouve = liste.find(([n]) => n === nom);
  expect(trouve, `événement ${nom} émis`).toBeDefined();
  return trouve?.[1] ?? {};
}

let hotesContactes: string[] = [];

test.beforeEach(async ({ page }) => {
  hotesContactes = [];
  page.on('request', (req) => hotesContactes.push(new URL(req.url()).hostname));
  await espionner(page);
});

test.afterEach(() => {
  // Le collecteur ne doit jamais être contacté depuis un test : ce serait
  // compter la CI comme une visite (7 visites sur 10 le 23/09/2026).
  expect(hotesContactes).not.toContain('analytics.patternreader.com');
});

test('coller un patron, avancer de deux étapes, survoler une abréviation, revenir', async ({
  page,
}) => {
  await ouvrir(page, '/');
  await page.locator('#pattern-source').fill(DEMO_PATTERN);
  await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await expect(next).toBeEnabled();

  const collage = await emis(page);
  expect(noms(collage)).toEqual(['project_created', 'pattern_pasted', 'pattern_parsed']);
  const longueur = props(collage, 'pattern_pasted')['length'];
  expect(typeof longueur).toBe('number');
  expect(Number(longueur) % 100, 'longueur arrondie à la centaine').toBe(0);
  expect(Number(longueur)).toBeGreaterThan(0);
  const decoupage = props(collage, 'pattern_parsed');
  expect(decoupage).toEqual({
    steps: expect.any(Number),
    pieces: expect.any(Number),
    materials: expect.any(Number),
    origine: 'saisie',
  });
  expect(Number.isInteger(decoupage['steps']) && Number(decoupage['steps']) > 0).toBe(true);

  await next.click();
  await next.click();
  // À l'étape 3, la ligne de liste d'attente apparaît : elle le dit une fois.
  expect(noms(await emis(page))).toEqual(['step_advanced', 'step_advanced', 'waitlist_shown']);

  await page.locator('.abbr').first().hover();
  expect(noms(await emis(page))).toEqual(['glossary_hover']);

  // Revenir sur la page rouvre le projet : l'événement part au démarrage,
  // avant toute action — celui qu'une file d'attente absente perdait.
  await page.reload();
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await expect(next).toBeVisible();
  await expect.poll(async () => noms(await emis(page))).toContain('session_resumed');
});

test('avancer de cinq étapes émet reading_depth_5', async ({ page }) => {
  await ouvrir(page, '/');
  await page.locator('#pattern-source').fill(DEMO_PATTERN);
  await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await expect(next).toBeEnabled();
  await emis(page); // vide les événements du découpage

  for (let i = 0; i < 4; i++) await next.click();

  expect(noms(await emis(page))).toContain('reading_depth_5');
});

test('une visite le lendemain de la première émet returning_visit_1d', async ({ page }) => {
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);
  const hierCivil = [
    hier.getFullYear(),
    String(hier.getMonth() + 1).padStart(2, '0'),
    String(hier.getDate()).padStart(2, '0'),
  ].join('-');
  await page.addInitScript((date) => {
    localStorage.setItem('fil.firstVisit', JSON.stringify(date));
  }, hierCivil);

  await ouvrir(page, '/');

  await expect.poll(async () => noms(await emis(page))).toContain('returning_visit_1d');
});

test('lancer une conversion US → UK', async ({ page }) => {
  await ouvrir(page, '/us-uk-converter');
  await page.locator('#converter-input').fill('Row 2: ch 2, sc in each st across, turn (18)');
  await page.getByRole('button', { name: 'Convert', exact: true }).click();
  await expect(page.getByText('dc in each st across')).toBeVisible();

  expect(await emis(page)).toEqual([
    ['conversion_run', { from: 'US', to: 'UK', replacements: 1, hooks: 0 }],
  ]);
});
