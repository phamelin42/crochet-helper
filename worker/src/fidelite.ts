const NOMBRE = /\d+/g;
const RATIO_MINIMAL = 0.4;

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
 */
export function controler(entree: string, sortie: string): string | null {
  if (sortie.trim() === '') return 'vide';
  if (sortie.length < entree.length * RATIO_MINIMAL) {
    return `trop-court:${Math.round((100 * sortie.length) / entree.length)}%`;
  }
  const connus = new Set(entree.match(NOMBRE) ?? []);
  const inventes = [...new Set((sortie.match(NOMBRE) ?? []).filter((n) => !connus.has(n)))];
  return inventes.length ? `nombres:${inventes.slice(0, 5).join(',')}` : null;
}
