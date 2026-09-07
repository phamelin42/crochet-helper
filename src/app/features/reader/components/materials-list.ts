import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { ReaderStore } from '../state/reader-store';
import { GlossaryText } from './glossary-text';

/** Section « Matériel » repliable, alimentée par le découpage du patron. */
@Component({
  selector: 'fil-materials-list',
  imports: [Disclosure, GlossaryText],
  template: `
    <fil-disclosure [label]="t('ui.mats')" variant="mats">
      <ul>
        @for (item of store.materials(); track $index) {
          <li><fil-glossary-text [text]="item" /></li>
        }
      </ul>
    </fil-disclosure>
  `,
})
export class MaterialsList {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);
  protected t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);
}
