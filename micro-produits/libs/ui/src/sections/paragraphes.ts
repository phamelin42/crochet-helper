import { Component, computed, input } from '@angular/core';
import { paragraphes } from '@mp/core';

/** Texte brut rendu en paragraphes, jamais en HTML. */
@Component({
  selector: 'mp-paragraphes',
  template: `
    @for (p of liste(); track $index) {
      <p>{{ p }}</p>
    }
  `,
})
export class Paragraphes {
  readonly texte = input.required<string>();
  protected readonly liste = computed(() => paragraphes(this.texte()));
}
