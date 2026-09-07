import { Directive } from '@angular/core';

/** Habillage Nocturne d'un champ de saisie natif. */
@Directive({
  selector: 'input[filInput], textarea[filInput], select[filInput]',
  host: { class: 'input' },
})
export class InputField {}
