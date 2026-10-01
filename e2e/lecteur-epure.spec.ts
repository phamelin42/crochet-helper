import { expect, test } from '@playwright/test';
import { pageComplete } from './page-complete';

/**
 * Retours de Phil du 30 septembre sur mobile : un lecteur qui ne dit chaque
 * chose qu'une fois. Chaque test ici garde un de ces retours.
 */
test.use({ viewport: { width: 390, height: 844 } });

// Page complète : le mode page pleine (fiche 38) est couvert par
// `page-pleine.spec.ts`, sauf pour la garde des boutons, jouée dans les deux.
test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.includes('page pleine')) await pageComplete(page);
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
});

test('en-tête : la navigation tient sur une seule ligne', async ({ page }) => {
  const links = page.locator('.nav-links a');
  const tops = await links.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(1);
  // Marque, boutons et navigation : deux lignes en tout, pas quatre.
  expect((await page.locator('.nav').boundingBox())!.height).toBeLessThan(160);
});

test('le compteur de répétitions est toujours là, sur la ligne de l’avancement', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  const reps = page.locator('.reps-tile');
  // « Round 1: in magic ring, 6 sc (6) » : aucune répétition annoncée, le
  // compteur reste là, sans total.
  await expect(page.locator('.step-body')).toContainText('in magic ring');
  await expect(reps).toBeVisible();
  await expect(reps).not.toContainText('/');

  // Même ligne que « Progress », même sur téléphone.
  const a = (await reps.boundingBox())!;
  const b = (await page.locator('.done-tile').boundingBox())!;
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);

  const next = page.getByRole('button', { name: 'Next', exact: true });
  await next.click();
  await next.click();
  // « Round 3: [sc, inc] x 6 (18) » : six répétitions à compter.
  await expect(page.locator('.step-body')).toContainText('[sc, inc] x 6');
  await expect(reps).toContainText('/ 6');
});

test('la position n’est dite qu’une fois, sans badge de rang ni de pièce', async ({ page }) => {
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(page.locator('.stepcount')).toHaveText(/^\s*Step 1 \/ \d+\s*$/);
  await expect(page.getByRole('button', { name: /Spell out/ })).toHaveCount(0);
  await expect(page.getByText('All steps')).toHaveCount(0);
});

test('un seul bouton de partage, et « Lien copié » s’efface de lui-même', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await pageComplete(context);
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Example', exact: true }).click();

  await expect(page.getByRole('button', { name: /Send this project/ })).toHaveCount(0);
  const share = page.getByRole('button', { name: 'Share this pattern', exact: true });
  await expect
    .poll(async () => {
      await share.click();
      return page.evaluate(() => navigator.clipboard.readText());
    })
    .toContain('#p=');
  await expect(page.getByText('Link copied to clipboard.')).toBeVisible();
  await expect(page.getByText('Link copied to clipboard.')).toHaveCount(0, { timeout: 6000 });
  await context.close();
});

/**
 * Taille du texte et pièces sur la même ligne dès qu'il y a la place
 * (demande de Phil). Sur un téléphone, les pièces de l'exemple demandent
 * 391 px avec la taille du texte pour 358 disponibles : elles passent alors
 * sur leur propre ligne, entières, plutôt que coupées en plein mot (garde de
 * `e2e/telephone-premier-ecran.spec.ts`).
 */
test('taille du texte et pièces sur la même ligne quand elles y tiennent', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  const pieces = await page.locator('.pieces').boundingBox();
  const size = await page.locator('.reader-tools .text-size').boundingBox();
  // Même ligne : leurs boîtes se chevauchent verticalement.
  expect(Math.abs(pieces!.y + pieces!.height / 2 - (size!.y + size!.height / 2))).toBeLessThan(8);
});

/**
 * « Précédent » et « Suivant » au même endroit à chaque étape de l'exemple,
 * pour chaque taille de texte et sur téléphone comme sur tablette : l'étape
 * et sa barre réservent leur hauteur, l'espace libre va sous la barre, et ce
 * qui varie (notes, astuce, photos) vient après.
 */
for (const viewport of [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
]) {
  // Page pleine : le sélecteur de taille y est masqué, la taille de base seule.
  for (const size of ['A', 'A+', 'A++', 'page pleine']) {
    test(`${viewport.width} px, ${size === 'page pleine' ? size : `taille ${size}`} : les boutons ne bougent pas d’une étape à l’autre`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.getByRole('button', { name: 'Example', exact: true }).click();
      if (size !== 'page pleine') await page.getByText(size, { exact: true }).click();
      const next = page.getByRole('button', { name: 'Next', exact: true });
      // Rien n'est lu avant que l'interface ne l'affiche : ni « Suivant »
      // actif juste après « Example », ni la nouvelle étape juste après un
      // clic. Sans ces attentes, un runner chargé voyait « Suivant » inactif
      // (zéro tour) ou l'ancienne étape (fin de boucle prématurée) : PR #87.
      await expect(next).toBeEnabled();
      const where = async () =>
        `${await page.locator('.stepmeta').innerText()}|${await page.locator('.step-body').innerText()}`;
      const positions = new Set<number>();
      let visited = 0;
      for (let i = 0; i < 20; i++) {
        const { navTop, gap } = await page.evaluate(() => {
          const text = document.createRange();
          text.selectNodeContents(document.querySelector('.step-body')!);
          const bar = document.querySelector('.step-progress')!.getBoundingClientRect();
          return {
            navTop: Math.round(
              document.querySelector('.navrow')!.getBoundingClientRect().top + scrollY,
            ),
            gap: bar.top - text.getBoundingClientRect().bottom,
          };
        });
        positions.add(navTop);
        visited++;
        // La barre de progression suit le texte, sans ligne vide entre eux.
        expect(gap).toBeLessThan(24);
        const before = await where();
        await next.click();
        // Dernière étape : « Suivant » reste actif mais l'étape ne change plus.
        try {
          await expect.poll(where, { timeout: 1500 }).not.toBe(before);
        } catch {
          break;
        }
      }
      // L'exemple compte 13 étapes (trois pièces) : la garde les a toutes vues.
      expect(visited).toBe(13);
      expect([...positions]).toHaveLength(1);
    });
  }
}
