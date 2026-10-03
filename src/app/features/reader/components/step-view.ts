import {
  Component,
  ElementRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  output,
  viewChild,
} from '@angular/core';
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
/** Au-delà, le texte de l'étape passe à 80 %, 60 % puis 50 % de sa taille. */
const LONG_STEP = 30;
const LONGER_STEP = 60;
const LONGEST_STEP = 90;

/**
 * L'étape en cours, en très grand : c'est l'écran que l'on regarde crochet en
 * main, à un mètre de distance. Tout le reste de la page lui est subordonné.
 */
@Component({
  selector: 'fil-step-view',
  host: { '(document:keydown.escape)': 'leaveFocus($event)' },
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
      <div class="stepmeta">
        <p class="stepcount">
          {{ t('ui.stepOf') }} {{ store.stepIndex() + 1 }} / {{ store.stepCount() }}
          @if (store.stitchIndex() > 0 && store.stitchTotal()) {
            · {{ t('ui.stitchOf') }} {{ stitchNumber() }} {{ t('ui.stitchTotal') }}
            {{ store.stitchTotal() }}
          }
        </p>
        <!-- Sur la ligne du libellé : l'étape ne descend pas (garde de la fiche 24). -->
        <fil-segmented
          class="view-toggle"
          name="reader-view"
          [label]="t('ui.view')"
          [options]="viewOptions()"
          [selected]="store.view() === 'chart' ? 1 : 0"
          (selectedChange)="store.setView($event === 1 ? 'chart' : 'text')"
        />
        <!-- Même emplacement dans les deux modes : « Outils » quitte la page
             pleine, « Page pleine » y revient. -->
        <button
          #focusToggle
          type="button"
          filButton="ghost"
          class="focus-toggle"
          aria-keyshortcuts="Escape"
          [attr.aria-pressed]="prefs.focus()"
          [attr.aria-label]="prefs.focus() ? t('ui.focusTools') : t('ui.focusOn')"
          (click)="toggleFocus()"
        >
          @if (prefs.focus()) {
            <fil-icon name="dots" />
          } @else {
            <span>{{ t('ui.focusOn') }}</span>
          }
        </button>
      </div>
    }

    <!-- L'étape et sa barre de progression, collée dessous. Le bloc réserve
         sa hauteur (\`.step-block\`) : « Précédent » et « Suivant » ne bougent
         pas d'une étape à l'autre, et l'espace libre va sous la barre. -->
    <div class="step-block" [class.empty]="!store.step()" [class.chart]="chartMode()">
      @if (chartMode()) {
        <!-- Le dessin et sa géométrie viennent à la demande : hors du premier affichage. -->
        <ng-container #chartHost />
      } @else {
        <p
          class="step-body"
          tabindex="-1"
          [class.empty]="!store.step()"
          [class.long]="length() === 'long'"
          [class.longer]="length() === 'longer'"
          [class.longest]="length() === 'longest'"
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

    @if (store.step() && store.pieceChart() && !chartAvailable()) {
      <p class="hint" role="status">{{ t('ui.viewChartOff') }}</p>
    }

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
  protected readonly prefs = inject(DisplayPrefsService);
  private readonly analytics = inject(AnalyticsService);
  private readonly focusToggle = viewChild<ElementRef<HTMLButtonElement>>('focusToggle');

  /** « Changer de patron », relayé depuis la liste des étapes jusqu'à la page,
   *  seule à savoir où vit le panneau d'import. */
  readonly changePattern = output<void>();

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  protected readonly textSizeOptions = computed<SegmentedOption[]>(() => [
    { value: 0, label: this.t('ui.textSizeBase') },
    { value: 1, label: this.t('ui.textSizeLg') },
    { value: 2, label: this.t('ui.textSizeXl') },
  ]);
  /** Au moins une étape de la pièce se dessine. */
  protected readonly chartAvailable = computed(() => (this.store.pieceChart()?.drawable ?? 0) > 0);
  /** Le choix retenu ne vaut que si la pièce a de quoi être dessinée. */
  protected readonly chartMode = computed(
    () => this.store.view() === 'chart' && this.chartAvailable(),
  );
  protected readonly viewOptions = computed<SegmentedOption[]>(() => [
    { value: 0, label: this.t('ui.viewText') },
    { value: 1, label: this.t('ui.viewChart'), disabled: !this.chartAvailable() },
  ]);
  protected readonly stitchNumber = computed(
    () => Math.min(this.store.stitchIndex(), this.store.stitchTotal() - 1) + 1,
  );
  private readonly chartHost = viewChild('chartHost', { read: ViewContainerRef });

  constructor() {
    effect(() => {
      const host = this.chartHost();
      if (host) void this.mountChart(host);
    });
  }

  private async mountChart(host: ViewContainerRef): Promise<void> {
    const { ChartView } = await import('./chart-view');
    // Le conteneur a pu disparaître (retour au texte) pendant le chargement.
    if (this.chartHost() === host && host.length === 0) host.createComponent(ChartView);
  }

  protected readonly textSizeIndex = computed(() => TEXT_SIZES.indexOf(this.prefs.textSize()));

  protected toggleFocus(): void {
    this.setFocus(!this.prefs.focus());
  }

  /** Échap quitte la page pleine, sauf s'il ferme déjà autre chose (boîte de
   *  dialogue, diagramme agrandi : celui-ci garde la main). */
  protected leaveFocus(event: Event): void {
    if (event.defaultPrevented || !this.prefs.focus() || !this.store.step()) return;
    this.setFocus(false);
  }

  private setFocus(value: boolean): void {
    this.prefs.setFocus(value);
    this.analytics.track('focus_mode_toggled', { value: value ? 'on' : 'off' });
    // Le bouton reste le même élément : le focus ne se perd pas avec le mode.
    this.focusToggle()?.nativeElement.focus();
  }

  protected setTextSize(index: number): void {
    const value = TEXT_SIZES[index] ?? 'base';
    this.prefs.setTextSize(value);
    this.analytics.track('reading_pref_changed', { pref: 'text_size', value });
  }

  /** Une étape longue s'écrit plus petit pour tenir dans la hauteur réservée :
   *  les boutons, dessous, ne bougent pas d'une étape à l'autre. */
  protected readonly length = computed(() => {
    const chars = this.store.step()?.body.length ?? 0;
    if (chars > LONGEST_STEP) return 'longest';
    if (chars > LONGER_STEP) return 'longer';
    return chars > LONG_STEP ? 'long' : 'normal';
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
