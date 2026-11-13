import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';

/**
 * Fiche 60 : l'écran « Patron terminé », la photo de l'ouvrage gardée sur
 * l'appareil, le partage et les événements. Mouvement réduit : l'audit de
 * contraste lit des couleurs définitives (voir `a11y.spec.ts`).
 */
test.use({ reducedMotion: 'reduce' });

const LANGUES = {
  en: {
    chemin: '/',
    exemple: 'See an example',
    suivante: 'Next',
    titre: 'Well done, your project is finished!',
    ajouter: 'Add a photo of my piece',
    changer: 'Change the photo',
    retirer: 'Remove the photo',
    partager: 'Share',
    copier: 'Copy the message',
    enregistrer: 'Save the photo',
    recommencer: 'Start this pattern over',
    confirmerRecommencer: 'Start over',
    projets: 'My projects',
    revoir: 'Review the last step',
    termine: 'Finished',
    remplacer: 'Choose another photo',
  },
  fr: {
    chemin: '/fr',
    exemple: 'Voir un exemple',
    suivante: 'Suivante',
    titre: 'Bravo, votre ouvrage est terminé !',
    ajouter: 'Ajouter une photo de mon ouvrage',
    changer: 'Changer la photo',
    retirer: 'Retirer la photo',
    partager: 'Partager',
    copier: 'Copier le message',
    enregistrer: 'Enregistrer la photo',
    recommencer: 'Recommencer ce patron',
    confirmerRecommencer: 'Recommencer',
    projets: 'Mes projets',
    revoir: 'Revoir la dernière étape',
    termine: 'Terminé',
    remplacer: 'Choisir une autre photo',
  },
} as const;
type Langue = keyof typeof LANGUES;

type Emis = [string, Record<string, string | number> | undefined];

declare global {
  interface Window {
    __evenements: Emis[];
    __partages: { text?: string; url?: string; files: number }[];
    __copie: string[];
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

/** Web Share remplacé par un faux qui note ce qu'on lui envoie. */
async function fauxPartageNatif(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__partages = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: { text?: string; url?: string; files?: File[] }) => {
        window.__partages.push({ text: data.text, url: data.url, files: data.files?.length ?? 0 });
      },
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (data: { files?: File[] }) => !!data.files,
    });
  });
}

/** Navigateur sans Web Share (la plupart des ordinateurs de bureau) : presse-papiers espionné. */
async function sansPartageNatif(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__copie = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void window.__copie.push(text) },
    });
  });
}

/** Les événements d'un nom donné, accumulés jusqu'à obtenir ceux qu'on attend (voir `attendreNoms`). */
async function attendre(page: Page, attendus: string[]): Promise<Emis[]> {
  const cumul: Emis[] = [];
  await expect
    .poll(async () => {
      cumul.push(...(await page.evaluate(() => window.__evenements.splice(0))));
      return attendus.filter((nom) => cumul.some(([n]) => n === nom));
    })
    .toEqual(attendus);
  return cumul;
}

async function ouvrir(page: Page, chemin: string): Promise<void> {
  await page.goto(chemin);
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
}

/** Ouvre l'exemple et coche chaque étape jusqu'à l'écran de fin. */
async function terminerExemple(page: Page, langue: Langue): Promise<void> {
  const l = LANGUES[langue];
  await ouvrir(page, l.chemin);
  await page.getByRole('button', { name: l.exemple, exact: true }).click();
  const suivante = page.getByRole('button', { name: l.suivante, exact: true });
  await expect(suivante).toBeEnabled();
  const titre = page.getByRole('heading', { name: l.titre });
  // « Suivante » disparaît (ou se grise) à la dernière coche : un clic qui arrive après n'a plus de cible.
  for (let i = 0; i < 120 && !(await titre.isVisible()); i++) {
    await suivante.click({ timeout: 1500 }).catch(() => undefined);
  }
  await expect(page.getByRole('heading', { name: l.titre })).toBeVisible();
}

/** Une vraie image, fabriquée dans la page : aucun fichier à versionner. */
async function image(page: Page, largeur = 2400, hauteur = 1800): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ([w, h]) => {
      const canvas = new OffscreenCanvas(w, h);
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#d98ba8';
      context.fillRect(0, 0, w, h);
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(w / 2, h / 2, h / 4, 0, Math.PI * 2);
      context.fill();
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const octets = new Uint8Array(await blob.arrayBuffer());
      let texte = '';
      for (const octet of octets) texte += String.fromCharCode(octet);
      return btoa(texte);
    },
    [largeur, hauteur],
  );
  return Buffer.from(base64, 'base64');
}

async function choisirPhoto(
  page: Page,
  buffer: Buffer,
  name = 'ouvrage.png',
  mimeType = 'image/png',
) {
  await page
    .locator('input[type=file][accept="image/*"]')
    .setInputFiles({ name, mimeType, buffer });
}

async function assombrir(page: Page): Promise<void> {
  await page.evaluate(() => document.documentElement.setAttribute('data-dim', 'true'));
  await expect(page.locator('html[data-dim="true"]')).toBeAttached();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState === 'finished'),
  );
}

async function violations(page: Page): Promise<unknown[]> {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return resultat.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(({ id, help, nodes }) => ({ id, help, cibles: nodes.map((n) => n.target) }));
}

for (const langue of ['en', 'fr'] as const) {
  const l = LANGUES[langue];

  test.describe(`en ${langue}`, () => {
    test('finir l’exemple affiche l’écran de fin, focus sur le titre, toutes les actions visibles', async ({
      page,
    }) => {
      await fauxPartageNatif(page);
      await terminerExemple(page, langue);

      await expect(page.locator('.celebration-title')).toBeFocused();
      for (const nom of [l.ajouter, l.partager, l.recommencer, l.projets, l.revoir]) {
        const commande = page.getByRole(nom === l.projets ? 'link' : 'button', {
          name: nom,
          exact: true,
        });
        await expect(commande, nom).toBeVisible();
        // Toute commande fait 48 px (fiche 59).
        expect((await commande.boundingBox())!.height, nom).toBeGreaterThanOrEqual(47.5);
      }
      await expect(page.locator('.celebration .finish-art')).toBeVisible();
    });

    test('photo : ajoutée, gardée après rechargement, visible dans « Mes projets », puis retirée', async ({
      page,
    }) => {
      await terminerExemple(page, langue);
      await choisirPhoto(page, await image(page));

      const photo = page.locator('.finish-photo img');
      await expect(photo).toBeVisible();
      await expect(photo).toHaveAttribute('alt', /\S/);
      await expect(page.getByRole('button', { name: l.changer, exact: true })).toBeVisible();
      // Réduite avant stockage : l'image affichée ne dépasse pas 1 600 px.
      expect(
        await photo.evaluate((img: HTMLImageElement) =>
          Math.max(img.naturalWidth, img.naturalHeight),
        ),
      ).toBe(1600);

      await page.reload();
      await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
      await expect(page.getByRole('heading', { name: l.titre })).toBeVisible();
      await expect(page.locator('.finish-photo img')).toBeVisible();

      await page.getByRole('link', { name: l.projets, exact: true }).click();
      const carte = page.locator('li.card').first();
      await expect(carte.locator('.tag')).toHaveText(l.termine);
      await expect(carte.locator('img.project-thumb')).toBeVisible();

      await page.goBack();
      await page.getByRole('button', { name: l.retirer, exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: l.retirer, exact: true }).click();
      await expect(page.locator('.finish-photo')).toHaveCount(0);
      await expect(page.getByRole('button', { name: l.ajouter, exact: true })).toBeVisible();
    });

    test('remplacer la photo demande confirmation', async ({ page }) => {
      await terminerExemple(page, langue);
      await choisirPhoto(page, await image(page, 600, 400));
      await expect(page.locator('.finish-photo img')).toBeVisible();

      await page.getByRole('button', { name: l.changer, exact: true }).click();

      await expect(
        page.getByRole('dialog').getByRole('button', { name: l.remplacer }),
      ).toBeVisible();
    });

    test('un fichier qui n’est pas une image, ou trop gros, est refusé avec un message', async ({
      page,
    }) => {
      await terminerExemple(page, langue);

      await choisirPhoto(page, Buffer.from('pas une image'), 'notes.txt', 'text/plain');
      await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toBeVisible();
      await expect(page.locator('.finish-photo')).toHaveCount(0);

      await choisirPhoto(page, Buffer.alloc(26 * 1024 * 1024), 'enorme.jpg', 'image/jpeg');
      await expect(page.getByRole('alert').filter({ hasText: /25/ })).toBeVisible();
      await expect(page.locator('.finish-photo')).toHaveCount(0);
    });

    test('« Recommencer » demande confirmation puis repart de la première étape', async ({
      page,
    }) => {
      await terminerExemple(page, langue);

      await page.getByRole('button', { name: l.recommencer, exact: true }).click();
      await page.getByRole('button', { name: l.confirmerRecommencer, exact: true }).click();

      await expect(page.locator('.celebration')).toHaveCount(0);
      await expect(page.locator('.step-body')).toBeVisible();
      await expect(page.locator('.stepcount')).toContainText('1');
      // Et ce n'est plus un projet terminé.
      await page.reload();
      await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
      await expect(page.locator('.celebration')).toHaveCount(0);
    });

    test('« Revoir la dernière étape » revient au lecteur sans rien décocher', async ({ page }) => {
      await terminerExemple(page, langue);

      await page.getByRole('button', { name: l.revoir, exact: true }).click();

      await expect(page.locator('.celebration')).toHaveCount(0);
      await expect(page.locator('.step-body')).toBeVisible();
      await expect(page.getByRole('button', { name: l.suivante, exact: true })).toBeDisabled();
    });
  });
}

test.describe('partage', () => {
  test('Web Share : le message et la photo partent au système, le canal est mesuré', async ({
    page,
  }) => {
    await espionner(page);
    await fauxPartageNatif(page);
    await terminerExemple(page, 'en');
    await choisirPhoto(page, await image(page, 600, 400));
    await expect(page.locator('.finish-photo img')).toBeVisible();

    await page.getByRole('button', { name: 'Share', exact: true }).click();

    await expect.poll(() => page.evaluate(() => window.__partages.length)).toBe(1);
    const [partage] = await page.evaluate(() => window.__partages);
    expect(partage.text).toContain('I finished');
    expect(partage.text).toContain('Pattern Reader');
    expect(partage.files).toBe(1);
    const evenements = await attendre(page, [
      'pattern_finished',
      'finished_photo_added',
      'finished_shared',
    ]);
    expect(evenements.find(([n]) => n === 'finished_shared')![1]).toEqual({ canal: 'natif' });
  });

  test('Web Share sans photo : texte et lien du site', async ({ page }) => {
    await fauxPartageNatif(page);
    await terminerExemple(page, 'fr');

    await page.getByRole('button', { name: 'Partager', exact: true }).click();

    await expect.poll(() => page.evaluate(() => window.__partages.length)).toBe(1);
    const [partage] = await page.evaluate(() => window.__partages);
    expect(partage.text).toContain('J’ai terminé');
    expect(partage.url).toMatch(/\/fr$/);
    expect(partage.files).toBe(0);
  });

  test('sans Web Share : « Copier le message » et « Enregistrer la photo » prennent la place', async ({
    page,
  }) => {
    await espionner(page);
    await sansPartageNatif(page);
    await terminerExemple(page, 'fr');
    await expect(page.getByRole('button', { name: 'Partager', exact: true })).toHaveCount(0);
    // Sans photo, rien à enregistrer.
    await expect(
      page.getByRole('button', { name: 'Enregistrer la photo', exact: true }),
    ).toHaveCount(0);
    await choisirPhoto(page, await image(page, 600, 400));
    await expect(page.locator('.finish-photo img')).toBeVisible();

    await page.getByRole('button', { name: 'Copier le message', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Message copié.' })).toBeVisible();
    expect((await page.evaluate(() => window.__copie))[0]).toContain('J’ai terminé');

    const telechargement = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Enregistrer la photo', exact: true }).click();
    expect((await telechargement).suggestedFilename()).toMatch(/\.jpg$/);

    const evenements = await attendre(page, ['finished_shared']);
    const canaux = evenements.filter(([n]) => n === 'finished_shared').map(([, p]) => p?.['canal']);
    expect(canaux).toEqual(expect.arrayContaining(['copie']));
  });

  test('une annulation du partage n’affiche aucune erreur', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => {
          throw new DOMException('annulé', 'AbortError');
        },
      });
    });
    await terminerExemple(page, 'en');

    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
  });
});

test.describe('mesure', () => {
  test('la fin ne part qu’une fois, sans nom ni contenu', async ({ page }) => {
    await espionner(page);
    await terminerExemple(page, 'fr');

    const evenements = await attendre(page, ['pattern_finished']);
    const finis = evenements.filter(([n]) => n === 'pattern_finished');
    expect(finis).toHaveLength(1);
    expect(Object.keys(finis[0][1] ?? {})).toEqual(['steps']);
    expect(JSON.stringify(evenements)).not.toContain('Petit sapin');
  });
});

test.describe('mise en page', () => {
  for (const vue of [
    { width: 390, height: 844 },
    { width: 820, height: 1180 },
  ]) {
    test(`${vue.width} × ${vue.height} : pas de défilement horizontal, avec et sans photo`, async ({
      page,
    }) => {
      await page.setViewportSize(vue);
      await terminerExemple(page, 'fr');
      const debordement = () =>
        page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(await debordement()).toBeLessThanOrEqual(0);

      await choisirPhoto(page, await image(page, 900, 1600));
      await expect(page.locator('.finish-photo img')).toBeVisible();
      expect(await debordement()).toBeLessThanOrEqual(0);
    });
  }

  test('en page complète comme en page pleine, l’écran de fin est là', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('fil.focus', 'false'));
    await terminerExemple(page, 'en');

    await expect(page.locator('html[data-focus]')).toHaveCount(0);
    await expect(page.locator('.celebration')).toBeVisible();
  });
});

test.describe('accessibilité', () => {
  for (const dim of [false, true]) {
    for (const avecPhoto of [false, true]) {
      test(`axe : thème ${dim ? 'sombre' : 'clair'}, ${avecPhoto ? 'avec' : 'sans'} photo`, async ({
        page,
      }) => {
        await terminerExemple(page, 'en');
        if (avecPhoto) {
          await choisirPhoto(page, await image(page, 600, 400));
          await expect(page.locator('.finish-photo img')).toBeVisible();
        }
        if (dim) await assombrir(page);

        expect(await violations(page)).toEqual([]);
      });
    }
  }

  test('axe : « Mes projets » avec un projet terminé et sa photo', async ({ page }) => {
    await terminerExemple(page, 'en');
    await choisirPhoto(page, await image(page, 600, 400));
    await expect(page.locator('.finish-photo img')).toBeVisible();
    await page.getByRole('link', { name: 'My projects', exact: true }).click();
    await expect(page.locator('li.card img.project-thumb')).toBeVisible();

    expect(await violations(page)).toEqual([]);
    await assombrir(page);
    expect(await violations(page)).toEqual([]);
  });
});
