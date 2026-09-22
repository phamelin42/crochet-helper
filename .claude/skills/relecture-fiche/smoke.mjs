/**
 * Test de fumée à 360 px sous CSP de production : pour chaque chemin, erreurs
 * console, débordement horizontal, capture dans $OUT (défaut : ./smoke-out).
 *
 * Prérequis : serve-csp.py lancé ; `playwright-core` résolu depuis le dossier
 * courant (npm i --no-save playwright-core dans un dossier jetable).
 * Usage : node smoke.mjs /us-uk-converter /fr/glossaire/dc /my-projects
 */
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

// Résolu depuis le dossier courant (jetable), pas depuis le dépôt.
const { chromium } = createRequire(`${process.cwd()}/`)('playwright-core');

const BASE = process.env.BASE ?? 'http://127.0.0.1:4321';
const OUT = process.env.OUT ?? 'smoke-out';
const paths = process.argv.slice(2);
if (!paths.length) paths.push('/', '/fr');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let failed = false;
for (const path of paths) {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const file = `${OUT}/${path.replace(/\W+/g, '_') || 'root'}.png`;
  await page.screenshot({ path: file, fullPage: true });
  const ok = !errors.length && overflow <= 0;
  failed ||= !ok;
  console.log(`${ok ? 'OK ' : 'KO '} ${path}  débordement=${overflow}px  ${file}`);
  errors.forEach((e) => console.log(`    ${e}`));
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
