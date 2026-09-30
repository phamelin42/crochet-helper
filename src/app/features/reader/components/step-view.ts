import { Component, computed, inject, output } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { Segmented, SegmentedOption } from '../../../shared/ui/segmented/segmented';
import { Tile } from '../../../shared/ui/tile/tile';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';
import { ChartPanel } from './chart-panel';
import { GlossaryText } from './glossary-text';
import { ImageGallery } from './image-gallery';
import { ShareActions } from './share-actions';

/**
 * L'étape en cours, en très grand : c'est l'écran que l'on regarde crochet en
 * main, à un mètre de distance. Tout le reste de la page lui est subordonné.
 */
@Component({
  selector: 'fil-step-view',
  imports: [Button, ChartPanel, GlossaryText, Icon, ImageGallery, Segmented, ShareActions, Tile],
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

    <!-- Seule la position : le libellé du rang et le nom de la pièce
         redisaient ce que l'étape et le sélecteur de pièces montrent déjà. -->
    @if (store.step()) {
      <p class="stepmeta">
        <span class="stepcount"
          >{{ t('ui.stepOf') }} {{ store.stepIndex() + 1 }} / {{ store.stepCount() }}</span
        >
      </p>
    }

    @if (notes(); as notes) {
      <p class="note"><span aria-hidden="true">›</span><fil-glossary-text [text]="notes" /></p>
    }

    <p class="step-body" tabindex="-1" [class.empty]="!store.step()" aria-live="polite">
      @if (store.step(); as step) {
        <fil-glossary-text [text]="step.body" />
      } @else {
        {{ t('ui.empty') }}
      }
    </p>

    @if (store.step()?.tip; as tip) {
      <p class="step-tip"><span aria-hidden="true">💡</span> <fil-glossary-text [text]="tip" /></p>
    }

    <!-- Sous l'étape, jamais au-dessus : l'étape reste dans le premier écran
         d'une tablette (garde de la fiche 24). -->
    @if (store.step()?.images; as images) {
      <fil-image-gallery [numbers]="images" [label]="t('ui.stepPhotos')" />
    }

    @if (store.chartCount()) {
      <fil-chart-panel />
    }

    @if (store.step()) {
      <div class="progress step-progress" aria-hidden="true">
        <i [style.width.%]="store.progress()"></i>
      </div>
    }

    <!-- Seulement quand l'étape annonce une répétition (« x 6 ») : ailleurs,
         le compteur n'avait rien à compter. -->
    @if (store.step()?.reps; as reps) {
      <fil-tile class="reps-tile" [label]="t('ui.reps')">
        <div class="big reps">
          {{ store.currentReps() }}
          <span class="sub"> / {{ reps }}</span>
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

    @if (store.step()) {
      <!-- Visibles, jamais repliées : la boucle qui amène une deuxième
           lectrice ne doit pas être à chercher (audit UX-4). -->
      <fil-share-actions (changePattern)="changePattern.emit()" />
    }
  `,
})
export class StepView {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  /** « Changer de patron », relayé depuis la liste des étapes jusqu'à la page,
   *  seule à savoir où vit le panneau d'import. */
  readonly changePattern = output<void>();

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  protected readonly pieceOptions = computed<SegmentedOption[]>(() =>
    this.store.pieces().map((piece, index) => ({
      value: index,
      label: piece.name || `${this.t('ui.pieces')} ${index + 1}`,
    })),
  );

  protected readonly notes = computed(() => {
    const notes = this.store.step()?.notes ?? [];
    return notes.length ? notes.join(' · ') : '';
  });
}
