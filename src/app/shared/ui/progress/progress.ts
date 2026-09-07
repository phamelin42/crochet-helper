import { Component, input } from '@angular/core';

/** Barre de progression accessible (0–100). */
@Component({
  selector: 'fil-progress',
  host: {
    class: 'progress',
    role: 'progressbar',
    '[attr.aria-valuenow]': 'Math.round(value())',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-label]': 'label()',
  },
  template: `<i [style.width.%]="value()"></i>`,
})
export class Progress {
  protected readonly Math = Math;
  readonly value = input.required<number>();
  readonly label = input<string>('');
}
