import { type Page, expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Titres (audit front, C-2) : un seul `<h1>` sur l'accueil comme dans le
 * lecteur chargé (le titre du patron, masqué visuellement), et aucun saut de
 * niveau (les `<h6>` des tuiles passaient de `h1` à `h6`).
 */

async function niveaux(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])),
  );
}

function sansSaut(levels: number[]): void {
  expect(levels[0], `titres ${levels.join(' ')}`).toBe(1);
  levels.forEach((level, i) => {
    if (i > 0) expect(level, `titres ${levels.join(' ')}`).toBeLessThanOrEqual(levels[i - 1] + 1);
  });
}

for (const [langue, chemin, exemple] of [
  ['EN', '/', 'Example'],
  ['FR', '/fr', 'Exemple'],
] as const) {
  for (const mode of ['page pleine', 'page complète']) {
    test(`${langue}, ${mode} : un seul h1 et des titres sans saut, avant et après le chargement`, async ({
      page,
    }) => {
      if (mode === 'page complète') await pageComplete(page);
      await page.goto(chemin);
      await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
      expect(await page.locator('h1').count()).toBe(1);
      sansSaut(await niveaux(page));

      await page.getByRole('button', { name: exemple, exact: true }).click();
      await expect(page.locator('.step-body')).toBeVisible();

      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).not.toBeEmpty();
      sansSaut(await niveaux(page));
    });
  }
}
