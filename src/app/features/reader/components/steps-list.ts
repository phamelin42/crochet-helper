import { Component, computed, inject, output, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { InputField } from '../../../shared/ui/field/input';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';
import { ShareActions } from './share-actions';

/** Longueur d'un début de texte affiché par entrée, en caractères. */
const EXCERPT_LENGTH = 60;

/**
 * Liste repliable de toutes les étapes de la pièce en cours, un champ pour
 * sauter directement à un numéro, et les actions de partage — un seul endroit
 * pour retrouver son rang après une pause (fiche 25).
 */
@Component({
  selector: 'fil-steps-list',
  imports: [Button, Disclosure, InputField, ShareActions],
  template: `
    <fil-disclosure [label]="label()" variant="mats" [(open)]="open">
      <ol class="steps-list">
        @for (step of store.steps(); track $index) {
          <li>
            <button
              type="button"
              filButton="ghost"
              class="steps-item btn-block"
              [class.done]="isDone($index)"
              [attr.aria-current]="isCurrent($index) ? 'step' : null"
              (click)="jump($index + 1, 'list')"
            >
              <span class="steps-item-label">{{ step.label || $index + 1 }}</span>
              <span class="steps-item-excerpt">{{ excerpt(step.body) }}</span>
            </button>
          </li>
        }
      </ol>

      <div class="field">
        <label for="steps-goto-field">{{ t('ui.goToStepLabel') }}</label>
        <div class="import-actions">
          <input
            #gotoField
            filInput
            type="number"
            id="steps-goto-field"
            min="1"
            [attr.max]="store.stepCount()"
          />
          <button type="button" filButton="secondary" (click)="jumpFromField(gotoField.value)">
            {{ t('ui.go') }}
          </button>
        </div>
      </div>

      <fil-share-actions (changePattern)="changePattern.emit()" />
    </fil-disclosure>
  `,
})
export class StepsList {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  /** Émis après un saut réussi : la page parente ramène le focus sur l'étape. */
  readonly jumped = output<void>();
  readonly changePattern = output<void>();

  protected readonly open = signal(false);

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  protected readonly label = computed(() => {
    const name = this.store.piece()?.name;
    return name ? `${this.t('ui.stepsListLabel')} — ${name}` : this.t('ui.stepsListLabel');
  });

  protected isCurrent(index: number): boolean {
    return index === this.store.stepIndex();
  }

  protected isDone(index: number): boolean {
    return this.store.done()[`${this.store.pieceIndex()}:${index}`] === true;
  }

  protected excerpt(body: string): string {
    const trimmed = body.trim();
    return trimmed.length > EXCERPT_LENGTH ? `${trimmed.slice(0, EXCERPT_LENGTH)}…` : trimmed;
  }

  protected jump(oneBased: number, origin: 'list' | 'field'): void {
    this.store.goTo(oneBased, origin);
    this.open.set(false);
    this.jumped.emit();
  }

  protected jumpFromField(value: string): void {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    this.jump(parsed, 'field');
  }
}
