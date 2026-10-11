import { type Page, expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Correctifs issus d'une visite complète du site : chaque test reprend le
 * geste qui avait échoué, et vérifie ce que la lectrice doit obtenir.
 */

test.beforeEach(({ page }) => pageComplete(page));

async function ouvrir(page: Page, chemin = '/'): Promise<void> {
  await page.goto(chemin);
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

/** Le panneau du patron s'ouvre ou se replie selon le chemin pris : on l'ouvre s'il ne l'est pas. */
async function ouvrirPanneau(page: Page): Promise<void> {
  if (!(await page.locator('#pattern-source').isVisible())) {
    await page.locator('.import-host summary').click();
  }
  await expect(page.locator('#pattern-source')).toBeVisible();
}

async function coller(page: Page, patron: string): Promise<void> {
  await page.locator('#pattern-source').fill(patron);
  await page.getByRole('button', { name: 'Split into steps' }).click();
  await expect(page.locator('.step-body')).toBeVisible();
}

test.describe('panneau du patron', () => {
  test('« Split into steps » sur un champ vide le dit et laisse le panneau ouvert', async ({
    page,
  }) => {
    await ouvrir(page);
    await page.getByRole('button', { name: 'Split into steps' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Nothing to split yet' })).toBeVisible();
    await expect(page.locator('#pattern-source')).toBeVisible();
  });

  test('« Paste my pattern » rouvre le panneau replié et y met le focus', async ({ page }) => {
    await ouvrir(page);
    await page.locator('.import-host summary').click();
    await expect(page.locator('#pattern-source')).toBeHidden();

    await page.getByRole('button', { name: 'Paste my pattern' }).click();

    await expect(page.locator('#pattern-source')).toBeVisible();
    await expect(page.locator('#pattern-source')).toBeFocused();
  });

  test('« Clear » demande confirmation, et le patron reste dans « My projects »', async ({
    page,
  }) => {
    await ouvrir(page);
    await page.getByRole('button', { name: 'See an example' }).click();
    await expect(page.locator('.step-body')).toBeVisible();
    await ouvrirPanneau(page);

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Clear this pattern from the screen?');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.step-body')).toBeVisible();

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await page.getByRole('button', { name: 'Clear from the screen' }).click();
    await expect(page.locator('.step-body')).toHaveClass(/empty/);
  });

  test('« Example » deux fois ne fait qu’un projet', async ({ page }) => {
    await ouvrir(page);
    await page.getByRole('button', { name: 'See an example' }).click();
    await expect(page.locator('.step-body')).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await ouvrirPanneau(page);
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await page.getByRole('button', { name: 'Clear from the screen' }).click();

    await page.getByRole('button', { name: 'See an example' }).click();
    await expect(page.locator('.stepcount')).toContainText('Step 2');

    await ouvrir(page, '/my-projects');
    await expect(page.locator('.projects-list > li')).toHaveCount(1);
  });
});

test.describe('compteurs', () => {
  test('répétitions imbriquées : le compteur vise 3, pas 2', async ({ page }) => {
    await ouvrir(page);
    await coller(page, 'Round 1: [[sc, inc] x 2, dec] x 3 (24)');

    await expect(page.locator('.big.reps')).toContainText('/ 3');
  });

  test('le compteur s’arrête à l’objectif et le dit', async ({ page }) => {
    await ouvrir(page);
    await coller(page, 'Round 1: [sc, inc] x 3 (18)');
    const plus = page.getByRole('button', { name: '+', exact: true });

    for (let i = 0; i < 3; i++) await plus.click();

    await expect(page.locator('.big.reps')).toContainText('3 / 3');
    await expect(plus).toBeDisabled();
    await expect(page.getByText('Repeats complete')).toBeAttached();
  });

  test('sur la dernière étape, « Next » termine le patron puis se désactive', async ({ page }) => {
    await ouvrir(page);
    await coller(page, 'Round 1: 6 sc (6)\nRound 2: 12 sc (12)');
    const suivant = page.getByRole('button', { name: 'Next', exact: true });

    await suivant.click();
    await expect(page.getByText('Pattern finished')).toBeHidden();
    await suivant.click();

    await expect(page.getByText('Pattern finished, well done!')).toBeVisible();
    await expect(suivant).toBeDisabled();
    await expect(page.locator('.done-tile .big')).toContainText('2 / 2');
  });

  test('compteur de rangs : l’objectif atteint bloque « +1 »', async ({ page }) => {
    await ouvrir(page, '/row-counter');
    await page.getByLabel('Up to row').fill('3');
    const plus = page.getByRole('button', { name: '+1' });

    for (let i = 0; i < 3; i++) await plus.click();

    await expect(page.locator('.counter-count')).toContainText('3 / 3');
    await expect(plus).toBeDisabled();
    await expect(page.getByText('Target reached')).toBeVisible();
  });
});

test.describe('mise en page', () => {
  test('un nom de projet long et sans espace ne fait pas défiler la page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ouvrir(page);
    await coller(page, 'Round 1: 6 sc (6)');
    await ouvrir(page, '/my-projects');
    await page.getByRole('button', { name: 'Rename' }).click();
    await page.getByLabel('Project name').fill('x'.repeat(400));
    await page.getByRole('button', { name: 'Save' }).click();

    const { largeur, ecran } = await page.evaluate(() => ({
      largeur: document.documentElement.scrollWidth,
      ecran: document.documentElement.clientWidth,
    }));
    expect(largeur).toBeLessThanOrEqual(ecran);
    for (const nom of ['Resume', 'Rename', 'Delete']) {
      const box = await page.getByRole('button', { name: nom }).boundingBox();
      expect(box!.x + box!.width, nom).toBeLessThanOrEqual(ecran);
    }
  });

  for (const largeur of [1024, 600]) {
    test(`le titre d’une page de contenu ne passe pas sous la pelote (${largeur} px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      for (const chemin of ['/row-counter', '/glossary/aug']) {
        await ouvrir(page, chemin);
        const { titre, pelote } = await page.evaluate(() => {
          const hero = document.querySelector('.hero') as HTMLElement;
          const style = getComputedStyle(hero, '::before');
          const droite = hero.getBoundingClientRect().right;
          const titre = hero.querySelector('h1')!.getBoundingClientRect();
          // Texte le plus large du bandeau : titre et paragraphe.
          const texte = [...hero.children].map((e) => e.getBoundingClientRect().right);
          return {
            titre: Math.max(titre.right, ...texte),
            pelote: droite - parseFloat(style.right) - parseFloat(style.width),
          };
        });
        expect(titre, chemin).toBeLessThanOrEqual(pelote + 1);
      }
    });
  }

  test('A / A+ / A++ agrandit aussi la note et l’astuce', async ({ page }) => {
    await ouvrir(page);
    await coller(page, 'Round 1: 6 sc (6). Keep your yarn loose and relaxed throughout.');
    const astuce = page.locator('.step-tip');
    const taille = async () =>
      Number.parseFloat(await astuce.evaluate((e) => getComputedStyle(e).fontSize));
    const base = await taille();

    await page.getByText('A++', { exact: true }).click();

    expect(await taille()).toBeGreaterThan(base * 1.3);
  });

  test('l’infobulle d’une abréviation est centrée sur le mot', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await ouvrir(page);
    await coller(page, 'Round 1: 6 sc, 6 dec (6)');
    const tip = page.locator('.tip.on');

    // Une première infobulle, puis la seconde : la mesure de l'ancienne ne doit pas décaler la nouvelle.
    await page.locator('.abbr', { hasText: 'sc' }).first().hover();
    await expect(tip).toBeVisible();
    const mot = page.locator('.abbr', { hasText: 'dec' }).first();
    await mot.hover();
    await expect(tip).toContainText('dec');
    await page.waitForTimeout(250);

    const [m, t] = await Promise.all([mot.boundingBox(), tip.boundingBox()]);
    const centreMot = m!.x + m!.width / 2;
    const centreTip = t!.x + t!.width / 2;
    expect(Math.abs(centreTip - centreMot)).toBeLessThanOrEqual(2);
  });
});

test('une adresse inconnue dit « Page not found »', async ({ page }) => {
  await ouvrir(page, '/cette-page-n-existe-pas');

  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to the reader' })).toBeVisible();
  await expect(page.locator('.reader')).toHaveCount(0);
});

test('« Mes projets » : l’export le confirme, et « Import a backup » n’apparaît qu’une fois', async ({
  page,
}) => {
  await ouvrir(page);
  await coller(page, 'Round 1: 6 sc (6)');
  await ouvrir(page, '/my-projects');
  await expect(page.getByRole('button', { name: 'Import a backup' })).toHaveCount(1);
  await expect(page.getByLabel('Import a backup')).toHaveCount(0);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export a backup' }).click();
  await download;

  await expect(page.getByRole('status').filter({ hasText: 'Backup downloaded' })).toBeVisible();
});

test('la page des poids de fil a un titre bien espacé', async ({ page }) => {
  await ouvrir(page, '/yarn-weight-chart');

  await expect(page).toHaveTitle(/DK — \S/);
});

test('« Prepare a pattern » : les assistants cités sont des liens', async ({ page }) => {
  await ouvrir(page, '/format-your-pattern');

  for (const nom of ['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Le Chat (Mistral)']) {
    const lien = page.getByRole('listitem').getByRole('link', { name: nom });
    await expect(lien, nom).toHaveAttribute('href', /^https:\/\//);
  }
});

test('le glossaire distingue le magic loop (tricot) du magic ring (crochet)', async ({ page }) => {
  await ouvrir(page, '/glossary/magic-loop');

  await expect(page.locator('h1')).toContainText('magic loop');
  await expect(page.locator('main')).not.toContainText('adjustable');
  await expect(page.locator('main')).toContainText(/circular needle/i);
});

test('recherche de crochet : M, N-15 et 10.5 sont reconnus', async ({ page }) => {
  await ouvrir(page, '/crochet-hook-sizes');
  const champ = page.getByRole('textbox').first();
  const resultat = page.locator('.hook-result');

  for (const [saisie, attendu] of [
    ['M', '9 mm'],
    ['N-15', '10 mm'],
    ['10.5', '6.5 mm'],
    ['K-10.5', '6.5 mm'],
  ]) {
    await champ.fill(saisie);
    await expect(resultat, saisie).toContainText(attendu);
    await expect(resultat, saisie).not.toContainText('not in the standard');
  }
});

test.describe('plusieurs onglets', () => {
  async function etat(page: Page): Promise<{ etape: string; chrono: string }> {
    return {
      etape: ((await page.locator('.stepcount').textContent()) ?? '').replace(/\s+/g, ' ').trim(),
      chrono: ((await page.locator('.timer-tile .big').textContent()) ?? '').trim(),
    };
  }

  test('un onglet resté ouvert n’écrase pas la progression ni le chronomètre de l’autre', async ({
    context,
  }) => {
    await pageComplete(context);
    const a = await context.newPage();
    await ouvrir(a);
    await a.getByRole('button', { name: 'See an example' }).click();
    // « Suivant » lance le chronomètre de l'onglet A, qui réécrit son projet chaque seconde.
    await a.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(a.locator('.stepcount')).toContainText('Step 2');

    const b = await context.newPage();
    await ouvrir(b);
    await expect(b.locator('.stepcount')).toContainText('Step 2');
    for (let i = 0; i < 3; i++) await b.getByRole('button', { name: 'Next', exact: true }).click();
    await b.locator('.timer-tile').getByRole('button', { name: 'Reset' }).click();
    await b.waitForTimeout(2500);

    // L'onglet A suit : même étape, chronomètre remis à zéro et arrêté.
    await expect(a.locator('.stepcount')).toContainText('Step 5');
    await expect.poll(async () => (await etat(a)).chrono).toBe('0:00');

    await b.reload();
    await b.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await expect(b.locator('.stepcount')).toContainText('Step 5');
    expect((await etat(b)).chrono).toBe('0:00');
  });
});

test.describe('image en grille', () => {
  // Un PNG de 1 × 1 pixel : de quoi ouvrir la boîte de réglage.
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  test('une largeur invalide est ramenée à la valeur réellement utilisée', async ({ page }) => {
    await ouvrir(page);
    await page.locator('[data-testid="grid-open-file"]').setInputFiles({
      name: 'rouge.png',
      mimeType: 'image/png',
      buffer: PNG,
    });
    const champ = page.getByLabel('Width in stitches');
    await expect(champ).toBeVisible();

    await champ.fill('10');
    await champ.blur();
    for (const saisie of ['0', '-5', '']) {
      await champ.fill(saisie);
      await champ.blur();
      await expect(champ, `« ${saisie} »`).toHaveValue('10');
    }
  });
});
