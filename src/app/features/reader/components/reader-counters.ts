import { Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { Button } from '../../../shared/ui/button/button';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { InputField } from '../../../shared/ui/field/input';
import { Icon } from '../../../shared/ui/icon/icon';
import { Progress } from '../../../shared/ui/progress/progress';
import { Tile } from '../../../shared/ui/tile/tile';
import { ReaderStore } from '../state/reader-store';

/**
 * Les quatre compteurs de session : position, répétitions du motif en cours,
 * avancement global et chronomètre. Chacun est une tuile du design system.
 */
@Component({
  selector: 'fil-reader-counters',
  imports: [Button, Checkbox, DurationPipe, Icon, InputField, Progress, Tile],
  host: { class: 'meter' },
  template: `
    <fil-tile [label]="t('ui.step')">
      <div class="big">
        <span>{{ current() }}</span
        ><span class="sub">
          / <span>{{ count() }}</span></span
        >
      </div>
      <fil-progress [value]="store.progress()" [label]="t('ui.step')" />
      <div class="hint">{{ globalHint() }}</div>
      <div class="row">
        <label class="visually-hidden" for="jump-to">{{ t('ui.goto') }}</label>
        <input
          #jump
          filInput
          id="jump-to"
          class="jump"
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          [max]="store.stepCount() || 1"
          [disabled]="!store.stepCount()"
          [placeholder]="'n°'"
          (keydown.enter)="goTo(jump.value)"
        />
        <button
          type="button"
          filButton="secondary"
          [disabled]="!store.stepCount()"
          (click)="goTo(jump.value)"
        >
          {{ t('ui.go') }}
        </button>
      </div>
      <div class="hint">← → · espace</div>
    </fil-tile>

    <fil-tile [label]="t('ui.reps')">
      <div class="big reps">
        {{ store.currentReps() }}
        @if (store.step()?.reps) {
          <span class="sub"> / {{ store.step()!.reps }}</span>
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

  protected t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);

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
