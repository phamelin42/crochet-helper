/**
 * Fonctions pures de `check-seo.mjs` : ce que le HTML pré-rendu d'une page
 * indexable doit porter, sans JavaScript. Testées dans `seo.test.mjs`.
 */
import { linksOf } from './sitemap.mjs';
import { decodeEntities, visibleText } from './structured-data.mjs';

export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 110;
export const DESCRIPTION_MAX = 160;
/** En dessous, le contenu principal n'est pas dans le HTML servi (rendu côté client). */
export const MAIN_WORDS_MIN = 100;

const decode = decodeEntities;

/** Ce qu'une page déclare dans son `<head>` et montre dans son `<main>`. */
export function seoOf(html) {
  const head = html.slice(0, html.indexOf('</head>'));
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? '';
  return {
    title: decode(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
    description: decode(head.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''),
    robots: head.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? null,
    h1: (html.match(/<h1[\s>]/g) ?? []).length,
    mainWords: visibleText(`<body>${main}</body>`)
      .split(' ')
      .filter((word) => /[\p{L}\p{N}]/u.test(word)).length,
    ...linksOf(html),
  };
}

/**
 * Écarts d'une page indexable `loc`. `alternatesOf(url)` rend les hreflang
 * déclarés par une autre page du site (réciprocité).
 */
export function seoProblems(loc, seo, alternatesOf) {
  const problems = [];
  if (seo.h1 !== 1) problems.push(`${seo.h1} h1 au lieu d'un`);
  if (!seo.title) problems.push('titre absent');
  else if (seo.title.length > TITLE_MAX)
    problems.push(`titre de ${seo.title.length} caractères (> ${TITLE_MAX})`);
  const d = seo.description.length;
  if (d < DESCRIPTION_MIN || d > DESCRIPTION_MAX) {
    problems.push(`description de ${d} caractères (${DESCRIPTION_MIN} à ${DESCRIPTION_MAX})`);
  }
  if (!seo.robots?.startsWith('index')) problems.push(`robots « ${seo.robots ?? 'absent'} »`);
  if (seo.canonical !== loc) problems.push(`canonique ${seo.canonical} ≠ ${loc}`);
  const langs = seo.alternates
    .map((a) => a.hreflang)
    .sort()
    .join(',');
  if (langs !== 'en,fr,x-default') problems.push(`hreflang ${langs}`);
  for (const { hreflang, href } of seo.alternates) {
    if (hreflang === 'x-default' || href === loc) continue;
    const back = alternatesOf(href);
    if (!back) problems.push(`hreflang ${hreflang} → ${href} : page absente du sitemap`);
    else if (!back.some((a) => a.href === loc))
      problems.push(`hreflang ${hreflang} → ${href} ne renvoie pas ici`);
  }
  if (seo.mainWords < MAIN_WORDS_MIN) problems.push(`${seo.mainWords} mots dans <main>`);
  return problems;
}

/** Chemins internes des liens `<a href>` d'une page, sans ancre ni paramètre. */
export function linksFrom(html) {
  return [...html.matchAll(/<a\s[^>]*href="(\/[^"#?]*)/g)].map((m) => m[1].replace(/(.)\/$/, '$1'));
}

/**
 * Nombre de clics depuis `start` pour chaque chemin atteint, en suivant les
 * liens de `linksOf(chemin)` (`null` : pas une page).
 */
export function clickDepths(start, linksOf) {
  const depth = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const path = queue.shift();
    for (const next of linksOf(path) ?? []) {
      if (depth.has(next)) continue;
      depth.set(next, depth.get(path) + 1);
      queue.push(next);
    }
  }
  return depth;
}
