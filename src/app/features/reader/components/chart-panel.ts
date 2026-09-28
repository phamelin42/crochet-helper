import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { StylesheetService } from '../../../core/platform/stylesheet.service';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { Segmented, SegmentedOption } from '../../../shared/ui/segmented/segmented';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';
import { ChartLegend } from './chart-legend';
import { ChartViewer } from './chart-viewer';

/**
 * Panneau « Diagramme », sous l'étape : jamais au-dessus, pour que l'étape
 * reste dans le premier écran d'une tablette (garde de la fiche 24). Il montre
 * le diagramme épinglé à la pièce en cours ; une pièce sans diagramme propose
 * ceux qui existent.
 */
@Component({
  selector: 'fil-chart-panel',
  imports: [Button, ChartLegend, ChartViewer, Dialog, Disclosure, Segmented],
  template: `
    <fil-disclosure [label]="t('ui.chartPanel')" variant="mats" [state]="count()" [(open)]="open">
      @if (shown(); as chart) {
        <fil-chart-viewer
          [chart]="chart"
          [label]="label()"
          [canFullscreen]="true"
          (fullscreen)="full.set(true)"
        />
        <div class="chart-for">
          <span>{{ t('ui.chartForPiece') }}</span>
          <fil-segmented
            name="chart-piece"
            [label]="t('ui.chartForPiece')"
            [options]="pieceOptions()"
            [selected]="pinnedPiece()"
            (selectedChange)="pin($event)"
          />
        </div>
      } @else {
        <p class="hint" role="status">{{ t('ui.chartNone') }}</p>
      }
      @if (showPick()) {
        <div class="chart-pick" role="group" [attr.aria-label]="t('ui.chartPick')">
          <span>{{ t('ui.chartPick') }}</span>
          @for (n of numbers(); track n) {
            <button
              type="button"
              filButton="secondary"
              [attr.aria-pressed]="n === shownN()"
              (click)="chosen.set(n)"
            >
              {{ t('ui.chartOf') }} {{ n }}
            </button>
          }
        </div>
      }
      <div class="import-actions">
        <button type="button" filButton="ghost" (click)="legend.set(true)">
          {{ t('ui.chartLegend') }}
        </button>
      </div>
    </fil-disclosure>

    <!-- Les dialogues restent dans le DOM : le navigateur rend le focus au
         bouton qui les a ouverts, ce qu'un dialogue détruit ne fait pas. -->
    <fil-dialog [(open)]="legend" [label]="t('ui.chartLegendTitle')">
      @if (legend()) {
        <h2 class="dialog-title">{{ t('ui.chartLegendTitle') }}</h2>
        <fil-chart-legend />
        <div class="dialog-actions">
          <button type="button" filButton="ghost" (click)="legend.set(false)">
            {{ t('ui.photoClose') }}
          </button>
        </div>
      }
    </fil-dialog>

    <fil-dialog [(open)]="full" [label]="label()" [wide]="true">
      @if (full() && shown(); as chart) {
        <fil-chart-viewer [chart]="chart" [label]="label()" />
        <div class="dialog-actions">
          <button type="button" filButton="ghost" (click)="full.set(false)">
            {{ t('ui.photoClose') }}
          </button>
        </div>
      }
    </fil-dialog>
  `,
})
export class ChartPanel {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  protected readonly legend = signal(false);
  protected readonly full = signal(false);

  /** Diagramme épinglé à la pièce en cours. */
  private readonly pinned = computed(() => this.store.charts()[this.store.pieceIndex()] ?? null);
  /** Diagramme choisi dans la liste pour une pièce qui n'en a pas ; oublié au changement de pièce. */
  protected readonly chosen = linkedSignal<number, number | null>({
    source: () => this.store.pieceIndex(),
    computation: () => null,
  });
  protected readonly shownN = computed(() => this.pinned() ?? this.chosen());
  protected readonly shown = computed(() => {
    const n = this.shownN();
    return n ? (this.store.chartFiles()[n - 1] ?? null) : null;
  });

  /** Ouvert d'office quand la pièce a son diagramme ; la lectrice garde la main ensuite. */
  protected readonly open = linkedSignal(() => this.pinned() !== null);

  protected readonly count = computed(() => String(this.store.chartCount()));
  protected readonly numbers = computed(() =>
    Array.from({ length: this.store.chartCount() }, (_, i) => i + 1),
  );
  protected readonly showPick = computed(
    () => this.numbers().length > 1 || (this.numbers().length === 1 && !this.shown()),
  );
  protected readonly label = computed(() =>
    `${this.t('ui.chartOf')} ${this.shownN() ?? ''}`.trim(),
  );

  protected readonly pieceOptions = computed<SegmentedOption[]>(() => {
    const pieces = this.store.pieces();
    if (pieces.length <= 1) return [{ value: 0, label: this.t('ui.chartWholePattern') }];
    return pieces.map((piece, index) => ({
      value: index,
      label: piece.name || `${this.t('ui.pieces')} ${index + 1}`,
    }));
  });
  /** Pièce à laquelle le diagramme affiché est épinglé ; -1 s'il ne l'est nulle part. */
  protected readonly pinnedPiece = computed(() => {
    const n = this.shownN();
    const entry = Object.entries(this.store.charts()).find(([, value]) => value === n);
    return entry ? Number(entry[0]) : -1;
  });

  constructor() {
    inject(StylesheetService).load('chart.css');
    // Un diagramme affiché compte comme vu, panneau ou plein écran, une fois
    // par session : l'effet ne fait rien tant que le panneau est fermé.
    effect(() => {
      const n = this.shownN();
      if (n && this.shown() && (this.open() || this.full())) this.store.markChartViewed(n);
    });
  }

  protected pin(piece: number): void {
    const n = this.shownN();
    if (!n) return;
    // Le diagramme reste à l'écran : la lectrice vient de le ranger, pas de le perdre de vue.
    this.chosen.set(n);
    this.store.pinChart(piece, n);
  }
}
