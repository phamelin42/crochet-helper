import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

/**
 * Visuels de la fiche Play Store (fiche 41), tirés du build statique de `dist/` :
 *
 * - `docs/play-store/capture-{1..3}-*.png` — 1080 × 2160 (rapport 2:1, le plus
 *   haut qu'accepte Google) : page pleine, page complète, glossaire, avec le
 *   patron d'exemple du site ;
 * - `docs/play-store/presentation-{en,fr}.png` — image de présentation 1024 × 500 ;
 * - `docs/play-store/icone-512.png` — l'icône du manifeste ;
 * - `public/screenshots/*.png` — les mêmes captures en 540 × 1080, que le manifeste
 *   annonce pour l'invite d'installation enrichie.
 *
 * Hors de la chaîne de build et de la CI : à relancer après `npm run build:app`
 * (ou `npm run build`) quand l'écran du lecteur change, puis à committer.
 *
 *   PW_CHROMIUM=/chemin/vers/chromium node tools/store-assets.mjs
 */

const ROOT = resolve('.');
const PORT = 4321;
const BASE = `http://localhost:${PORT}`;
const DOCS = join(ROOT, 'docs', 'play-store');
const PUBLIC_SHOTS = join(ROOT, 'public', 'screenshots');
const url = (path) => pathToFileURL(join(ROOT, path)).href;

const SHOTS = [
  { name: 'page-pleine', label: '1-page-pleine' },
  { name: 'page-complete', label: '2-page-complete' },
  { name: 'glossaire', label: '3-glossaire' },
];

const PRESENTATION = {
  en: 'Your crochet & knitting pattern, one step at a time',
  fr: 'Votre patron de crochet et de tricot, une étape à la fois',
};

/** Les étapes qui mènent à chaque capture, dans l'ordre : chacune prolonge la précédente. */
async function prendre(page, nom, fichier) {
  if (nom === 'page-pleine') {
    // Le lecteur s'ouvre en page pleine (fiche 38). Deux étapes plus loin et
    // deux répétitions comptées : un ouvrage en cours, pas un écran vierge.
    // Horloge simulée : le chronomètre affiche une vraie séance, pas « 0:00 ».
    await page.clock.install();
    await page.goto(BASE + '/');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    await page.locator('.step-body').waitFor();
    const next = page.getByRole('button', { name: 'Next', exact: true });
    for (let i = 0; i < 2; i++) {
      const avant = await page.locator('.step-body').innerText();
      await next.click();
      await page.waitForFunction(
        (texte) => document.querySelector('.step-body')?.textContent?.trim() !== texte.trim(),
        avant,
      );
    }
    const plus = page.getByRole('button', { name: '+', exact: true });
    await plus.click();
    await plus.click();
    await page.clock.runFor('12:34');
  } else if (nom === 'page-complete') {
    // « Tools » rend la page complète : en-tête, réglages, partage.
    await page.getByRole('button', { name: 'Tools', exact: true }).click();
    await page.locator('html:not([data-focus])').waitFor({ state: 'attached' });
    await page.evaluate(() => window.scrollTo(0, 0));
  } else {
    await page.goto(BASE + '/glossary');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    // La liste elle-même, pas seulement l'introduction : on défile jusqu'aux filtres.
    await page
      .getByText('Filter abbreviations')
      .evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 16));
  }
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: fichier });
}

/** Téléphone courant (390 px de large), rapport 2:1 : 1080 × 2160 à l'échelle de la boutique. */
const LARGEUR = 390;

async function captures(browser, largeurPx, dossier, nomDe) {
  const context = await browser.newContext({
    viewport: { width: LARGEUR, height: LARGEUR * 2 },
    deviceScaleFactor: largeurPx / LARGEUR,
    isMobile: true,
    hasTouch: false,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  for (const shot of SHOTS) await prendre(page, shot.name, join(dossier, nomDe(shot)));
  await context.close();
}

function presentation(locale) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Karla; font-weight: 200 800;
      src: url(${url('node_modules/@fontsource-variable/karla/files/karla-latin-wght-normal.woff2')}); }
    @font-face { font-family: Zen; font-weight: 700;
      src: url(${url('node_modules/@fontsource/zen-maru-gothic/files/zen-maru-gothic-latin-700-normal.woff2')}); }
    * { box-sizing: border-box; margin: 0; }
    body { width: 1024px; height: 500px; background: #faf4ed; color: #514a62; font-family: Karla;
      display: flex; align-items: center; gap: 56px; padding: 0 72px; }
    img { width: 220px; height: 220px; border-radius: 48px; }
    h1 { font-family: Zen; font-size: 54px; line-height: 1.2; }
    p { margin-top: 20px; font-size: 28px; font-weight: 600; color: #d9789b; }
  </style></head><body>
    <img src="${url('public/icons/icon-512x512.png')}" alt="">
    <div><h1>${PRESENTATION[locale]}</h1>
    <p>${locale === 'fr' ? 'Gratuit · sans compte · hors ligne' : 'Free · no account · works offline'}</p></div>
  </body></html>`;
}

async function serveur() {
  const enfant = spawn('node', ['e2e/static-server.mjs', String(PORT)], { stdio: 'pipe' });
  await new Promise((ok, ko) => {
    enfant.stdout.on('data', ok);
    enfant.on('error', ko);
    enfant.on('exit', () => ko(new Error('serveur statique arrêté : lancer d’abord le build')));
  });
  return enfant;
}

mkdirSync(DOCS, { recursive: true });
mkdirSync(PUBLIC_SHOTS, { recursive: true });
const enfant = await serveur();
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
});
try {
  await captures(browser, 1080, DOCS, (s) => `capture-${s.label}.png`);
  await captures(browser, 540, PUBLIC_SHOTS, (s) => `${s.name}.png`);

  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  // Un fichier local, pas `setContent` : une page `about:blank` ne peut charger
  // ni les polices ni l'icône par `file://`.
  const tmp = mkdtempSync(join(tmpdir(), 'store-assets-'));
  for (const locale of ['en', 'fr']) {
    const fichier = join(tmp, `presentation-${locale}.html`);
    writeFileSync(fichier, presentation(locale));
    await page.goto(pathToFileURL(fichier).href);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(DOCS, `presentation-${locale}.png`) });
  }
  copyFileSync(join(ROOT, 'public/icons/icon-512x512.png'), join(DOCS, 'icone-512.png'));
  console.log('Visuels écrits dans docs/play-store/ et public/screenshots/.');
} finally {
  await browser.close();
  enfant.kill();
}
