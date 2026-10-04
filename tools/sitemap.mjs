/**
 * Fonctions pures de `generate-sitemap.mjs`, isolées pour être testées sans
 * dépendre d'un vrai dépôt Git ni d'un build (`tools/sitemap.test.mjs`).
 */
import { execFileSync } from 'node:child_process';

/** Une famille par clé de `route-paths.json`, chemin français déjà préfixé de `/fr`. */
export function familiesFrom(routePaths) {
  return Object.entries(routePaths).map(([key, { en, fr }]) => ({
    key,
    en,
    fr: fr === '/' ? '/fr' : `/fr${fr}`,
  }));
}

/** Famille d'une route, sous-page (`/glossary/sc`) ou page de la famille elle-même. */
export function familyFor(families, route) {
  for (const family of families) {
    if (route === family.en || route === family.fr) return { ...family, sub: false };
    if (family.en === '/') continue;
    if (route.startsWith(`${family.en}/`) || route.startsWith(`${family.fr}/`)) {
      return { ...family, sub: true };
    }
  }
  return null;
}

/**
 * Chemins source dont dépend le `lastmod` d'une route. Les pages-abréviation
 * du glossaire viennent du moteur partagé (`glossaryTermSources`), pas de la
 * page de liste : ce sont deux familles de sources distinctes pour une seule
 * clé `route-paths.json`.
 */
export function sourcesFor(families, sourcePaths, glossaryTermSources, route) {
  const family = familyFor(families, route);
  if (!family) return null;
  if (family.key === 'glossary' && family.sub) return glossaryTermSources;
  return sourcePaths[family.key] ?? null;
}

/** `run` s'injecte en test pour ne pas dépendre du vrai dépôt. */
export function isShallowRepository(run = execFileSync) {
  try {
    return (
      run('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() === 'true'
    );
  } catch {
    return true;
  }
}

/**
 * Date du dernier commit sur `sources`, ou `null` si elle est inconnaissable
 * (pas de source pour la route, historique superficiel, `git` absent) — jamais
 * la date du jour : un `lastmod` toujours égal à aujourd'hui n'est pas un
 * signal, Google l'ignore.
 */
export function lastmodFor(sources, run = execFileSync) {
  if (!sources) return null;
  try {
    const date = run('git', ['log', '-1', '--format=%cs', '--', ...sources], {
      encoding: 'utf8',
    }).trim();
    return date || null;
  } catch {
    return null;
  }
}

/**
 * Canonique et hreflang tels que la page les déclare dans son `<head>`. Le
 * sitemap les recopie au lieu de les recalculer : il ne peut plus annoncer une
 * autre chaîne que la page (c'est arrivé : `https://patternreader.com/` dans
 * `<loc>`, `https://patternreader.com` dans les hreflang).
 */
export function linksOf(html) {
  const head = html.slice(0, html.indexOf('</head>') + 1 || undefined);
  const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  let canonical = null;
  const alternates = [];
  for (const [tag] of head.matchAll(/<link\s[^>]*>/g)) {
    const rel = attr(tag, 'rel');
    if (rel === 'canonical') canonical = attr(tag, 'href') ?? null;
    if (rel === 'alternate' && attr(tag, 'hreflang')) {
      alternates.push({ hreflang: attr(tag, 'hreflang'), href: attr(tag, 'href') });
    }
  }
  return { canonical, alternates };
}

/**
 * Ce qui empêche une page d'entrer au sitemap telle quelle : canonique absente
 * ou différente de son `<loc>`, hreflang qui ne se cite pas lui-même avec la
 * même chaîne, x-default manquant. Liste vide : la page est cohérente.
 */
export function linkProblems(loc, locale, { canonical, alternates }) {
  const problems = [];
  if (canonical !== loc) problems.push(`canonique ${canonical ?? 'absente'} ≠ ${loc}`);
  const self = alternates.find((a) => a.hreflang === locale);
  if (self?.href !== loc) problems.push(`hreflang ${locale} ${self?.href ?? 'absent'} ≠ ${loc}`);
  if (!alternates.some((a) => a.hreflang === 'x-default')) problems.push('x-default absent');
  return problems;
}
