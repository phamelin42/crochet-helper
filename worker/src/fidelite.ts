const NOMBRE = /\d+/g;
const RATIO_MINIMAL = 0.4;

/**
 * Refuse une réponse qui a perdu ou inventé quelque chose : sauter un rang
 * ruine un ouvrage, un patron mal remis en forme vaut moins que le découpage
 * habituel.
 */
export function fidele(entree: string, sortie: string): boolean {
  if (sortie.trim() === '') return false;
  if (sortie.length < entree.length * RATIO_MINIMAL) return false;
  const connus = new Set(entree.match(NOMBRE) ?? []);
  return (sortie.match(NOMBRE) ?? []).every((n) => connus.has(n));
}
