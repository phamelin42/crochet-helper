import type { Group, Round, Token } from './chart-composer';

/**
 * Lecture automatique d'un diagramme de crochet : de l'image aux tours écrits.
 * Port du prototype de la fiche 37 (`tools/charts/recognize.mjs`), en
 * fonctions pures sur des pixels : ni canvas ni DOM ici, le décodage des
 * images vit dans `core/platform/image-pixels.ts`.
 *
 * Étapes : binarisation → composantes connexes → gabarit le plus proche
 * (plusieurs rotations) → regroupement en tours (polaire) ou en rangs
 * (ordonnée) → répétitions repérées → `Round[]`.
 *
 * C'est un **brouillon** : il lit bien un diagramme net, mal une photo où les
 * symboles se touchent. La lectrice le corrige dans le composeur, rien n'est
 * écrit sans elle.
 */

/** Pixels RGBA, comme `ImageData`. */
export interface Pixels {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/** Un symbole de `chart-symbols.ts`, dessiné sur un carré de `TEMPLATE_SIZE` pixels. */
export interface TemplateSource {
  readonly id: string;
  readonly pixels: Pixels;
}

export interface Recognition {
  readonly rounds: readonly Round[];
  /** Symboles lus en tout. */
  readonly symbols: number;
  /** Symboles lus avec une ressemblance faible : à vérifier en priorité. */
  readonly uncertain: number;
}

/** Côté du carré sur lequel chaque gabarit est dessiné. */
export const TEMPLATE_SIZE = 128;
/** Une image plus grande est réduite avant lecture : au-delà, le temps croît sans gain. */
export const MAX_RECOGNITION_SIDE = 1600;
/**
 * Au-delà, ce n'est pas un diagramme mais une photo bruitée (grain du papier,
 * texte) : on ne lit rien plutôt que de bloquer la tablette plusieurs secondes.
 */
export const MAX_COMPONENTS = 600;
/** Sous ce score, un symbole est compté « incertain ». */
const UNCERTAIN = 0.7;

const EMPTY: Recognition = { rounds: [], symbols: 0, uncertain: 0 };

const GRID = 32;
const MIN_AREA = 12;

interface Mask {
  readonly mask: Uint8Array;
  readonly width: number;
  readonly height: number;
}

interface Box {
  pixels: number[];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Part extends Box {
  area: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  size: number;
  r?: number;
}

interface Template {
  readonly id: string;
  readonly grid: Uint8Array;
  readonly dil: Uint8Array;
  readonly n: number;
  readonly aspect: number;
  readonly rw: number;
  readonly rh: number;
  readonly ox: number;
  readonly oy: number;
}

interface Match {
  readonly id: string;
  readonly score: number;
  readonly angle: number;
}

/** Otsu : seuil qui sépare le mieux fond clair et trait sombre. */
function otsu(gray: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of gray) hist[v]++;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let wB = 0;
  let sumB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = gray.length - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Pixels → masque binaire (1 = encre). Les pixels transparents sont du fond. */
export function binarize(image: Pixels): Mask {
  const { data, width, height } = image;
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const a = data[i * 4 + 3] / 255;
    gray[i] =
      (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) * a + 255 * (1 - a);
  }
  const t = Math.min(otsu(gray), 160);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] <= t ? 1 : 0;
  return { mask, width, height };
}

/** Composantes connexes (8-voisinage). `null` au-delà de `limit` : ce n'est pas un diagramme. */
function components({ mask, width, height }: Mask, limit = Infinity): Box[] | null {
  const seen = new Uint8Array(mask.length);
  const found: Box[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const pixels: number[] = [];
    const stack = [start];
    seen[start] = 1;
    let x0 = width;
    let y0 = height;
    let x1 = 0;
    let y1 = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % width;
      const y = (p - x) / width;
      pixels.push(x, y);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (mask[q] && !seen[q]) {
            seen[q] = 1;
            stack.push(q);
          }
        }
      }
    }
    if (pixels.length / 2 >= MIN_AREA) {
      found.push({ pixels, x0, y0, x1, y1 });
      if (found.length > limit) return null;
    }
  }
  return found;
}

function describe(c: Box): Part {
  const n = c.pixels.length / 2;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < c.pixels.length; i += 2) {
    sx += c.pixels[i];
    sy += c.pixels[i + 1];
  }
  const w = c.x1 - c.x0 + 1;
  const h = c.y1 - c.y0 + 1;
  return { ...c, area: n, cx: sx / n, cy: sy / n, w, h, size: Math.max(w, h) };
}

/** Une composante dont la boîte en contient une autre l'absorbe (anneaux emboîtés). */
function mergeNested(list: readonly Box[]): Part[] {
  const sorted = list
    .slice()
    .sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0));
  const kept: Box[] = [];
  for (const c of sorted) {
    const host = kept.find(
      (k) => c.x0 >= k.x0 - 1 && c.x1 <= k.x1 + 1 && c.y0 >= k.y0 - 1 && c.y1 <= k.y1 + 1,
    );
    if (host) host.pixels = host.pixels.concat(c.pixels);
    else kept.push({ ...c, pixels: c.pixels.slice() });
  }
  return kept.map(describe);
}

/** Points → grille GRID × GRID, boîte englobante étirée : tolère l'échelle. */
function rasterize(points: readonly number[], angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let mx = 0;
  let my = 0;
  for (let i = 0; i < points.length; i += 2) {
    mx += points[i];
    my += points[i + 1];
  }
  mx /= points.length / 2;
  my /= points.length / 2;
  const rot = new Float32Array(points.length);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    const dx = points[i] - mx;
    const dy = points[i + 1] - my;
    const x = dx * cos - dy * sin;
    const y = dx * sin + dy * cos;
    rot[i] = x;
    rot[i + 1] = y;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const grid = new Uint8Array(GRID * GRID);
  const sx = (GRID - 1) / Math.max(x1 - x0, 1);
  const sy = (GRID - 1) / Math.max(y1 - y0, 1);
  for (let i = 0; i < rot.length; i += 2) {
    grid[Math.round((rot[i + 1] - y0) * sy) * GRID + Math.round((rot[i] - x0) * sx)] = 1;
  }
  return { grid, aspect: (x1 - x0 + 1) / (y1 - y0 + 1), rw: x1 - x0 + 1, rh: y1 - y0 + 1 };
}

/** Un pixel de `a` à moins de `tol` d'un pixel de `b` : des boîtes voisines ne suffisent pas. */
function touches(a: Box, b: Box, tol: number): boolean {
  const r = Math.ceil(tol);
  const cells = new Set<number>();
  for (let i = 0; i < b.pixels.length; i += 2) cells.add(b.pixels[i] * 100000 + b.pixels[i + 1]);
  for (let i = 0; i < a.pixels.length; i += 2) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (
          dx * dx + dy * dy <= tol * tol &&
          cells.has((a.pixels[i] + dx) * 100000 + a.pixels[i + 1] + dy)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

const median = (values: readonly number[]): number =>
  values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Deux morceaux à moins de `tol` pixels sont un même symbole (un crochet et son trait). */
function mergeNear(list: readonly Part[]): Part[] {
  if (list.length < 2) return list.slice();
  const tol = median(list.map((c) => c.size)) * 0.12;
  let parts = list.map((c) => ({ ...c, pixels: c.pixels.slice() }));
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i];
        const b = parts[j];
        const dx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0);
        const dy = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);
        if (Math.hypot(dx, dy) > tol || !touches(a, b, tol)) continue;
        const union = describe({
          pixels: a.pixels.concat(b.pixels),
          x0: Math.min(a.x0, b.x0),
          y0: Math.min(a.y0, b.y0),
          x1: Math.max(a.x1, b.x1),
          y1: Math.max(a.y1, b.y1),
        });
        parts = parts.filter((_, k) => k !== i && k !== j).concat(union);
        merged = true;
        break outer;
      }
    }
  }
  return parts;
}

function dilate(grid: Uint8Array): Uint8Array {
  const out = new Uint8Array(grid.length);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!grid[y * GRID + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < GRID && ny < GRID) out[ny * GRID + nx] = 1;
        }
      }
    }
  }
  return out;
}

const count = (grid: Uint8Array): number => grid.reduce((n, v) => n + v, 0);

/** Fraction de A couverte par B dilaté, symétrisée : tolère un pixel d'écart. */
function similarity(a: Uint8Array, aDil: Uint8Array, aN: number, b: Template): number {
  let ab = 0;
  let ba = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b.dil[i]) ab++;
    if (b.grid[i] && aDil[i]) ba++;
  }
  return (ab / aN + ba / b.n) / 2;
}

/** Gabarits : chaque symbole binarisé puis mis en grille. Un symbole sans encre est ignoré. */
export function buildTemplates(sources: readonly TemplateSource[]): Template[] {
  return sources.flatMap(({ id, pixels: image }) => {
    const parts = mergeNested(components(binarize(image)) ?? []);
    const pixels = parts.flatMap((p) => p.pixels);
    if (!pixels.length) return [];
    const { grid, aspect, rw, rh } = rasterize(pixels, 0);
    let mx = 0;
    let my = 0;
    for (let i = 0; i < pixels.length; i += 2) {
      mx += pixels[i];
      my += pixels[i + 1];
    }
    mx /= pixels.length / 2;
    my /= pixels.length / 2;
    const half = image.width / 2;
    return [
      { id, grid, dil: dilate(grid), n: count(grid), aspect, rw, rh, ox: mx - half, oy: my - half },
    ];
  });
}

/** Meilleur couple (gabarit, angle) pour une composante ; angles en degrés. */
function classify(part: Part, templates: readonly Template[], angles: readonly number[]): Match {
  let best: Match = { id: templates[0].id, score: -1, angle: 0 };
  for (const deg of angles) {
    const { grid, aspect } = rasterize(part.pixels, (-deg * Math.PI) / 180);
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

/**
 * Centre du carré de dessin d'un symbole : le centre de gravité des pixels en
 * diffère (une coquille est lourde d'un côté), ce qui brouillerait le rayon.
 */
function origin(part: Part, template: Template, deg: number): { x: number; y: number } {
  const { rw, rh } = rasterize(part.pixels, (-deg * Math.PI) / 180);
  const k = (rw / template.rw + rh / template.rh) / 2;
  const a = (deg * Math.PI) / 180;
  const ox = template.ox * k;
  const oy = template.oy * k;
  return {
    x: part.cx - (ox * Math.cos(a) - oy * Math.sin(a)),
    y: part.cy - (ox * Math.sin(a) + oy * Math.cos(a)),
  };
}

const range = (from: number, to: number, step: number): number[] => {
  const out: number[] = [];
  for (let a = from; a <= to; a += step) out.push(a);
  return out;
};

/** 1D : coupe la liste triée à chaque écart supérieur à `gap`. */
function cluster1d<T>(items: readonly T[], key: (item: T) => number, gap: number): T[][] {
  const sorted = items.slice().sort((a, b) => key(a) - key(b));
  const groups: T[][] = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    if (last && key(item) - key(last[last.length - 1]) <= gap) last.push(item);
    else groups.push([item]);
  }
  return groups;
}

function spread<T>(groups: readonly T[][], key: (item: T) => number): number {
  let s = 0;
  let n = 0;
  for (const g of groups) {
    const m = g.reduce((a, c) => a + key(c), 0) / g.length;
    for (const c of g) {
      s += (key(c) - m) ** 2;
      n++;
    }
  }
  return Math.sqrt(s / Math.max(n, 1));
}

/**
 * Tours (autour du centre de gravité) ou rangs (par ordonnée) : on garde la
 * disposition dont les groupes sont les plus serrés.
 */
function layout(parts: Part[], size: number) {
  const gap = size * 0.4;
  const cx = parts.reduce((a, c) => a + c.cx, 0) / parts.length;
  const cy = parts.reduce((a, c) => a + c.cy, 0) / parts.length;
  for (const c of parts) c.r = Math.hypot(c.cx - cx, c.cy - cy);
  const radius = (c: Part) => c.r ?? 0;
  const ordinate = (c: Part) => c.cy;
  const rings = cluster1d(parts, radius, gap);
  const rows = cluster1d(parts, ordinate, gap);
  // Un découpage juste a des groupes serrés ; entre deux découpages serrés, le
  // moins fragmenté gagne (des groupes d'un seul symbole ne prouvent rien).
  const extent = (groups: Part[][], key: (c: Part) => number) =>
    Math.max(...groups.map((g) => Math.max(...g.map(key)) - Math.min(...g.map(key))));
  const ringsTight = extent(rings, radius) <= size * 0.5;
  const rowsTight = extent(rows, ordinate) <= size * 0.5;
  const radial =
    ringsTight !== rowsTight
      ? ringsTight
      : rings.length !== rows.length
        ? rings.length < rows.length
        : spread(rings, radius) < spread(rows, ordinate);
  return { radial, cx, cy, groups: radial ? rings : rows };
}

/** Angle depuis midi, dans le sens horaire, en degrés [0, 360). */
const clock = (c: Part, cx: number, cy: number): number =>
  ((Math.atan2(c.cx - cx, cy - c.cy) * 180) / Math.PI + 360) % 360;

/** Symboles successifs identiques → un jeton compté. */
function toTokens(ids: readonly string[]): Token[] {
  const tokens: { symbol: string; count: number }[] = [];
  for (const id of ids) {
    const last = tokens[tokens.length - 1];
    if (last && last.symbol === id) last.count++;
    else tokens.push({ symbol: id, count: 1 });
  }
  return tokens;
}

/**
 * Un tour qui répète un motif s'écrit comme sur un patron : « *1 ms, 1 aug* x 6 »
 * plutôt que douze mailles à la suite. Plus petite période qui couvre tout le
 * tour au moins deux fois ; un motif d'une seule maille reste un compte (« 6 ms »).
 */
export function toGroups(ids: readonly string[]): Group[] {
  if (!ids.length) return [];
  for (let period = 2; period <= ids.length / 2; period++) {
    if (ids.length % period) continue;
    if (ids.every((id, i) => id === ids[i % period])) {
      const motif = ids.slice(0, period);
      // Un motif fait d'une seule maille répétée est déjà un simple compte.
      if (motif.every((id) => id === motif[0])) break;
      return [{ tokens: toTokens(motif), repeat: ids.length / period }];
    }
  }
  return [{ tokens: toTokens(ids), repeat: 1 }];
}

/**
 * Lit un diagramme. Les tours vont du centre vers l'extérieur, de midi dans
 * le sens horaire ; les rangs du bas vers le haut, de gauche à droite. Une
 * image sans symbole, ou trop bruitée pour être un diagramme, donne un
 * résultat vide plutôt qu'une exception.
 */
export function recognize(image: Pixels, sources: readonly TemplateSource[]): Recognition {
  const templates = buildTemplates(sources);
  if (!templates.length || !image.width || !image.height) return EMPTY;
  const boxes = components(binarize(image), MAX_COMPONENTS);
  if (!boxes?.length) return EMPTY;
  const parts = mergeNear(mergeNested(boxes));
  if (!parts.length) return EMPTY;

  const size = median(parts.map((c) => c.size));
  const first = layout(parts, size);

  // Passe 1 : tous les angles. Passe 2 : orientation attendue (radiale : vers
  // l'extérieur ; à plat : droite), à 20° près, gardée si elle vaut presque autant.
  const matches = new Map<Part, Match>();
  for (const c of parts) {
    const any = classify(c, templates, range(0, 350, 10));
    const expected = first.radial ? clock(c, first.cx, first.cy) : 0;
    const lo = Math.round(expected / 5) * 5 - 20;
    const near = classify(c, templates, range(lo, lo + 40, 5));
    matches.set(c, near.score >= any.score - 0.03 ? near : any);
  }

  // Le rayon et l'ordonnée se lisent au centre du carré de dessin, pas au centre de gravité.
  const byId = new Map(templates.map((t) => [t.id, t]));
  for (const c of parts) {
    const match = matches.get(c)!;
    const o = origin(c, byId.get(match.id)!, match.angle);
    c.cx = o.x;
    c.cy = o.y;
  }
  const lay = layout(parts, size);
  const ordered = lay.radial
    ? lay.groups.slice().sort((a, b) => (a[0].r ?? 0) - (b[0].r ?? 0))
    : lay.groups.slice().sort((a, b) => b[0].cy - a[0].cy);

  // Un anneau magique dessiné au centre n'est pas une maille : il devient le
  // « dans un cercle magique » du premier tour.
  const ring = lay.radial && ordered[0]?.every((c) => matches.get(c)!.id === 'magic-ring');
  if (ring) ordered.shift();

  const rounds = ordered.map((group, index): Round => {
    let sorted: Part[];
    if (lay.radial) {
      const shift = 180 / Math.max(group.length, 1) / 2;
      const at = (c: Part) => (clock(c, lay.cx, lay.cy) + shift) % 360;
      sorted = group.slice().sort((a, b) => at(a) - at(b));
    } else sorted = group.slice().sort((a, b) => a.cx - b.cx);
    return {
      kind: lay.radial ? 'round' : 'row',
      groups: toGroups(sorted.map((c) => matches.get(c)!.id)),
      ...(ring && index === 0 ? { into: 'magic-ring' as const } : {}),
    };
  });
  const scores = [...matches.values()].map((m) => m.score);
  return {
    rounds,
    symbols: scores.length,
    uncertain: scores.filter((s) => s < UNCERTAIN).length,
  };
}
