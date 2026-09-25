import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

/**
 * Rend `public/pin/pattern-reader-pin.svg` en PNG : Pinterest n'affiche pas
 * les visuels SVG épinglés. Hors de la chaîne de build, comme
 * `generate-images.mjs` : à relancer à la main quand le visuel change, puis
 * committer le PNG produit.
 *
 *   PW_CHROMIUM=/chemin/vers/chromium node tools/render-pin.mjs
 */

const ROOT = resolve('.');
const SVG = join(ROOT, 'public/pin/pattern-reader-pin.svg');
const PNG = join(ROOT, 'public/pin/pattern-reader-pin.png');

const browser = await chromium.launch({
  executablePath: process.env['PW_CHROMIUM'] || undefined,
});
const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
await page.goto(pathToFileURL(SVG).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
writeFileSync(PNG, await page.screenshot());
await browser.close();

console.log('pattern-reader-pin.png généré.');
