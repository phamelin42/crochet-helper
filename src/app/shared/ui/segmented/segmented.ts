import { Component, input, model } from '@angular/core';

export interface SegmentedOption {
  readonly value: number;
  readonly label: string;
  /** Option grisée : visible, mais pas choisissable. */
  readonly disabled?: boolean;
}

/**
 * Groupe de boutons radio en segments. Repose sur de vrais `<input type=radio>`
 * partageant un `name`, donc la navigation aux flèches et l'annonce « n sur m »
 * des lecteurs d'écran fonctionnent sans code.
 */
@Component({
  selector: 'fil-segmented',
  template: `
    <div
      class="seg"
      role="radiogroup"
      [attr.aria-label]="labelledBy() ? null : label()"
      [attr.aria-labelledby]="labelledBy() || null"
    >
      @for (option of options(); track option.value) {
        <label class="seg-opt">
          <input
            type="radio"
            [name]="name()"
            [value]="option.value"
            [checked]="option.value === selected()"
            [disabled]="option.disabled ?? false"
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
  /** Nom du groupe pour un lecteur d'écran, quand aucun libellé n'est visible. */
  readonly label = input('');
  /** `id` d'un libellé visible du groupe : il remplace alors `label`. */
  readonly labelledBy = input('');
}
