import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Applique l'habillage Nocturne à un bouton ou un lien natifs.
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
  readonly block = input(false);
  /** Grande cible « Précédente / Suivante » du lecteur. */
  readonly step = input(false);

  protected readonly classes = computed(() =>
    [
      'btn',
      `btn-${this.variant()}`,
      this.iconOnly() ? 'btn-icon' : '',
      this.block() ? 'btn-block' : '',
      this.step() ? 'btn-step' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
}
