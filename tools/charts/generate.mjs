import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { loadComposer } from './composer.mjs';
import { loadSvgs } from './recognize.mjs';

/**
 * Jeu d'essai synthétique de la fiche 37 : dix diagrammes dessinés avec les
 * SVG de `public/symbols/` (ceux que l'application affiche), chacun avec sa
 * transcription attendue dans la syntaxe du lecteur. Déterministe : la graine
 * de chaque diagramme fixe le bruit et les écarts de placement.
 *
 *   node tools/charts/generate.mjs
 *
 * Convention de lecture : tours en rond, du centre vers l'extérieur, en
 * partant de midi dans le sens horaire ; rangs à plat, du bas vers le haut,
 * de gauche à droite.
 */

const OUT = resolve('tools/fixtures/charts');
const N = (symbol, n) => Array.from({ length: n }, () => symbol);
const alternate = (a, b, n) => Array.from({ length: n }, (_, i) => (i % 2 ? b : a));

/**
 * `size` : côté du gabarit en pixels (deux « épaisseurs de trait »).
 * `pitch` : écart entre symboles voisins, en côtés de gabarit (< 0,6 : collés).
 */
export const DIAGRAMS = [
  { name: 'ring-1', seed: 1, size: 56, pitch: 0.85, rounds: [N('sc', 6)] },
  { name: 'ring-2', seed: 2, size: 56, pitch: 0.85, rounds: [N('sc', 6), N('sc-inc', 6)] },
  {
    name: 'ring-3',
    seed: 3,
    size: 44,
    pitch: 0.85,
    rounds: [N('sc', 6), N('sc-inc', 6), alternate('sc', 'sc-inc', 12)],
  },
  {
    name: 'ring-5',
    seed: 4,
    size: 44,
    pitch: 0.85,
    rounds: [
      N('hdc', 6),
      N('dc-inc', 6),
      alternate('hdc', 'dc-inc', 12),
      N('dc', 14),
      N('sl-st', 16),
    ],
  },
  {
    name: 'ring-8',
    seed: 5,
    size: 40,
    pitch: 0.85,
    rounds: [
      N('sc', 6),
      N('sc-inc', 6),
      alternate('sc', 'sc-inc', 12),
      N('sc', 14),
      N('hdc', 14),
      alternate('dc', 'dc-inc', 16),
      N('dc', 18),
      N('tr', 20),
    ],
  },
  { name: 'flat-1', seed: 6, size: 56, pitch: 0.85, rounds: [N('sc', 10)], rows: true },
  {
    name: 'flat-3',
    seed: 7,
    size: 48,
    pitch: 0.85,
    rounds: [N('ch', 8), N('hdc', 8), alternate('dc', 'ch', 8)],
    rows: true,
  },
  {
    name: 'flat-5',
    seed: 8,
    size: 44,
    pitch: 0.85,
    rounds: [
      N('ch', 9),
      N('sl-st', 9),
      N('tr', 9),
      alternate('dc2tog', 'picot', 9),
      N('sc2tog', 9),
    ],
    rows: true,
  },
  {
    name: 'ring-mixed',
    seed: 9,
    size: 48,
    pitch: 0.85,
    rounds: [
      N('sc', 8),
      ['dc', 'hdc', 'tr', 'sc-inc', 'dc2tog', 'ch', 'sl-st', 'picot', 'fpdc', 'bpdc'],
      ['shell', 'puff', 'popcorn', 'cluster', 'dc3tog', 'dc-inc', 'flo', 'blo', 'ch-space', 'sc'],
    ],
  },
  // Cas difficile assumé : les symboles se touchent presque, les composantes fusionnent.
  { name: 'ring-tight', seed: 10, size: 44, pitch: 0.42, rounds: [N('dc', 30)] },
];

/** Mulberry32 : petit générateur déterministe. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Position, orientation et identifiant de chaque symbole du diagramme. */
function place(diagram) {
  const random = rng(diagram.seed);
  const jitter = (amount) => (random() * 2 - 1) * amount;
  const { size, pitch } = diagram;
  const placed = [];
  if (diagram.rows) {
    const length = Math.max(...diagram.rounds.map((r) => r.length));
    diagram.rounds.forEach((row, k) => {
      row.forEach((id, i) => {
        placed.push({
          id,
          x: (i + 0.5) * pitch * size + jitter(2),
          y: (diagram.rounds.length - k - 0.5) * size * 1.05 + jitter(2),
          angle: jitter(1.5),
        });
      });
    });
    return { placed, width: length * pitch * size, height: diagram.rounds.length * size * 1.05 };
  }
  let radius = 0;
  const rings = diagram.rounds.map((round) => {
    radius = Math.max(
      radius + size * 1.0,
      (round.length * pitch * size) / (2 * Math.PI),
      size * 0.8,
    );
    return radius;
  });
  diagram.rounds.forEach((round, k) => {
    round.forEach((id, i) => {
      const phi = (i / round.length) * 360 + jitter(0.6);
      const rad = (phi * Math.PI) / 180;
      placed.push({
        id,
        x: rings[k] * Math.sin(rad) + jitter(2),
        y: -rings[k] * Math.cos(rad) + jitter(2),
        angle: phi + jitter(2),
      });
    });
  });
  const extent = (rings.at(-1) + size) * 2;
  return { placed, width: extent, height: extent, centered: true };
}

/** Transcription attendue : la sortie réelle du composeur sur les tours du diagramme. */
export function expectedRounds(diagram) {
  return diagram.rounds.map((ids) => {
    const tokens = [];
    for (const id of ids) {
      const last = tokens.at(-1);
      if (last && last.symbol === id) last.count++;
      else tokens.push({ symbol: id, count: 1 });
    }
    return { kind: diagram.rows ? 'row' : 'round', groups: [{ tokens, repeat: 1 }] };
  });
}

/* v8 ignore start : exécuté dans le navigateur */
function draw(spec) {
  const { placed, width, height, size, margin, noise, seed, svgs, centered } = spec;
  const random = (() => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  return (async () => {
    const images = {};
    for (const [id, svg] of Object.entries(svgs)) {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await img.decode();
      images[id] = img;
    }
    const w = Math.ceil(width + margin * 2);
    const h = Math.ceil(height + margin * 2);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    const ox = centered ? w / 2 : margin;
    const oy = centered ? h / 2 : margin;
    for (const p of placed) {
      ctx.save();
      ctx.translate(ox + p.x, oy + p.y);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.drawImage(images[p.id], -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    const data = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = data.data[i] > 140 ? 255 : 0;
      const flip = random() < noise;
      const out = flip ? 255 - v : v;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = out;
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    return canvas.toDataURL('image/png');
  })();
}
/* v8 ignore stop */

export async function generateFixtures(dir = OUT) {
  const composer = await loadComposer();
  const svgs = loadSvgs();
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env['PW_CHROMIUM'] || undefined,
  });
  try {
    const page = await browser.newPage();
    for (const diagram of DIAGRAMS) {
      const layout = place(diagram);
      const spec = {
        ...layout,
        size: diagram.size,
        margin: diagram.size * 0.8,
        noise: 0.0015,
        seed: diagram.seed * 97,
        svgs,
      };
      const url = await page.evaluate(`(${draw.toString()})(${JSON.stringify(spec)})`);
      writeFileSync(join(dir, `${diagram.name}.png`), Buffer.from(url.split(',')[1], 'base64'));
      writeFileSync(
        join(dir, `${diagram.name}.expected.txt`),
        composer.renderPattern(expectedRounds(diagram), 'US') + '\n',
      );
    }
  } finally {
    await browser.close();
  }
  return DIAGRAMS.map((d) => d.name);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const names = await generateFixtures();
  console.log(`${names.length} diagrammes écrits dans ${OUT}.`);
}
