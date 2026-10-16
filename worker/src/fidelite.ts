const NOMBRE = /\d+/g;
/** Libellé d'étape en début de ligne : ses numéros sont ceux de l'IA, pas du patron. */
const LIBELLE_ETAPE = /^[ \t]*(?:step|[ée]tape)[ \t]+\d+[ \t]*[:.)]/gim;
/** En dessous, une réponse est refusée quoi qu'elle contienne. */
const RATIO_PLANCHER = 0.1;
/** En dessous, elle n'est acceptée que si elle garde presque tous les nombres. */
const RATIO_MINIMAL = 0.4;
const COUVERTURE_MINIMALE = 0.9;

/**
 * Refuse une réponse qui a perdu ou inventé quelque chose : sauter un rang
 * ruine un ouvrage, un patron mal remis en forme vaut moins que le découpage
 * habituel.
 */
export function fidele(entree: string, sortie: string): boolean {
  return controler(entree, sortie) === null;
}

/**
 * Pourquoi une réponse est refusée, en un code court ; `null` si elle est
 * fidèle. Jamais un extrait du texte : seulement la nature du défaut, un
 * pourcentage ou quelques nombres, pour comprendre un refus sans rien stocker.
 *
 * Une réponse très courte peut être juste : une notice qui répète le patron en
 * quatre langues, dont l'IA ne garde qu'une. Elle garde alors presque tous les
 * nombres distincts de l'original (chaque traduction les répète), ce qu'un
 * résumé ne fait pas. La longueur seule ne distingue pas les deux cas.
 */
export function controler(entree: string, sortie: string): string | null {
  if (sortie.trim() === '') return 'vide';

  const connus = new Set(entree.match(NOMBRE) ?? []);
  const enSortie = new Set(sortie.replace(LIBELLE_ETAPE, '').match(NOMBRE) ?? []);
  const inventes = [...enSortie].filter((n) => !connus.has(n));
  if (inventes.length) return `nombres:${inventes.slice(0, 5).join(',')}`;

  const ratio = sortie.length / entree.length;
  if (ratio < RATIO_PLANCHER) return `trop-court:${Math.round(100 * ratio)}%`;
  if (ratio < RATIO_MINIMAL) {
    const gardes = [...connus].filter((n) => enSortie.has(n)).length;
    const couverture = connus.size ? gardes / connus.size : 0;
    if (couverture < COUVERTURE_MINIMALE) {
      return `trop-court:${Math.round(100 * ratio)}%,nombres-gardes:${Math.round(100 * couverture)}%`;
    }
  }
  return null;
}
