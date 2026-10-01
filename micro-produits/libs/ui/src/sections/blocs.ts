import { Component, input } from '@angular/core';
import { Bloc } from '@mp/core';
import { Paragraphes } from './paragraphes';

/** Une section titrée faite de blocs (explication, exemples, aide). */
@Component({
  selector: 'mp-blocs',
  imports: [Paragraphes],
  template: `
    <section class="blocs" [attr.aria-labelledby]="id()">
      <h2 [id]="id()">{{ titre() }}</h2>
      @for (bloc of blocs(); track bloc.titre) {
        <h3>{{ bloc.titre }}</h3>
        <mp-paragraphes [texte]="bloc.texte" />
      }
    </section>
  `,
})
export class Blocs {
  readonly titre = input.required<string>();
  readonly id = input.required<string>();
  readonly blocs = input.required<readonly Bloc[]>();
}
