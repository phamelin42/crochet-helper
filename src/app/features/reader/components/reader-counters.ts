import { Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { Button } from '../../../shared/ui/button/button';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { Icon } from '../../../shared/ui/icon/icon';
import { Tile } from '../../../shared/ui/tile/tile';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';

/**
 * Avancement global et chronomètre de la session. Le compteur de répétitions,
 * lui, vit dans `StepView` (fiche 24) : juste sous l'étape, la commande la
 * plus utilisée crochet en main.
 */
@Component({
  selector: 'fil-reader-counters',
  imports: [Button, Checkbox, DurationPipe, Icon, Tile],
  host: { class: 'meter' },
  template: `
    <fil-tile [label]="t('ui.doneLabel')">
      <div class="big">
        {{ store.doneCount() }}<span class="sub"> / {{ store.total() }}</span>
      </div>
      <div class="row">
        <fil-checkbox
          [label]="t('ui.done')"
          [checked]="store.isDone()"
          (checkedChange)="store.setDone($event)"
          [disabled]="!store.step()"
        />
      </div>
    </fil-tile>

    <fil-tile [label]="t('ui.timer')">
      <div class="big">{{ store.elapsed() | filDuration }}</div>
      <div class="row tight">
        <button
          type="button"
          filButton="secondary"
          [iconOnly]="true"
          [attr.aria-pressed]="store.running()"
          [attr.aria-label]="store.running() ? t('ui.pause') : t('ui.play')"
          (click)="store.toggleTimer()"
        >
          <fil-icon [name]="store.running() ? 'pause' : 'play'" />
        </button>
        <button type="button" filButton="ghost" (click)="store.resetTimer()">
          {{ t('ui.reset') }}
        </button>
      </div>
    </fil-tile>
  `,
})
export class ReaderCounters {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  protected readonly current = computed(() =>
    this.store.step() ? String(this.store.stepIndex() + 1).padStart(2, '0') : '--',
  );
  protected readonly count = computed(() =>
    this.store.stepCount() ? String(this.store.stepCount()).padStart(2, '0') : '--',
  );
  protected readonly globalHint = computed(() => {
    if (this.store.pieces().length > 1 && this.store.total()) {
      return `${this.store.total()} ${this.t('ui.allSteps')}`;
    }
    return this.store.stepCount() ? this.t('ui.stepsIn') : this.t('ui.noPattern');
  });

  protected goTo(value: string): void {
    const parsed = Number.parseInt(value, 10);
    if (parsed) this.store.goTo(parsed);
  }
}
