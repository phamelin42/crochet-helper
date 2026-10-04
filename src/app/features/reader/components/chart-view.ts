import { Component, computed, effect, inject, signal, viewChild, ElementRef } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { StylesheetService } from '../../../core/platform/stylesheet.service';
import { Button } from '../../../shared/ui/button/button';
import { TooltipService } from '../../../shared/ui/tooltip/tooltip.service';
import { findSymbol } from '../data/chart-composer';
import { CELL, ChartCell, layoutPiece } from '../data/chart-layout';
import { CHART_VIEW_COPY, ChartViewKey } from '../data/chart-view-copy';
import { symbolAbbreviation, symbolName, symbolUrl } from '../data/chart-symbols';
import { ReaderStore } from '../state/reader-store';
import { ChartLegend } from './chart-legend';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from './chart-viewer';
import { GlossaryText } from './glossary-text';

/** Pas de comparaison d'une maille : assez large pour qu'aucun tour n'en déborde. */
const ORDER = 100_000;

/**
 * La pièce en cours dessinée en symboles, toutes ses étapes à la fois, comme
 * un diagramme imprimé : numéros des tours ou des rangs, sens de lecture,
 * place en pointillé des étapes que le texte ne permet pas de dessiner. La
 * consigne de l'étape en cours reste écrite au-dessus, et la légende des
 * symboles employés dessous. Toucher une maille dit « j'en suis là » : la
 * progression est celle du lecteur, partagée avec l'affichage texte.
 * Chargé à la demande depuis `StepView`, comme sa feuille `chart.css`.
 */
@Component({
  selector: 'fil-chart-view',
  imports: [Button, ChartLegend, GlossaryText],
  template: `
    <div class="chart-viewer chart-view">
      @if (store.step(); as step) {
        <p class="chart-step">
          <strong>{{ stepTitle() }}</strong>
          <span><fil-glossary-text [text]="step.body" /></span>
          @if (!store.stitchTotal()) {
            <em>{{ t('notDrawnHint') }}</em>
          }
        </p>
      }
      <div class="chart-toolbar" role="group" [attr.aria-label]="t('controls')">
        <button
          type="button"
          filButton="secondary"
          [disabled]="zoom() <= MIN_ZOOM"
          (click)="zoomBy(-ZOOM_STEP)"
        >
          {{ t('zoomOut') }}
        </button>
        <button
          type="button"
          filButton="secondary"
          [disabled]="zoom() >= MAX_ZOOM"
          (click)="zoomBy(ZOOM_STEP)"
        >
          {{ t('zoomIn') }}
        </button>
        <button type="button" filButton="secondary" (click)="zoom.set(1)">
          {{ t('fit') }}
        </button>
      </div>
      <!-- Défilable au clavier ; les flèches changent de maille quand le cadre a le focus. -->
      <div
        class="chart-frame"
        role="region"
        tabindex="0"
        [attr.aria-label]="t('frame')"
        (keydown)="onKey($event)"
      >
        <svg
          class="chart-svg"
          role="img"
          [attr.aria-label]="summary()"
          [attr.viewBox]="'0 0 ' + layout().width + ' ' + layout().height"
          [attr.width]="layout().width * zoom()"
          [attr.height]="layout().height * zoom()"
        >
          @for (gap of layout().gaps; track $index) {
            @if (gap.kind === 'ring') {
              <circle
                class="chart-gap"
                [class.is-current]="gap.step === store.stepIndex()"
                [attr.cx]="layout().width / 2"
                [attr.cy]="layout().height / 2"
                [attr.r]="gap.r"
              />
            } @else {
              <line
                class="chart-gap"
                [class.is-current]="gap.step === store.stepIndex()"
                [attr.x1]="CELL"
                [attr.x2]="layout().width - CELL"
                [attr.y1]="gap.y"
                [attr.y2]="gap.y"
              />
            }
          }
          @for (label of layout().labels; track $index) {
            <text
              class="chart-number"
              [class.is-current]="label.step === store.stepIndex()"
              text-anchor="middle"
              dominant-baseline="central"
              [attr.x]="label.x"
              [attr.y]="label.y"
            >
              {{ label.text }}
            </text>
          }
          @for (cell of cells(); track cell.key) {
            <g
              class="chart-cell"
              [class.is-off]="cell.off"
              [class.is-done]="cell.done"
              (click)="mark(cell)"
              (pointerenter)="hover($event, cell)"
              (pointerleave)="tooltips.hide()"
            >
              <rect
                class="chart-hit"
                [attr.x]="cell.x - CELL / 2"
                [attr.y]="cell.y - CELL / 2"
                [attr.width]="CELL"
                [attr.height]="CELL"
              />
              <image
                [attr.href]="cell.url"
                [attr.x]="cell.x - CELL / 2"
                [attr.y]="cell.y - CELL / 2"
                [attr.width]="CELL"
                [attr.height]="CELL"
                [attr.transform]="cell.transform"
              />
            </g>
          }
          @if (marker(); as m) {
            <circle
              #marker
              class="chart-mark"
              [attr.cx]="m.x"
              [attr.cy]="m.y"
              [attr.r]="CELL / 2"
            />
          }
        </svg>
      </div>
      <div class="chart-toolbar">
        <button
          type="button"
          filButton="secondary"
          [step]="true"
          [disabled]="previous() === null"
          (click)="go(previous())"
        >
          {{ t('prev') }}
        </button>
        <button
          type="button"
          filButton="primary"
          [step]="true"
          [disabled]="following() === null"
          (click)="go(following())"
        >
          {{ t('next') }}
        </button>
      </div>
      <p class="visually-hidden" aria-live="polite">{{ summary() }}</p>
      @if (used().length) {
        <h3 class="chart-legend-title">{{ t('legend') }}</h3>
        <fil-chart-legend [only]="used()" />
      }
    </div>
  `,
})
export class ChartView {
  protected readonly store = inject(ReaderStore);
  protected readonly tooltips = inject(TooltipService);
  private readonly i18n = inject(I18nService);
  private readonly markerRef = viewChild<ElementRef<SVGCircleElement>>('marker');

  protected readonly CELL = CELL;
  protected readonly MIN_ZOOM = MIN_ZOOM;
  protected readonly MAX_ZOOM = MAX_ZOOM;
  protected readonly ZOOM_STEP = ZOOM_STEP;

  protected readonly zoom = signal(1);

  protected t = (key: ChartViewKey) => CHART_VIEW_COPY[this.i18n.locale()][key];

  protected readonly layout = computed(() => {
    const chart = this.store.pieceChart();
    return chart ? layoutPiece(chart) : { width: 0, height: 0, cells: [], labels: [], gaps: [] };
  });

  /** Place de la maille courante dans l'ordre de lecture ; ce que `go` compare. */
  private readonly position = computed(() => {
    const step = this.store.stepIndex();
    const last = Math.max(0, this.store.stitchTotal() - 1);
    return step * ORDER + Math.min(this.store.stitchIndex(), last);
  });

  protected readonly cells = computed(() => {
    const step = this.store.stepIndex();
    const position = this.position();
    return this.layout().cells.map((cell) => ({
      ...cell,
      key: `${cell.round}:${cell.stitch}`,
      url: symbolUrl(cell.symbol),
      transform: cell.angle ? `rotate(${cell.angle} ${cell.x} ${cell.y})` : null,
      off: cell.round !== step,
      done: cell.round * ORDER + cell.stitch < position,
    }));
  });

  protected readonly marker = computed(() => {
    const position = this.position();
    return this.layout().cells.find((cell) => cell.round * ORDER + cell.stitch === position);
  });

  protected readonly previous = computed(() => {
    const position = this.position();
    const before = this.layout().cells.filter(
      (cell) => cell.round * ORDER + cell.stitch < position,
    );
    return before.at(-1) ?? null;
  });

  protected readonly following = computed(() => {
    const position = this.position();
    return this.layout().cells.find((cell) => cell.round * ORDER + cell.stitch > position) ?? null;
  });

  /** Symboles du dessin, dans l'ordre de la légende complète. */
  protected readonly used = computed(() => [
    ...new Set(this.layout().cells.map((cell) => cell.symbol)),
  ]);

  /** Tours couverts par l'étape courante, et mailles de chacun. */
  private readonly ring = computed(() => {
    const chart = this.store.pieceChart();
    const step = this.store.stepIndex();
    const span = chart?.spans[step] ?? 1;
    const first = chart?.numbers[step] ?? step + 1;
    const total = this.store.stitchTotal();
    const size = total / span;
    const stitch = Math.min(this.store.stitchIndex(), Math.max(0, total - 1));
    const repeat = size ? Math.floor(stitch / size) : 0;
    const last = chart
      ? (chart.numbers.at(-1) ?? 0) + (chart.spans.at(-1) ?? 1) - 1
      : this.store.stepCount();
    return { first, span, number: first + repeat, size, stitch: size ? stitch % size : 0, last };
  });

  /** « Tour 3 », « Tours 5 à 8 (tour 6) » : le numéro du patron, pas l'indice de l'étape. */
  protected readonly stepTitle = computed(() => {
    const kind = this.store.pieceChart()?.kind ?? 'round';
    const { first, span, number } = this.ring();
    if (span === 1) return `${this.t(kind)} ${first}`;
    return `${this.t(kind === 'round' ? 'rounds' : 'rows')} ${first} ${this.t('to')} ${first + span - 1} (${this.t(kind).toLowerCase()} ${number})`;
  });

  protected readonly summary = computed(() => {
    const kind = this.store.pieceChart()?.kind ?? 'round';
    const { number, size, stitch, last } = this.ring();
    const head = `${this.t(kind)} ${number} ${this.t('of')} ${last}`;
    if (!size) return `${head}, ${this.t('notDrawn')}`;
    return `${head}, ${this.t('stitch')} ${stitch + 1} ${this.t('of')} ${size}`;
  });

  constructor() {
    inject(StylesheetService).load('chart.css');
    // Un grand dessin défile jusqu'à la maille : on la retrouve au retour.
    effect(() => {
      this.marker();
      this.markerRef()?.nativeElement.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  }

  protected zoomBy(delta: number): void {
    this.zoom.update((zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta)));
  }

  protected mark(cell: ChartCell): void {
    this.store.markStitch(cell.round, cell.stitch);
  }

  protected go(cell: ChartCell | null): void {
    if (cell) this.mark(cell);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    this.go(event.key === 'ArrowRight' ? this.following() : this.previous());
  }

  /** Au doigt, l'infobulle masquerait la maille que l'on touche : pointeur fin seulement. */
  protected hover(event: PointerEvent, cell: ChartCell): void {
    if (event.pointerType === 'touch' || this.tooltips.isStationaryHover(event)) return;
    const symbol = findSymbol(cell.symbol);
    if (!symbol) return;
    const locale = this.i18n.locale();
    const chart = this.store.pieceChart();
    const kind = chart?.kind ?? 'round';
    const size = (chart?.stitches[cell.round] ?? 0) / (chart?.spans[cell.round] ?? 1) || 1;
    const number = (chart?.numbers[cell.round] ?? cell.round + 1) + Math.floor(cell.stitch / size);
    this.tooltips.showFor(
      event.currentTarget as unknown as HTMLElement,
      `${this.t(kind)} ${number} · ${this.t('stitch')} ${(cell.stitch % size) + 1}`,
      `${symbolAbbreviation(symbol, locale)}, ${symbolName(symbol, locale)}`,
    );
  }
}
