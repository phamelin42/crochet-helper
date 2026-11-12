/** Éléments qui portent déjà un geste au clavier (Espace, Entrée, flèches, défilement). */
const INTERACTIVE =
  'button, a, summary, input, textarea, select, [role="button"], [contenteditable]:not([contenteditable="false"])';

/**
 * Vrai quand une touche appartient à la cible ou à une boîte de dialogue
 * ouverte : les raccourcis du lecteur (étape suivante, répétitions) ne doivent
 * alors ni agir ni empêcher le geste natif. Pure : la cible vient de
 * l'événement, aucun accès global.
 */
export function keyBelongsToTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest(INTERACTIVE) !== null || dialogIsOpen(target) || isScrollingRegion(target);
}

/**
 * Une étape trop longue défile dans son cadre (fiche 59) et se focalise au
 * clavier : Espace, PageBas et les flèches la font défiler, ils n'avancent pas
 * l'étape. Quand elle tient en entier, rien à défiler : les raccourcis restent.
 */
function isScrollingRegion(element: Element): boolean {
  return (
    element.getAttribute('tabindex') === '0' &&
    element.scrollHeight > element.clientHeight &&
    ['auto', 'scroll'].includes(getComputedStyle(element).overflowY)
  );
}

/** Une boîte de dialogue ouverte (le navigateur la ferme lui-même à Échap). */
export function dialogIsOpen(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  const doc = target instanceof Document ? target : target.ownerDocument;
  return doc?.querySelector('dialog[open]') != null;
}
