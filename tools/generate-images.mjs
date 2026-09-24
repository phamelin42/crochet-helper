import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

/**
 * Génère les images binaires du site à partir des SVG de `public/` :
 *
 * - `public/og/pattern-reader-{en,fr}.png` — image de partage et de résultat
 *   de recherche (Open Graph, Twitter, JSON-LD), 1200 × 630 ;
 * - les icônes PNG du manifeste, `apple-touch-icon.png` et `favicon.ico`,
 *   dessinées depuis `public/favicon.svg`.
 *
 * Hors de la chaîne de build : à relancer à la main quand le logo,
 * l'illustration ou le slogan changent, puis committer les fichiers produits.
 *
 *   PW_CHROMIUM=/chemin/vers/chromium node tools/generate-images.mjs
 */

const ROOT = resolve('.');
const PUBLIC = join(ROOT, 'public');
const url = (path) => pathToFileURL(join(ROOT, path)).href;

const SLOGANS = {
  en: {
    title: 'Your crochet & knitting pattern, one step at a time',
    tags: ['Large print', 'Row counter', 'Abbreviations explained'],
  },
  fr: {
    title: 'Votre patron de crochet et de tricot, une étape à la fois',
    tags: ['Écrit en grand', 'Compteur de rangs', 'Abréviations expliquées'],
  },
};

// Mêmes valeurs que `src/styles/tokens.css` (thème clair).
const KNIT = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='18'%3E%3Cpath d='M4 3q1 8 7 12q6-4 7-12' fill='none' stroke='%23d9789b' stroke-opacity='.16' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E")`;

function ogPage(locale) {
  const { title, tags } = SLOGANS[locale];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Karla; font-weight: 200 800;
      src: url(${url('node_modules/@fontsource-variable/karla/files/karla-latin-wght-normal.woff2')}); }
    @font-face { font-family: Zen; font-weight: 700;
      src: url(${url('node_modules/@fontsource/zen-maru-gothic/files/zen-maru-gothic-latin-700-normal.woff2')}); }
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; background: #faf4ed ${KNIT}; font-family: Karla;
      color: #514a62; display: grid; place-items: center; }
    .card { width: 1120px; height: 550px; border-radius: 40px; border: 2px solid #e3d7cd;
      outline: 3px dashed #f7dbe5; outline-offset: -14px; padding: 56px 64px;
      background: linear-gradient(135deg, #f9e4ec, #fffaf3 45%, #ece8f7);
      box-shadow: 0 30px 60px -30px rgba(81,74,98,.35);
      display: grid; grid-template-columns: 1fr 470px; align-items: center; gap: 24px; }
    .brand { display: flex; align-items: center; gap: 14px; font-family: Zen; font-size: 34px;
      color: #3c3550; margin-bottom: 30px; }
    .brand img { width: 56px; height: 56px; }
    h1 { font-family: Zen; font-size: 54px; line-height: 1.15; color: #3c3550; }
    .tags { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 34px; }
    .tag { font-weight: 700; font-size: 22px; padding: 6px 18px; border-radius: 999px; }
    .tag:nth-child(1) { background: #f7dbe5; color: #97445f; }
    .tag:nth-child(2) { background: #e4f0d8; color: #44702a; }
    .tag:nth-child(3) { background: #d8edee; color: #176870; }
    .art { width: 470px; }
  </style></head><body><div class="card">
    <div>
      <div class="brand"><img src="${url('public/logo.svg')}" alt="">Pattern Reader</div>
      <h1>${title}</h1>
      <div class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
    </div>
    <img class="art" src="${url('public/illustrations/pelotes.svg')}" alt="">
  </div></body></html>`;
}

function iconPage(size, { padding = 0, background = 'transparent' } = {}) {
  return `<!doctype html><html><head><style>
    * { margin: 0; } body { width: ${size}px; height: ${size}px; background: ${background};
      display: grid; place-items: center; }
    img { width: ${size - 2 * padding}px; height: ${size - 2 * padding}px; }
  </style></head><body><img src="${url('public/favicon.svg')}" alt=""></body></html>`;
}

/** Un .ico qui embarque des PNG (format accepté depuis Windows Vista). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const browser = await chromium.launch({
  executablePath: process.env['PW_CHROMIUM'] || undefined,
});

// Les pages passent par un fichier : depuis `about:blank` (setContent),
// Chromium refuse de charger les polices et SVG locaux en file://.
const scratch = mkdtempSync(join(tmpdir(), 'fil-images-'));
const pageFile = join(scratch, 'page.html');

async function render(html, width, height, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  writeFileSync(pageFile, html);
  await page.goto(pathToFileURL(pageFile).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ omitBackground: transparent });
  await page.close();
  return png;
}

mkdirSync(join(PUBLIC, 'og'), { recursive: true });
for (const locale of Object.keys(SLOGANS)) {
  writeFileSync(
    join(PUBLIC, 'og', `pattern-reader-${locale}.png`),
    await render(ogPage(locale), 1200, 630),
  );
}

const washi = '#faf4ed';
writeFileSync(
  join(PUBLIC, 'icon-256.png'),
  await render(iconPage(256), 256, 256, { transparent: true }),
);
writeFileSync(
  join(PUBLIC, 'icons/icon-192x192.png'),
  await render(iconPage(192), 192, 192, { transparent: true }),
);
writeFileSync(
  join(PUBLIC, 'icons/icon-512x512.png'),
  await render(iconPage(512), 512, 512, { transparent: true }),
);
// Masquable : la pelote reste dans la zone sûre (80 % centraux), fond plein.
writeFileSync(
  join(PUBLIC, 'icons/maskable-512x512.png'),
  await render(iconPage(512, { padding: 72, background: washi }), 512, 512),
);
writeFileSync(
  join(PUBLIC, 'apple-touch-icon.png'),
  await render(iconPage(180, { background: washi }), 180, 180),
);

const sizes = [16, 32, 48];
const pngs = [];
for (const size of sizes) {
  pngs.push({ size, data: await render(iconPage(size), size, size, { transparent: true }) });
}
writeFileSync(join(PUBLIC, 'favicon.ico'), ico(pngs));

await browser.close();
rmSync(scratch, { recursive: true, force: true });
console.log(`Images générées : og (${Object.keys(SLOGANS).join(', ')}), icônes, favicon.ico.`);
