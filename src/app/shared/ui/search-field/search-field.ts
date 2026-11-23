import { Component, input, model, output } from '@angular/core';
import { Button } from '../button/button';
import { InputField } from '../field/input';

let nextId = 0;

/**
 * Champ de recherche avec son bouton, dans un vrai `<form role="search">` : la
 * recherche part au bouton ou à Entrée, jamais à chaque frappe. Le libellé est
 * toujours visible.
 */
@Component({
  selector: 'fil-search-field',
  imports: [Button, InputField],
  template: `
    <form class="search-field" role="search" (submit)="submit($event)">
      <div class="field">
        <label [for]="id">{{ label() }}</label>
        <div class="search-row">
          <input
            filInput
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            spellcheck="false"
            [id]="id"
            [attr.maxlength]="maxLength()"
            [attr.placeholder]="placeholder() || null"
            [value]="value()"
            (input)="value.set($any($event.target).value)"
          />
          <button type="submit" filButton="primary" [disabled]="busy()">
            {{ buttonLabel() }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class SearchField {
  /** Texte saisi : liaison bidirectionnelle, pour garder la saisie quand la page se recharge. */
  readonly value = model('');
  readonly label = input.required<string>();
  readonly buttonLabel = input.required<string>();
  readonly placeholder = input('');
  readonly maxLength = input(100);
  /** Une recherche est en cours : le bouton se grise, la saisie reste possible. */
  readonly busy = input(false);
  /** La personne lance la recherche (bouton ou Entrée). */
  readonly submitted = output<string>();

  protected readonly id = `fil-search-${nextId++}`;

  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.emit(this.value().trim());
  }
}
