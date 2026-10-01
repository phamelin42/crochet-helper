// Icônes PNG du manifeste d'une application, depuis son logo SVG (hors
// build : on commite le résultat). Chromium via Playwright.
//   npm run icones -- <app>
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { application } from './apps.mjs';

const app = application(process.argv[2]);
const produit = JSON.parse(await readFile(join(app.racine, 'produit.json'), 'utf8'));
const svg = await readFile(join(app.racine, 'public', produit.logo), 'utf8');
const icones = join(app.racine, 'public', 'icons');
const SORTIES = [
  { fichier: 'icon-192.png', taille: 192, marge: 0 },
  { fichier: 'icon-512.png', taille: 512, marge: 0 },
  // Zone sûre d'une icône maskable : cercle de 80 % du côté.
  { fichier: 'maskable-512.png', taille: 512, marge: 0.1 },
  { fichier: 'apple-touch-icon.png', taille: 180, marge: 0 },
];

const navigateur = await chromium.launch({
  executablePath: process.env['PW_CHROMIUM'] || undefined,
});
const page = await navigateur.newPage();
const fond = produit.theme.accentFonce;
for (const { fichier, taille, marge } of SORTIES) {
  const interieur = Math.round(taille * (1 - 2 * marge));
  await page.setViewportSize({ width: taille, height: taille });
  await page.setContent(
    `<body style="margin:0;display:grid;place-items:center;width:${taille}px;height:${taille}px;background:${marge ? fond : 'transparent'}">` +
      `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${interieur}" height="${interieur}"></body>`,
  );
  await page.screenshot({ path: join(icones, fichier), omitBackground: !marge });
  console.log(join(icones, fichier));
}
await navigateur.close();
