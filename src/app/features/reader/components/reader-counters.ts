import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { Button } from '../../../shared/ui/button/button';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { Icon } from '../../../shared/ui/icon/icon';
import { Tile } from '../../../shared/ui/tile/tile';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';

/**
 * Répétitions, avancement global et chronomètre de la session. Répétitions et
 * avancement partagent une ligne, même sur téléphone ; le compteur de
 * répétitions reste toujours affiché, « / N » quand l'étape annonce un
 * nombre de répétitions.
 */
@Component({
  selector: 'fil-reader-counters',
  imports: [Button, Checkbox, DurationPipe, Icon, Tile],
  host: { class: 'meter' },
  template: `
    <fil-tile class="reps-tile" [label]="t('ui.reps')">
      <div class="big reps">
        {{ store.currentReps() }}
        @if (store.step()?.reps; as reps) {
          <span class="sub"> / {{ reps }}</span>
        }
      </div>
      <div class="row tight">
        <button
          type="button"
          filButton="secondary"
          [iconOnly]="true"
          aria-label="−"
          [disabled]="!store.step() || store.currentReps() <= 0"
          (click)="store.addRepeat(-1)"
        >
          <fil-icon name="minus" />
        </button>
        <button
          type="button"
          filButton="primary"
          [iconOnly]="true"
          aria-label="+"
          [disabled]="!store.step()"
          (click)="store.addRepeat(1)"
        >
          <fil-icon name="plus" />
        </button>
        <button type="button" filButton="ghost" (click)="store.resetRepeat()">
          {{ t('ui.reset') }}
        </button>
      </div>
    </fil-tile>

    <fil-tile class="done-tile" [label]="t('ui.doneLabel')">
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

    <fil-tile class="timer-tile" [label]="t('ui.timer')">
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
}
