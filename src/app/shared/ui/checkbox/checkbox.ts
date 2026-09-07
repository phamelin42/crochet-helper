import { Component, input, model } from '@angular/core';
import { Icon } from '../icon/icon';

/** Case à cocher habillée, construite autour d'un `<input type="checkbox">`. */
@Component({
  selector: 'fil-checkbox',
  imports: [Icon],
  template: `
    <label class="check">
      <input
        type="checkbox"
        [checked]="checked()"
        [disabled]="disabled()"
        (change)="checked.set($any($event.target).checked)"
      />
      <span class="box"><fil-icon name="check" /></span>
      <span>{{ label() }}</span>
    </label>
  `,
})
export class Checkbox {
  readonly checked = model.required<boolean>();
  readonly label = input.required<string>();
  readonly disabled = input(false);
}
