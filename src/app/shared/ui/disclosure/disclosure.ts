import { Component, input, model } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Section repliable bâtie sur `<details>` : le contenu reste dans le DOM, donc
 * indexable et trouvable à la recherche navigateur même replié.
 */
@Component({
  selector: 'fil-disclosure',
  imports: [Icon],
  template: `
    <details [class]="variant()" [open]="open()" (toggle)="open.set($any($event.target).open)">
      <summary>
        @if (variant() === 'mats') {
          <fil-icon name="chevron" />
        }
        <span>{{ label() }}</span>
        @if (state()) {
          <span class="state">{{ state() }}</span>
        }
        @if (variant() === 'import') {
          <span class="chev"><fil-icon name="chevron" /></span>
        }
      </summary>
      <ng-content />
    </details>
  `,
})
export class Disclosure {
  readonly label = input.required<string>();
  readonly open = model(false);
  readonly state = input('');
  readonly variant = input<'import' | 'mats'>('import');
}
