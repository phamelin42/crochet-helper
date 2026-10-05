/**
 * Fonctions pures de `check-redirects.mjs` : lire les redirections de
 * `vercel.json` et `netlify.toml` sous une même forme, et suivre une URL
 * jusqu'à sa destination. Testées dans `redirects.test.mjs`.
 */

/**
 * Règles de `vercel.json`, hors redirection de l'ancien domaine (conditionnée
 * par l'hôte, elle ne concerne pas les chemins de ce domaine). `/:path*` est
 * noté `/*` en source et `/:splat` en destination, comme chez Netlify.
 */
export function vercelRules(config) {
  return (config.redirects ?? [])
    .filter((rule) => !rule.has)
    .map((rule) => ({
      from: rule.source.replace(/\/:path\*$/, '/*'),
      to: rule.destination.replace(/\/:path\*$/, '/:splat'),
      status: rule.statusCode ?? (rule.permanent === false ? 307 : 308),
    }));
}

/**
 * Règles de `netlify.toml`, hors ancien domaine (URL absolue) et repli final
 * vers `index.html` (une réécriture en 200, pas une redirection).
 */
export function netlifyRules(toml) {
  return toml
    .split('[[redirects]]')
    .slice(1)
    .map((block) => ({
      from: block.match(/from\s*=\s*"([^"]*)"/)?.[1],
      to: block.match(/to\s*=\s*"([^"]*)"/)?.[1],
      status: Number(block.match(/status\s*=\s*(\d+)/)?.[1] ?? 301),
    }))
    .filter((rule) => rule.from && !/^https?:/.test(rule.from) && rule.status !== 200);
}

/** Destination de `path` par la première règle qui s'applique, ou `null`. */
export function applyRules(rules, path) {
  for (const rule of rules) {
    if (rule.from.endsWith('/*')) {
      const base = rule.from.slice(0, -2);
      if (path.startsWith(`${base}/`)) {
        return { rule, to: rule.to.replace(':splat', path.slice(base.length + 1)) };
      }
    } else if (rule.from === path) {
      return { rule, to: rule.to };
    }
  }
  return null;
}

/**
 * Ce qui ne va pas pour `path` : statut autre que 301, destination qui
 * redirige à son tour (chaîne), ou qui n'est pas une page pré-rendue.
 * `null` si aucune règle ne s'applique.
 */
export function redirectProblems(rules, path, isPage) {
  const hit = applyRules(rules, path);
  if (!hit) return null;
  const problems = [];
  if (hit.rule.status !== 301) problems.push(`statut ${hit.rule.status} au lieu de 301`);
  if (applyRules(rules, hit.to)) problems.push(`chaîne : ${hit.to} redirige à son tour`);
  else if (!isPage(hit.to)) problems.push(`${hit.to} n'est pas une page pré-rendue`);
  return { to: hit.to, problems };
}
