import { Component, input } from '@angular/core';

/**
 * Tuile de statistique : un intitulé, une valeur mise en avant, et des
 * commandes en pied. Utilisée pour les compteurs du lecteur.
 *
 * L'intitulé est un simple libellé (`<p>`), pas un titre : un `<h6>` posé sans
 * `<h1>` à `<h5>` avant lui casse l'ordre des titres. Quand la tuile est bien
 * un titre de section (les étapes de l'accueil), `heading` donne son niveau.
 */
@Component({
  selector: 'fil-tile',
  host: { class: 'tile' },
  template: `
    @if (heading() === 3) {
      <h3 class="tile-label">{{ label() }}</h3>
    } @else {
      <p class="tile-label">{{ label() }}</p>
    }
    <ng-content />
  `,
})
export class Tile {
  readonly label = input.required<string>();
  /** Niveau de titre de l'intitulé ; `null` : simple libellé. */
  readonly heading = input<3 | null>(null);
}
