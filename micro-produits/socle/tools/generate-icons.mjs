// Icônes PNG du manifeste à partir de public/favicon.svg (hors build : on
// commite le résultat). Chromium via Playwright, déjà présent pour l'audit.
//   npm run icones
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const svg = await readFile('public/favicon.svg', 'utf8');
const SORTIES = [
  { fichier: 'public/icons/icon-192.png', taille: 192, marge: 0 },
  { fichier: 'public/icons/icon-512.png', taille: 512, marge: 0 },
  // Zone sûre d'une icône maskable : cercle de 80 % du côté.
  { fichier: 'public/icons/maskable-512.png', taille: 512, marge: 0.1 },
  { fichier: 'public/icons/apple-touch-icon.png', taille: 180, marge: 0 },
];

const navigateur = await chromium.launch({
  executablePath: process.env['PW_CHROMIUM'] || undefined,
});
const page = await navigateur.newPage();
for (const { fichier, taille, marge } of SORTIES) {
  const interieur = Math.round(taille * (1 - 2 * marge));
  await page.setViewportSize({ width: taille, height: taille });
  const fond = /fill="(#[0-9a-f]{6})"/i.exec(svg)?.[1] ?? '#ffffff';
  await page.setContent(
    `<body style="margin:0;display:grid;place-items:center;width:${taille}px;height:${taille}px;background:${marge ? fond : 'transparent'}">` +
      `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${interieur}" height="${interieur}"></body>`,
  );
  await page.screenshot({ path: fichier, omitBackground: !marge });
  console.log(fichier);
}
await navigateur.close();
