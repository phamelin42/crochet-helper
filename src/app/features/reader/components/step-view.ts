import { Component, ElementRef, computed, inject, output, viewChild } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { Segmented, SegmentedOption } from '../../../shared/ui/segmented/segmented';
import { Tile } from '../../../shared/ui/tile/tile';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';
import { GlossaryText } from './glossary-text';
import { ImageGallery } from './image-gallery';
import { ShareActions } from './share-actions';
import { StepsList } from './steps-list';

/**
 * L'étape en cours, en très grand : c'est l'écran que l'on regarde crochet en
 * main, à un mètre de distance. Tout le reste de la page lui est subordonné.
 */
@Component({
  selector: 'fil-step-view',
  imports: [Button, GlossaryText, Icon, ImageGallery, Segmented, ShareActions, StepsList, Tile],
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
        <!-- Sur la même ligne que le libellé : la position ne coûte aucune
             hauteur, l'étape reste dans le premier écran (garde de la fiche 24). -->
        <span class="stepcount"
          >{{ t('ui.stepOf') }} {{ store.stepIndex() + 1 }} / {{ store.stepCount() }}</span
        >
      }
      @if (title()) {
        <span class="piecename">{{ title() }}</span>
      }
    </div>

    @if (notes(); as notes) {
      <p class="note"><span aria-hidden="true">›</span><fil-glossary-text [text]="notes" /></p>
    }

    <p #stepBody class="step-body" tabindex="-1" [class.empty]="!store.step()" aria-live="polite">
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

    @if (store.step()) {
      <div class="progress step-progress" aria-hidden="true">
        <i [style.width.%]="store.progress()"></i>
      </div>
    }

    <fil-tile class="reps-tile" [label]="t('ui.reps')">
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
      <fil-steps-list (jumped)="focusStepBody()" />
      <!--
        Les actions de partage restent visibles, hors du panneau replié : la
        boucle qui amène une deuxième lectrice ne doit pas être à chercher
        (audit UX-4). La liste des étapes, elle, se déplie à la demande.
      -->
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

  private readonly stepBody = viewChild<ElementRef<HTMLElement>>('stepBody');

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  /** Ramène le focus sur l'étape après un saut depuis la liste ou le champ
   *  « Aller à l'étape n° » : la lectrice vient de choisir où reprendre. */
  protected focusStepBody(): void {
    this.stepBody()?.nativeElement.focus();
  }

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
