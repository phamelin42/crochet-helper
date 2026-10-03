import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { ReaderStore } from '../state/reader-store';

// Les textes vivent ici et non dans `reader-copy.ts` : la question n'existe
// qu'après un import, elle ne doit pas peser sur le premier affichage.
const COPY = {
  fr: {
    title: 'Comment voulez-vous suivre ce patron ?',
    text: 'Étapes écrites',
    chart: 'Diagramme',
    remember: 'Retenir mon choix',
  },
  en: {
    title: 'How do you want to follow this pattern?',
    text: 'Written steps',
    chart: 'Chart',
    remember: 'Remember my choice',
  },
} as const;

/**
 * La question posée après l'import d'un patron dont une étape au moins se
 * dessine. Elle ne porte que sur le projet qui vient d'être créé ; fermer sans
 * choisir laisse le texte et ne retient rien. Chargée par `import()` depuis
 * `ViewChoiceSlot`.
 */
@Component({
  selector: 'fil-view-choice-dialog',
  imports: [Button, Checkbox, Dialog],
  template: `
    @if (store.viewChoice()) {
      <fil-dialog [open]="true" (openChange)="!$event && store.dismissViewChoice()" [label]="c.title">
        <h2 class="dialog-title">{{ c.title }}</h2>
        <fil-checkbox [label]="c.remember" [(checked)]="remember" />
        <div class="dialog-actions">
          <button type="button" filButton="secondary" (click)="choose('text')">
            {{ c.text }}
          </button>
          <button type="button" filButton="primary" (click)="choose('chart')">
            {{ c.chart }}
          </button>
        </div>
      </fil-dialog>
    }
  `,
})
export class ViewChoiceDialog {
  protected readonly store = inject(ReaderStore);
  protected readonly c = COPY[inject(I18nService).locale()];
  protected readonly remember = signal(false);

  protected choose(view: 'text' | 'chart'): void {
    this.store.chooseView(view, this.remember());
    this.remember.set(false);
  }
}
