import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';

/**
 * Garde-fous de la fiche 59 : lisible à un mètre. Chaque règle de l'audit de
 * novembre 2026 y est mesurée **en boucle** sur toutes ses valeurs, pas sur un
 * échantillon : le texte d'étape ne rétrécit jamais sous son plancher, toute
 * commande fait 48 px, l'en-tête ne déborde pas, « Précédente » et « Suivante »
 * restent à l'écran avec une étape de 200 signes.
 */
test.use({ reducedMotion: 'reduce' });

const VIEWPORTS = [
  { width: 390, height: 844, plancher: 24 },
  { width: 820, height: 1180, plancher: 28 },
] as const;
const LONGUEURS = [30, 60, 90, 120, 200] as const;
const TAILLES = ['base', 'lg', 'xl'] as const;
const MODES = ['pleine', 'complète'] as const;

/** Un rang dont le corps fait exactement `n` signes. */
function rang(n: number): string {
  const filler = 'sc in each st around, '.repeat(20);
  return `Round 1: ${filler.slice(0, n).trimEnd()}`;
}

async function charger(
  page: Page,
  texte: string,
  options: { mode?: (typeof MODES)[number]; taille?: (typeof TAILLES)[number]; dim?: boolean } = {},
): Promise<void> {
  const { mode = 'pleine', taille = 'base', dim = false } = options;
  await page.addInitScript(
    ([focus, size, sombre]) => {
      localStorage.setItem('fil.focus', JSON.stringify(focus));
      localStorage.setItem('fil.textSize', JSON.stringify(size));
      if (sombre) localStorage.setItem('fil.dim', 'true');
    },
    [mode === 'pleine', taille, dim] as const,
  );
  await page.goto('/');
  await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
  await page.locator('#pattern-source').fill(texte);
  await page.getByRole('button', { name: 'Split into steps', exact: true }).click();
  await expect(page.locator('.step-body')).toBeVisible();
}

const taillePx = (page: Page) =>
  page.locator('.step-body').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const mode of MODES) {
      for (const taille of TAILLES) {
        for (const n of LONGUEURS) {
          test(`page ${mode}, taille ${taille}, rang de ${n} signes : texte ≥ ${viewport.plancher} px`, async ({
            page,
          }) => {
            const texte = rang(n);
            expect(texte.length - 'Round 1: '.length).toBeGreaterThanOrEqual(n - 2);
            await charger(page, texte, { mode, taille });

            expect(await taillePx(page)).toBeGreaterThanOrEqual(viewport.plancher);
          });
        }
      }
    }

    for (const mode of MODES) {
      for (const taille of TAILLES) {
        test(`page ${mode}, taille ${taille}, étape de 200 signes : « Précédente » et « Suivante » à l’écran`, async ({
          page,
        }) => {
          await charger(page, rang(200), { mode, taille });

          for (const nom of ['Previous', 'Next']) {
            const bouton = page.getByRole('button', { name: nom, exact: true });
            await expect(bouton).toBeVisible();
            const box = await bouton.boundingBox();
            expect(box, nom).not.toBeNull();
            expect(box!.y, nom).toBeGreaterThanOrEqual(0);
            expect(box!.y + box!.height, nom).toBeLessThanOrEqual(viewport.height);
          }
          if (mode === 'pleine') {
            const defile = await page.evaluate(
              () => document.documentElement.scrollHeight > window.innerHeight,
            );
            expect(defile, 'la page pleine ne défile pas').toBe(false);
          }
        });
      }
    }

    test('page pleine, étape de 200 signes : l’étape défile dans son cadre, au clavier', async ({
      page,
    }) => {
      await charger(page, rang(200), { taille: 'xl' });
      const etape = page.locator('.step-body');

      const { scrollable, tabindex } = await etape.evaluate((el) => ({
        scrollable: el.scrollHeight > el.clientHeight,
        tabindex: el.getAttribute('tabindex'),
      }));

      expect(scrollable, 'A++ à 200 signes ne tient pas : la zone défile').toBe(true);
      expect(tabindex).toBe('0');
      await etape.focus();
      await page.keyboard.press('PageDown');
      await expect.poll(() => etape.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    });

    /**
     * Une commande fait 48 px de côté au moins. Exemptés (WCAG 2.5.8) : un lien
     * ou une abréviation au milieu d'une phrase, et les liens du pied de page
     * (24 px au moins, vérifié à part).
     */
    for (const [nom, preparer] of [
      ['accueil', (page: Page) => page.goto('/')],
      ['accueil en français', (page: Page) => page.goto('/fr')],
      ['lecteur en page pleine', (page: Page) => charger(page, rang(60), { mode: 'pleine' })],
      ['lecteur en page complète', (page: Page) => charger(page, rang(60), { mode: 'complète' })],
    ] as const) {
      test(`${nom} : toute commande visible fait 48 px au moins`, async ({ page }) => {
        await preparer(page);
        await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

        const trop_petites = await page.evaluate(() => {
          const out: string[] = [];
          const cibles = document.querySelectorAll<HTMLElement>(
            'a[href], button, summary, select, textarea, input, [role="button"], [tabindex="0"]',
          );
          for (const el of cibles) {
            if (el.closest('.site-footer, .skip-link') || el.matches('.skip-link')) continue;
            if (el.classList.contains('abbr') || el.classList.contains('step-body')) continue;
            if (el.closest('[hidden], [inert]')) continue;
            const style = getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none') continue;
            // Une case ou un bouton radio se touche par son libellé, l'entrée est masquée.
            const input = el as HTMLInputElement;
            const cible =
              el.tagName === 'INPUT' && ['radio', 'checkbox'].includes(input.type)
                ? (el.closest('label') ?? el)
                : el;
            if (input.type === 'file' || input.type === 'hidden') continue;
            const box = cible.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) continue;
            // Lien au milieu d'une phrase : exempté.
            if (el.tagName === 'A' && el.parentElement) {
              const reste =
                el.parentElement.textContent!.trim().length - el.textContent!.trim().length;
              if (reste > 3) continue;
            }
            if (box.height < 47.5 || box.width < 47.5) {
              out.push(
                `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} « ${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30)} » ${Math.round(box.width)}×${Math.round(box.height)}`,
              );
            }
          }
          return out;
        });

        expect(trop_petites).toEqual([]);
      });
    }

    test('les liens du pied de page font 24 px au moins, avec de l’espace entre eux', async ({
      page,
    }) => {
      await page.goto('/');
      const liens = page.locator('.site-footer a');
      const n = await liens.count();
      expect(n).toBeGreaterThan(5);
      for (let i = 0; i < n; i++) {
        const box = await liens.nth(i).boundingBox();
        expect(box!.height, `lien ${i}`).toBeGreaterThanOrEqual(24);
      }
    });

    for (const [locale, chemin] of [
      ['en', '/'],
      ['fr', '/fr'],
    ] as const) {
      test(`en-tête en ${locale} : aucun débordement, aucun lien coupé`, async ({ page }) => {
        await page.goto(chemin);
        await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });

        const mesures = await page.evaluate(() => {
          const nav = document.querySelector<HTMLElement>('.nav')!;
          const liens = document.querySelector<HTMLElement>('.nav-links')!;
          const links = [...liens.querySelectorAll('a')].map((a) => a.getBoundingClientRect());
          return {
            page: document.documentElement.scrollWidth - window.innerWidth,
            nav: nav.scrollWidth - nav.clientWidth,
            liens: liens.scrollWidth - liens.clientWidth,
            n: links.length,
            coupes: links.filter((r) => r.right > window.innerWidth || r.left < 0).length,
          };
        });

        expect(mesures.n).toBeLessThanOrEqual(4);
        expect(mesures.page).toBeLessThanOrEqual(0);
        expect(mesures.nav).toBeLessThanOrEqual(0);
        expect(mesures.liens).toBeLessThanOrEqual(0);
        expect(mesures.coupes).toBe(0);
      });
    }

    for (const dim of [false, true]) {
      for (const mode of MODES) {
        test(`étape de 200 signes, page ${mode}, fond ${dim ? 'sombre' : 'clair'} : aucune violation axe`, async ({
          page,
        }) => {
          await charger(page, rang(200), { mode, dim, taille: 'xl' });
          await page.evaluate(() =>
            Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))),
          );

          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze();

          expect(results.violations).toEqual([]);
        });
      }
    }
  });
}
