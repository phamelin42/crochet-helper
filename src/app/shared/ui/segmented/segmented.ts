import { Component, input, model } from '@angular/core';

export interface SegmentedOption {
  readonly value: number;
  readonly label: string;
}

/**
 * Groupe de boutons radio en segments. Repose sur de vrais `<input type=radio>`
 * partageant un `name`, donc la navigation aux flèches et l'annonce « n sur m »
 * des lecteurs d'écran fonctionnent sans code.
 */
@Component({
  selector: 'fil-segmented',
  template: `
    <div class="seg" role="radiogroup" [attr.aria-label]="label()">
      @for (option of options(); track option.value) {
        <label class="seg-opt">
          <input
            type="radio"
            [name]="name()"
            [value]="option.value"
            [checked]="option.value === selected()"
            (change)="selected.set(option.value)"
          />
          {{ option.label }}
        </label>
      }
    </div>
  `,
})
export class Segmented {
  readonly options = input.required<readonly SegmentedOption[]>();
  readonly selected = model.required<number>();
  readonly name = input('fil-segmented');
  readonly label = input('');
}
