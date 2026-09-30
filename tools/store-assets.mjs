import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

/**
 * Visuels de la fiche Play Store (fiche 41), tirés du build statique de `dist/` :
 *
 * - `docs/play-store/capture-{1..4}-*.png` — 1080 × 1920 : page pleine, répétitions,
 *   abréviation expliquée, fond sombre, avec le patron d'exemple du site ;
 * - `docs/play-store/presentation-{en,fr}.png` — image de présentation 1024 × 500 ;
 * - `docs/play-store/icone-512.png` — l'icône du manifeste ;
 * - `public/screenshots/*.png` — les mêmes captures en 540 × 960, que le manifeste
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
  { name: 'lecteur', label: '1-lecteur' },
  { name: 'repetitions', label: '2-repetitions' },
  { name: 'abreviation', label: '3-abreviation' },
  { name: 'sombre', label: '4-sombre' },
];

const PRESENTATION = {
  en: 'Your crochet & knitting pattern, one step at a time',
  fr: 'Votre patron de crochet et de tricot, une étape à la fois',
};

/** Les étapes qui mènent à chaque capture, dans l'ordre : chacune prolonge la précédente. */
async function prendre(page, nom, fichier) {
  if (nom === 'lecteur') {
    await page.goto(BASE + '/');
    await page.locator('fil-root[data-ready]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Example', exact: true }).click();
    await page.locator('.step-body').waitFor();
  } else if (nom === 'repetitions') {
    const plus = page.getByRole('button', { name: '+', exact: true });
    await plus.click();
    await plus.click();
  } else if (nom === 'abreviation') {
    await page.locator('.abbr', { hasText: /^sc$/ }).first().hover();
    await page.locator('.tip.on').waitFor();
  } else {
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.documentElement.setAttribute('data-dim', 'true'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
  }
  await page.screenshot({ path: fichier });
}

async function captures(browser, scale, dossier, nomDe) {
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: scale,
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
  await captures(browser, 3, DOCS, (s) => `capture-${s.label}.png`);
  await captures(browser, 1.5, PUBLIC_SHOTS, (s) => `${s.name}.png`);

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
