import { Component, input } from '@angular/core';
import { Paragraphes } from './paragraphes';

@Component({
  selector: 'mp-hero',
  imports: [Paragraphes],
  template: `
    <section class="hero">
      <h1>{{ titre() }}</h1>
      <div class="lead"><mp-paragraphes [texte]="chapo()" /></div>
    </section>
  `,
})
export class Hero {
  readonly titre = input.required<string>();
  readonly chapo = input.required<string>();
}
