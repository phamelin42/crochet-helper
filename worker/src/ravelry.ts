/**
 * Tout ce qui dépend des noms de l'API Ravelry vit ici (ADR-004) : construire
 * l'URL amont depuis une demande déjà validée, réduire la réponse à nos champs.
 *
 * La documentation collée par Phil s'arrête avant `patterns/search` : chaque nom
 * marqué « à confirmer (doc non lue) » vient de clients tiers, pas de la doc.
 */

export const BASE = 'https://api.ravelry.com';
export const CRAFTS = ['crochet', 'knitting'] as const;
export type Craft = (typeof CRAFTS)[number];

const PAGE_TAILLE = 20;
const MAX_CARTES = 40;
const MAX_PHOTOS = 12;
const MAX_DESCRIPTION = 8000;
const MAX_NOM = 200;
const MAX_DESIGNER = 100;
const MAX_COURT = 60;
const MAX_URL = 600;

export interface CartePatron {
  id: number;
  nom: string;
  designer: string;
  vignette: string | null;
  lien: string;
}

export interface Liste {
  patrons: CartePatron[];
  page: number;
  pages: number;
}

export interface Fiche {
  id: number;
  nom: string;
  designer: string;
  description: string;
  photos: string[];
  craft: string | null;
  poidsFil: string | null;
  difficulte: number | null;
  telechargement: string | null;
  source: string | null;
  lien: string;
}

/** URL de recherche. À confirmer (doc non lue) : `query`, `craft`, `availability=free`, `photo=yes`, `page_size`. */
export function urlRecherche(demande: { q: string; craft: Craft; page: number }): string {
  const u = new URL(`${BASE}/patterns/search.json`);
  u.searchParams.set('query', demande.q);
  u.searchParams.set('craft', demande.craft);
  u.searchParams.set('availability', 'free');
  u.searchParams.set('photo', 'yes');
  u.searchParams.set('page', String(demande.page));
  u.searchParams.set('page_size', String(PAGE_TAILLE));
  return u.toString();
}

/** URL d'une fiche : `GET /patterns/{id}.json` (établi par la doc lue). */
export function urlFiche(id: number): string {
  return `${BASE}/patterns/${id}.json`;
}

type Objet = Record<string, unknown>;

const objet = (v: unknown): Objet | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Objet) : null;

const texte = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, max) : null;

/** https seulement, jamais `javascript:` ni `http:`. */
function urlHttps(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > MAX_URL) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Images : seulement les hôtes de la CSP de l'app (`img-src`, ADR-004). */
function urlImage(v: unknown): string | null {
  const u = urlHttps(v);
  if (u === null) return null;
  const h = new URL(u).hostname;
  const ok = (d: string) => h === d || h.endsWith(`.${d}`);
  return ok('ravelrycache.com') || ok('ravelry.com') ? u : null;
}

/** Page du patron sur Ravelry. `permalink` : à confirmer (doc non lue). */
function lienRavelry(p: Objet): string | null {
  const perma = texte(p['permalink'], 200);
  return perma !== null && /^[a-z0-9][a-z0-9._-]*$/i.test(perma)
    ? `https://www.ravelry.com/patterns/library/${perma}`
    : null;
}

/** `pattern_author.name` ou `designer.name` : à confirmer (doc non lue). */
function nomDesigner(p: Objet): string {
  const a = objet(p['pattern_author']) ?? objet(p['designer']);
  return texte(a?.['name'], MAX_DESIGNER) ?? '';
}

/** Taille de photo : `small_url`, `medium_url`, `square_url` à confirmer (doc non lue). */
function photoDe(v: unknown): string | null {
  const ph = objet(v);
  if (ph === null) return null;
  for (const taille of ['small_url', 'medium_url', 'medium2_url', 'square_url']) {
    const u = urlImage(ph[taille]);
    if (u !== null) return u;
  }
  return null;
}

const ENTITES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * HTML de tiers → texte sans balise. Les balises sont retirées AVANT de décoder
 * les entités : `&lt;b&gt;` reste un texte, jamais une balise, et l'app ne
 * reçoit de toute façon que du texte.
 */
export function texteBrut(html: string): string {
  const sans = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|tr)\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '');
  return sans
    .replace(/&(#\d{1,6}|#x[0-9a-f]{1,5}|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
        return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
      }
      return ENTITES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Réponse de recherche → cartes. `patterns`, `paginator` : à confirmer (doc non lue) ; `paginator` est dans la doc lue. */
export function reduireListe(brut: unknown): Liste | null {
  const r = objet(brut);
  if (r === null || !Array.isArray(r['patterns'])) return null;
  const pag = r['paginator'] === undefined ? {} : objet(r['paginator']);
  if (pag === null) return null;

  const patrons: CartePatron[] = [];
  for (const element of r['patterns']) {
    const p = objet(element);
    // Gratuit même si le filtre amont échoue (`free` : à confirmer, doc non lue).
    if (p === null || p['free'] !== true) continue;
    const id = p['id'];
    const nom = texte(p['name'], MAX_NOM);
    const lien = lienRavelry(p);
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) continue;
    if (nom === null || lien === null) continue;
    patrons.push({
      id,
      nom,
      designer: nomDesigner(p),
      vignette: photoDe(p['first_photo']),
      lien,
    });
    if (patrons.length >= MAX_CARTES) break;
  }
  const page = Number(pag['page']);
  const pages = Number(pag['page_count']);
  return {
    patrons,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pages: Number.isInteger(pages) && pages > 0 ? pages : 1,
  };
}

/** Nom d'un champ qui peut être une chaîne ou un objet `{ name }` (à confirmer, doc non lue). */
function nomOuTexte(v: unknown): string | null {
  return texte(v, MAX_COURT) ?? texte(objet(v)?.['name'], MAX_COURT);
}

/** Réponse de fiche → champs utiles. `pattern`, `notes`, `notes_html`, `photos`, etc. : à confirmer (doc non lue). */
export function reduireFiche(brut: unknown): Fiche | null {
  const p = objet(objet(brut)?.['pattern']);
  if (p === null || p['free'] !== true) return null;
  const id = p['id'];
  const nom = texte(p['name'], MAX_NOM);
  const lien = lienRavelry(p);
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return null;
  if (nom === null || lien === null) return null;

  const notes =
    texte(p['notes'], MAX_DESCRIPTION * 2) ?? texte(p['notes_html'], MAX_DESCRIPTION * 2);
  const photos: string[] = [];
  if (Array.isArray(p['photos'])) {
    for (const ph of p['photos']) {
      const u = photoDe(ph);
      if (u !== null && !photos.includes(u)) photos.push(u);
      if (photos.length >= MAX_PHOTOS) break;
    }
  }
  const diff = Number(p['difficulty_average']);
  return {
    id,
    nom,
    designer: nomDesigner(p),
    description: notes === null ? '' : texteBrut(notes).slice(0, MAX_DESCRIPTION),
    photos,
    craft: nomOuTexte(p['craft']),
    poidsFil: nomOuTexte(p['yarn_weight']),
    difficulte: Number.isFinite(diff) && diff > 0 ? Math.round(diff * 10) / 10 : null,
    // `download_location.url` et `url` : à confirmer (doc non lue).
    telechargement: urlHttps(objet(p['download_location'])?.['url']),
    source: urlHttps(p['url']),
    lien,
  };
}
