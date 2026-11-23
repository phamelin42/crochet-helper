import { Component, input } from '@angular/core';

/**
 * Mention de non-affiliation et d'attribution, visible sur toute page qui
 * montre des données de Ravelry (ADR-004, licence 1e). Aucun logo Ravelry.
 */
@Component({
  selector: 'fil-ravelry-note',
  template: `<p class="ravelry-note">{{ text() }}</p>`,
})
export class RavelryNote {
  readonly text = input.required<string>();
}
