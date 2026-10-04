/**
 * Fonctions pures de `generate-sitemap.mjs`, isolées pour être testées sans
 * dépendre d'un build (`tools/sitemap.test.mjs`).
 */

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

/** `<loc>` d'un sitemap, dans l'ordre. */
export function locsOf(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

/** URL présentes dans un sitemap et pas dans l'autre, triées. */
export function diffLocs(published, generated) {
  const a = new Set(published);
  const b = new Set(generated);
  return {
    onlyPublished: [...a].filter((u) => !b.has(u)).sort(),
    onlyGenerated: [...b].filter((u) => !a.has(u)).sort(),
  };
}
