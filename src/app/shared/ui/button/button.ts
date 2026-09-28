import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Applique l'habillage Hanami à un bouton ou un lien natifs.
 *
 * Directive plutôt que composant : on garde le `<button>` réel, donc son type,
 * son état désactivé, sa sémantique clavier et ses attributs ARIA, sans avoir à
 * les reproduire. C'est le point d'entrée unique pour tout bouton du produit.
 */
@Directive({
  selector: 'button[filButton], a[filButton]',
  host: {
    '[class]': 'classes()',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('secondary', { alias: 'filButton' });
  /** Bouton carré ne contenant qu'une icône : impose un libellé accessible. */
  readonly iconOnly = input(false);
  /**
   * Icône seule sous 600 px, icône + libellé visible au-delà : le libellé
   * vient de `aria-label` (déjà requis pour l'accessibilité), affiché par
   * `.btn-icon-text::after` dans `hanami.css` — aucun texte dupliqué dans le
   * gabarit.
   */
  readonly iconText = input(false);
  readonly block = input(false);
  /** Grande cible « Précédente / Suivante » du lecteur. */
  readonly step = input(false);

  protected readonly classes = computed(() =>
    [
      'btn',
      `btn-${this.variant()}`,
      this.iconOnly() ? 'btn-icon' : '',
      this.iconText() ? 'btn-icon-text' : '',
      this.block() ? 'btn-block' : '',
      this.step() ? 'btn-step' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
}
