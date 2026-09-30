import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

/**
 * Prototype de reconnaissance de symboles de diagrammes de crochet (fiche 37).
 *
 * Deux parties :
 *  - `PIPELINE`, du JavaScript de navigateur pur (canvas, `ImageData`), injecté
 *    tel quel dans Chromium : aucune dépendance, aucune requête ;
 *  - `recognizeImage`, côté Node, qui ouvre Chromium sur `about:blank`, coupe
 *    tout le réseau et compte les requêtes qui tenteraient de sortir.
 *
 * Étapes : binarisation → composantes connexes → gabarit le plus proche →
 * regroupement en tours (polaire) ou en rangs (ordonnée) → `Round[]`.
 */

const ROOT = resolve('.');
const SYMBOLS_DIR = join(ROOT, 'public/symbols');

/* v8 ignore start : exécuté dans le navigateur */
const PIPELINE = `
const GRID = 32;
const MIN_AREA = 12;

/** Otsu : seuil qui sépare le mieux fond clair et trait sombre. */
function otsu(gray) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let wB = 0, sumB = 0, best = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = gray.length - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) { best = between; threshold = t; }
  }
  return threshold;
}

/** ImageData -> masque binaire (1 = encre). Les pixels transparents sont du fond. */
function binarize(image) {
  const { data, width, height } = image;
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const a = data[i * 4 + 3] / 255;
    const v = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) * a + 255 * (1 - a);
    gray[i] = v;
  }
  const t = otsu(gray);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] <= Math.min(t, 160) ? 1 : 0;
  return { mask, width, height };
}

/** Composantes connexes (8-voisinage), par parcours en pile. */
function components(bin) {
  const { mask, width, height } = bin;
  const seen = new Uint8Array(mask.length);
  const found = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const pixels = [];
    const stack = [start];
    seen[start] = 1;
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    while (stack.length) {
      const p = stack.pop();
      const x = p % width, y = (p - x) / width;
      pixels.push(x, y);
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
        }
      }
    }
    if (pixels.length / 2 >= MIN_AREA) found.push({ pixels, x0, y0, x1, y1 });
  }
  return found;
}

/** Une composante dont la boîte en contient une autre l'absorbe (anneaux emboîtés). */
function mergeNested(list) {
  const out = list.slice().sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0));
  const kept = [];
  for (const c of out) {
    const host = kept.find((k) => c.x0 >= k.x0 - 1 && c.x1 <= k.x1 + 1 && c.y0 >= k.y0 - 1 && c.y1 <= k.y1 + 1);
    if (host) {
      host.pixels = host.pixels.concat(c.pixels);
    } else kept.push({ ...c, pixels: c.pixels.slice() });
  }
  return kept.map(describe);
}

function describe(c) {
  const n = c.pixels.length / 2;
  let sx = 0, sy = 0;
  for (let i = 0; i < c.pixels.length; i += 2) { sx += c.pixels[i]; sy += c.pixels[i + 1]; }
  const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
  return { ...c, area: n, cx: sx / n, cy: sy / n, w, h, size: Math.max(w, h) };
}

/** Points -> grille GRID x GRID, boîte englobante étirée : tolère l'échelle. */
function rasterize(points, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  let mx = 0, my = 0;
  for (let i = 0; i < points.length; i += 2) { mx += points[i]; my += points[i + 1]; }
  mx /= points.length / 2; my /= points.length / 2;
  const rot = new Float32Array(points.length);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    const dx = points[i] - mx, dy = points[i + 1] - my;
    const x = dx * cos - dy * sin, y = dx * sin + dy * cos;
    rot[i] = x; rot[i + 1] = y;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const grid = new Uint8Array(GRID * GRID);
  const sx = (GRID - 1) / Math.max(x1 - x0, 1), sy = (GRID - 1) / Math.max(y1 - y0, 1);
  for (let i = 0; i < rot.length; i += 2) {
    grid[Math.round((rot[i + 1] - y0) * sy) * GRID + Math.round((rot[i] - x0) * sx)] = 1;
  }
  return { grid, aspect: (x1 - x0 + 1) / (y1 - y0 + 1), rw: x1 - x0 + 1, rh: y1 - y0 + 1 };
}

/** Un pixel de \`a\` à moins de \`tol\` d'un pixel de \`b\` : les boîtes voisines de deux symboles distincts ne suffisent pas. */
function touches(a, b, tol) {
  const r = Math.ceil(tol);
  const cells = new Set();
  for (let i = 0; i < b.pixels.length; i += 2) cells.add(b.pixels[i] * 100000 + b.pixels[i + 1]);
  for (let i = 0; i < a.pixels.length; i += 2) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= tol * tol && cells.has((a.pixels[i] + dx) * 100000 + a.pixels[i + 1] + dy)) return true;
    }
  }
  return false;
}

/** Deux boîtes distantes de moins de \`tol\` pixels sont un même symbole en plusieurs morceaux. */
function mergeNear(list) {
  if (list.length < 2) return list;
  const sizes = list.map((c) => c.size).sort((a, b) => a - b);
  const tol = sizes[Math.floor(sizes.length / 2)] * 0.12;
  let parts = list.map((c) => ({ ...c, pixels: c.pixels.slice() }));
  for (let merged = true; merged; ) {
    merged = false;
    outer: for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j];
        const dx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0);
        const dy = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);
        if (Math.hypot(dx, dy) > tol || !touches(a, b, tol)) continue;
        const union = describe({
          pixels: a.pixels.concat(b.pixels),
          x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0),
          x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1),
        });
        parts = parts.filter((_, k) => k !== i && k !== j).concat(union);
        merged = true;
        break outer;
      }
    }
  }
  return parts;
}

/**
 * Centre du carré de dessin d'un symbole : le centre de gravité des pixels en
 * diffère (une coquille est lourde d'un côté), ce qui brouillerait le rayon.
 */
function origin(component, template, deg) {
  const { rw, rh } = rasterize(component.pixels, (-deg * Math.PI) / 180);
  const k = (rw / template.rw + rh / template.rh) / 2;
  const a = (deg * Math.PI) / 180;
  const ox = template.ox * k, oy = template.oy * k;
  return {
    x: component.cx - (ox * Math.cos(a) - oy * Math.sin(a)),
    y: component.cy - (ox * Math.sin(a) + oy * Math.cos(a)),
  };
}

function dilate(grid) {
  const out = new Uint8Array(grid.length);
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    if (!grid[y * GRID + x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < GRID && ny < GRID) out[ny * GRID + nx] = 1;
    }
  }
  return out;
}

const count = (g) => { let n = 0; for (let i = 0; i < g.length; i++) n += g[i]; return n; };

/** Fraction de A couverte par B dilaté, symétrisée : tolère un pixel d'écart. */
function similarity(a, aDil, aN, b) {
  let ab = 0, ba = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b.dil[i]) ab++;
    if (b.grid[i] && aDil[i]) ba++;
  }
  return (ab / aN + ba / b.n) / 2;
}

/** Gabarits : chaque SVG rendu en canvas, binarisé, puis mis en grille. */
async function buildTemplates(svgs) {
  const templates = [];
  for (const [id, svg] of Object.entries(svgs)) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.drawImage(img, 0, 0, 128, 128);
    const parts = mergeNested(components(binarize(ctx.getImageData(0, 0, 128, 128))));
    const pixels = parts.flatMap((p) => p.pixels);
    const { grid, aspect, rw, rh } = rasterize(pixels, 0);
    let mx = 0, my = 0;
    for (let i = 0; i < pixels.length; i += 2) { mx += pixels[i]; my += pixels[i + 1]; }
    mx /= pixels.length / 2; my /= pixels.length / 2;
    // Décalage du centre de gravité par rapport au centre du carré de dessin (128 / 2).
    templates.push({ id, grid, dil: dilate(grid), n: count(grid), aspect, rw, rh, ox: mx - 64, oy: my - 64 });
  }
  return templates;
}

/** Meilleur (gabarit, angle) pour une composante ; angles en degrés, [lo, hi] par pas. */
function classify(component, templates, angles) {
  let best = { id: null, score: -1, angle: 0 };
  for (const deg of angles) {
    const { grid, aspect } = rasterize(component.pixels, (-deg * Math.PI) / 180);
    const dil = dilate(grid);
    const n = count(grid);
    for (const t of templates) {
      const ratio = Math.min(aspect, t.aspect) / Math.max(aspect, t.aspect);
      const score = similarity(grid, dil, n, t) * (0.6 + 0.4 * ratio);
      if (score > best.score) best = { id: t.id, score, angle: deg };
    }
  }
  return best;
}

const range = (from, to, step) => { const r = []; for (let a = from; a <= to; a += step) r.push(a); return r; };

/** 1D : coupe la liste triée à chaque écart supérieur à \`gap\`. */
function cluster1d(items, key, gap) {
  const sorted = items.slice().sort((a, b) => key(a) - key(b));
  const groups = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    if (last && key(item) - key(last[last.length - 1]) <= gap) last.push(item);
    else groups.push([item]);
  }
  return groups;
}

const spread = (groups, key) => {
  let s = 0, n = 0;
  for (const g of groups) {
    const m = g.reduce((a, c) => a + key(c), 0) / g.length;
    for (const c of g) { s += (key(c) - m) ** 2; n++; }
  }
  return Math.sqrt(s / Math.max(n, 1));
};

/**
 * Tours (autour du centre de gravité) ou rangs (par ordonnée) : on garde la
 * disposition dont les groupes sont les plus serrés.
 */
function layout(comps, size) {
  const gap = size * 0.4;
  const cx = comps.reduce((a, c) => a + c.cx, 0) / comps.length;
  const cy = comps.reduce((a, c) => a + c.cy, 0) / comps.length;
  for (const c of comps) c.r = Math.hypot(c.cx - cx, c.cy - cy);
  const rings = cluster1d(comps, (c) => c.r, gap);
  const rows = cluster1d(comps, (c) => c.cy, gap);
  // Un découpage juste a des groupes serrés : sur la mauvaise disposition, des
  // symboles à pas régulier s'enchaînent en un groupe étalé. Entre deux
  // découpages serrés, le moins fragmenté gagne (des groupes d'un seul symbole
  // ont un écart nul et ne prouvent rien).
  const extent = (groups, key) =>
    Math.max(...groups.map((g) => Math.max(...g.map(key)) - Math.min(...g.map(key))));
  const ringsTight = extent(rings, (c) => c.r) <= size * 0.5;
  const rowsTight = extent(rows, (c) => c.cy) <= size * 0.5;
  const radial =
    ringsTight !== rowsTight
      ? ringsTight
      : rings.length !== rows.length
        ? rings.length < rows.length
        : spread(rings, (c) => c.r) < spread(rows, (c) => c.cy);
  return { radial, cx, cy, groups: radial ? rings : rows };
}

/** Angle depuis midi, dans le sens horaire, en degrés [0, 360). */
const clock = (c, cx, cy) => ((Math.atan2(c.cx - cx, cy - c.cy) * 180) / Math.PI + 360) % 360;

/** Regroupe les symboles successifs identiques en jetons. */
function toTokens(ids) {
  const tokens = [];
  for (const id of ids) {
    const last = tokens[tokens.length - 1];
    if (last && last.symbol === id) last.count++;
    else tokens.push({ symbol: id, count: 1 });
  }
  return tokens;
}

async function recognize(image, svgs) {
  const timings = {};
  const t0 = performance.now();
  const templates = await buildTemplates(svgs);
  timings.templates = performance.now() - t0;

  const t1 = performance.now();
  const bin = binarize(image);
  const comps = mergeNear(mergeNested(components(bin)));
  timings.components = performance.now() - t1;
  if (!comps.length) return { rounds: [], items: [], timings, radial: false, components: 0 };

  const sizes = comps.map((c) => c.size).sort((a, b) => a - b);
  const size = sizes[Math.floor(sizes.length / 2)];
  const t2 = performance.now();
  const first = layout(comps, size);

  // Passe 1 : tous les angles, pour ne rien supposer de l'orientation.
  for (const c of comps) Object.assign(c, { first: classify(c, templates, range(0, 350, 10)) });
  // Passe 2 : orientation attendue (radiale : vers l'extérieur ; à plat : droite), ±20°.
  for (const c of comps) {
    const expected = first.radial ? clock(c, first.cx, first.cy) : 0;
    const lo = Math.round(expected / 5) * 5 - 20;
    const near = classify(c, templates, range(lo, lo + 40, 5));
    c.match = near.score >= c.first.score - 0.03 ? near : c.first;
  }
  timings.matching = performance.now() - t2;

  // Le rayon et l'ordonnée se lisent au centre du carré de dessin, pas au centre de gravité.
  const byId = new Map(templates.map((t) => [t.id, t]));
  for (const c of comps) {
    const o = origin(c, byId.get(c.match.id), c.match.angle);
    c.cx = o.x;
    c.cy = o.y;
  }
  const lay = layout(comps, size);
  const ordered = lay.radial
    ? lay.groups.slice().sort((a, b) => a[0].r - b[0].r)
    : lay.groups.slice().sort((a, b) => b[0].cy - a[0].cy);
  const rounds = [];
  const items = [];
  ordered.forEach((group, roundIndex) => {
    let sorted;
    if (lay.radial) {
      const shift = 180 / Math.max(group.length, 1) / 2;
      sorted = group.slice().sort((a, b) =>
        ((clock(a, lay.cx, lay.cy) + shift) % 360) - ((clock(b, lay.cx, lay.cy) + shift) % 360));
    } else sorted = group.slice().sort((a, b) => a.cx - b.cx);
    sorted.forEach((c, index) => items.push({ round: roundIndex, index, id: c.match.id, score: c.match.score, x: c.cx, y: c.cy, w: c.w, h: c.h }));
    rounds.push({
      kind: lay.radial ? 'round' : 'row',
      groups: [{ tokens: toTokens(sorted.map((c) => c.match.id)), repeat: 1 }],
    });
  });
  timings.total = performance.now() - t0;
  return { rounds, items, timings, radial: lay.radial, components: comps.length };
}

/** Trace : image annotée (boîte, classe, score), pour relire une erreur à l'œil. */
function annotate(canvas, items) {
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 1;
  ctx.font = '11px sans-serif';
  for (const it of items) {
    ctx.strokeStyle = it.score < 0.7 ? '#d00' : '#08c';
    ctx.strokeRect(it.x - it.w / 2, it.y - it.h / 2, it.w, it.h);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(it.id + ' ' + Math.round(it.score * 100), it.x - it.w / 2, it.y - it.h / 2 - 2);
  }
}

window.__fil = {
  async run(dataUrl, svgs) {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const result = await recognize(ctx.getImageData(0, 0, canvas.width, canvas.height), svgs);
    annotate(canvas, result.items);
    return { ...result, trace: canvas.toDataURL('image/png') };
  },
};
`;
/* v8 ignore stop */

/** Poids du code de reconnaissance, minifié puis compressé, hors gabarits. */
export async function pipelineWeight() {
  const { gzipSync } = await import('node:zlib');
  let code = PIPELINE;
  try {
    const { transformSync } = await import('esbuild');
    code = transformSync(PIPELINE, { minify: true }).code;
  } catch {
    // esbuild absent : on garde la source, le chiffre est alors un majorant.
  }
  return { raw: Buffer.byteLength(code), gzip: gzipSync(code).length };
}

export function loadSvgs() {
  const svgs = {};
  for (const id of listSymbolIds()) svgs[id] = readFileSync(join(SYMBOLS_DIR, `${id}.svg`), 'utf8');
  return svgs;
}

function listSymbolIds() {
  const source = readFileSync(join(ROOT, 'src/app/features/reader/data/chart-symbols.ts'), 'utf8');
  return [...source.matchAll(/\bid: '([a-z0-9-]+)'/g)].map((m) => m[1]);
}

/**
 * Ouvre Chromium, coupe le réseau, reconnaît chaque image. Renvoie aussi le
 * nombre de requêtes sortantes tentées (attendu : 0).
 */
export async function recognizeImages(files) {
  const svgs = loadSvgs();
  const browser = await chromium.launch({ executablePath: process.env['PW_CHROMIUM'] || undefined });
  try {
    const context = await browser.newContext();
    let attempted = 0;
    await context.route('**', (route) => {
      attempted++;
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ content: PIPELINE });
    const results = [];
    for (const file of files) {
      const mime = /\.jpe?g$/i.test(file) ? 'image/jpeg' : 'image/png';
      const dataUrl = `data:${mime};base64,${readFileSync(file).toString('base64')}`;
      results.push(await page.evaluate(([u, s]) => window.__fil.run(u, s), [dataUrl, svgs]));
    }
    return { results, attempted };
  } finally {
    await browser.close();
  }
}
