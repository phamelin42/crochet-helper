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
  return target.closest(INTERACTIVE) !== null || dialogIsOpen(target);
}

/** Une boîte de dialogue ouverte (le navigateur la ferme lui-même à Échap). */
export function dialogIsOpen(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  const doc = target instanceof Document ? target : target.ownerDocument;
  return doc?.querySelector('dialog[open]') != null;
}
