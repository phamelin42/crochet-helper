import { Component, input } from '@angular/core';

/**
 * Tuile de statistique : un intitulé, une valeur mise en avant, et des
 * commandes en pied. Utilisée pour les quatre compteurs du lecteur.
 */
@Component({
  selector: 'fil-tile',
  host: { class: 'tile' },
  template: `
    <h6>{{ label() }}</h6>
    <ng-content />
  `,
})
export class Tile {
  readonly label = input.required<string>();
}
