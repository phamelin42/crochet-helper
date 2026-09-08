import { Component, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { Segmented, SegmentedOption } from '../../../shared/ui/segmented/segmented';
import { ReaderStore } from '../state/reader-store';
import { GlossaryText } from './glossary-text';

/**
 * L'étape en cours, en très grand : c'est l'écran que l'on regarde crochet en
 * main, à un mètre de distance. Tout le reste de la page lui est subordonné.
 */
@Component({
  selector: 'fil-step-view',
  imports: [Button, GlossaryText, Icon, Segmented],
  template: `
    @if (pieceOptions().length > 1) {
      <div class="pieces">
        <fil-segmented
          name="piece"
          [label]="t('ui.pieces')"
          [options]="pieceOptions()"
          [selected]="store.pieceIndex()"
          (selectedChange)="store.selectPiece($event)"
        />
      </div>
    }

    <div class="stepmeta">
      <button
        type="button"
        filButton="ghost"
        class="abbr-toggle"
        [attr.aria-pressed]="store.expandAbbreviations()"
        (click)="store.toggleExpandAbbreviations()"
      >
        {{ store.expandAbbreviations() ? t('ui.abbrev') : t('ui.expand') }}
      </button>
      @if (store.step(); as step) {
        <span class="steplabel">{{ step.label || t('ui.repeat') }}</span>
      }
      @if (title()) {
        <span class="piecename">{{ title() }}</span>
      }
    </div>

    @if (notes(); as notes) {
      <p class="note"><span aria-hidden="true">›</span><fil-glossary-text [text]="notes" /></p>
    }

    <p class="step-body" [class.empty]="!store.step()" aria-live="polite">
      @if (store.step(); as step) {
        <fil-glossary-text [text]="step.body" />
      } @else {
        {{ t('ui.empty') }}
      }
    </p>

    @if (store.step()?.tip; as tip) {
      <p class="step-tip"><span aria-hidden="true">💡</span> <fil-glossary-text [text]="tip" /></p>
    }

    <div class="navrow">
      <button
        type="button"
        filButton="secondary"
        [step]="true"
        [disabled]="!store.hasPrevious()"
        (click)="store.move(-1)"
      >
        <fil-icon name="left" /><span>{{ t('ui.prev') }}</span>
      </button>
      <button
        type="button"
        filButton="primary"
        [step]="true"
        class="next"
        [disabled]="!store.step()"
        (click)="store.advance()"
      >
        <span>{{ t('ui.next') }}</span
        ><fil-icon name="right" />
      </button>
    </div>
  `,
})
export class StepView {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  protected t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);

  protected readonly pieceOptions = computed<SegmentedOption[]>(() =>
    this.store.pieces().map((piece, index) => ({
      value: index,
      label: piece.name || `${this.t('ui.pieces')} ${index + 1}`,
    })),
  );

  protected readonly title = computed(() => this.store.piece()?.name || this.store.pattern().title);
  protected readonly notes = computed(() => {
    const notes = this.store.step()?.notes ?? [];
    return notes.length ? notes.join(' · ') : '';
  });
}
