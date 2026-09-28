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

/** Paire anglais / français d'une route, suffixe identique dans les deux langues. */
export function pairFor(families, route) {
  const family = familyFor(families, route);
  if (!family) return null;
  if (!family.sub) return [family.en, family.fr];
  if (route.startsWith(`${family.en}/`)) {
    return [route, `${family.fr}${route.slice(family.en.length)}`];
  }
  return [`${family.en}${route.slice(family.fr.length)}`, route];
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
