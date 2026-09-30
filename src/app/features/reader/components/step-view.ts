import { Component, computed, inject, output } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DisplayPrefsService, ReaderTextSize } from '../../../core/platform/display-prefs.service';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { Segmented, SegmentedOption } from '../../../shared/ui/segmented/segmented';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';
import { ChartPanel } from './chart-panel';
import { GlossaryText } from './glossary-text';
import { ImageGallery } from './image-gallery';
import { ShareActions } from './share-actions';

const TEXT_SIZES: readonly ReaderTextSize[] = ['base', 'lg', 'xl'];
/** Au-delà, le texte de l'étape passe à 80 % puis à 60 % de sa taille. */
const LONG_STEP = 30;
const LONGER_STEP = 60;

/**
 * L'étape en cours, en très grand : c'est l'écran que l'on regarde crochet en
 * main, à un mètre de distance. Tout le reste de la page lui est subordonné.
 */
@Component({
  selector: 'fil-step-view',
  imports: [Button, ChartPanel, GlossaryText, Icon, ImageGallery, Segmented, ShareActions],
  template: `
    <!-- Réglages sur une ligne : pièces à gauche (défilent si nombreuses),
         taille du texte à droite. -->
    @if (store.step()) {
      <div class="reader-tools">
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
        <fil-segmented
          class="text-size"
          name="text-size"
          [label]="t('ui.textSize')"
          [options]="textSizeOptions()"
          [selected]="textSizeIndex()"
          (selectedChange)="setTextSize($event)"
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

    <!-- L'étape et sa barre de progression, collée dessous. Le bloc réserve
         sa hauteur (\`.step-block\`) : « Précédent » et « Suivant » ne bougent
         pas d'une étape à l'autre, et l'espace libre va sous la barre. -->
    <div class="step-block" [class.empty]="!store.step()">
      <p
        class="step-body"
        tabindex="-1"
        [class.empty]="!store.step()"
        [class.long]="length() === 'long'"
        [class.longer]="length() === 'longer'"
        aria-live="polite"
      >
        @if (store.step(); as step) {
          <fil-glossary-text [text]="step.body" />
        } @else {
          {{ t('ui.empty') }}
        }
      </p>

      @if (store.step()) {
        <div class="progress step-progress" aria-hidden="true">
          <i [style.width.%]="store.progress()"></i>
        </div>
      }
    </div>

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

    <!--
      Tout ce qui varie d'une étape à l'autre (notes, astuce, photos,
      diagramme) vient après « Précédent » et « Suivant » : l'étape réserve sa hauteur (\`.step-body\`), et les deux
      boutons restent au même endroit d'une étape à l'autre.
    -->
    @if (notes(); as notes) {
      <p class="note"><span aria-hidden="true">›</span><fil-glossary-text [text]="notes" /></p>
    }
    @if (store.step()?.tip; as tip) {
      <p class="step-tip"><span aria-hidden="true">💡</span> <fil-glossary-text [text]="tip" /></p>
    }
    @if (store.step()?.images; as images) {
      <fil-image-gallery [numbers]="images" [label]="t('ui.stepPhotos')" />
    }
    @if (store.chartCount()) {
      <fil-chart-panel />
    }

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
  private readonly prefs = inject(DisplayPrefsService);
  private readonly analytics = inject(AnalyticsService);

  /** « Changer de patron », relayé depuis la liste des étapes jusqu'à la page,
   *  seule à savoir où vit le panneau d'import. */
  readonly changePattern = output<void>();

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  protected readonly textSizeOptions = computed<SegmentedOption[]>(() => [
    { value: 0, label: this.t('ui.textSizeBase') },
    { value: 1, label: this.t('ui.textSizeLg') },
    { value: 2, label: this.t('ui.textSizeXl') },
  ]);
  protected readonly textSizeIndex = computed(() => TEXT_SIZES.indexOf(this.prefs.textSize()));

  protected setTextSize(index: number): void {
    const value = TEXT_SIZES[index] ?? 'base';
    this.prefs.setTextSize(value);
    this.analytics.track('reading_pref_changed', { pref: 'text_size', value });
  }

  /** Une étape longue s'écrit plus petit pour tenir dans la hauteur réservée :
   *  les boutons, dessous, ne bougent pas d'une étape à l'autre. */
  protected readonly length = computed(() => {
    const chars = this.store.step()?.body.length ?? 0;
    return chars > LONGER_STEP ? 'longer' : chars > LONG_STEP ? 'long' : 'normal';
  });

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
