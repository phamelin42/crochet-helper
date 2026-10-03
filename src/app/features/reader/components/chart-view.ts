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
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from './chart-viewer';

/** Pas de comparaison d'une maille : assez large pour qu'aucun tour n'en déborde. */
const ORDER = 100_000;

/**
 * La pièce en cours dessinée en symboles. Toucher une maille dit « j'en suis
 * là » : la progression est celle du lecteur, partagée avec l'affichage texte.
 * Chargé à la demande depuis `StepView`, comme sa feuille `chart.css`.
 */
@Component({
  selector: 'fil-chart-view',
  imports: [Button],
  template: `
    <div class="chart-viewer chart-view">
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
    return chart ? layoutPiece(chart) : { width: 0, height: 0, cells: [] };
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
    const before = this.layout().cells.filter((cell) => cell.round * ORDER + cell.stitch < position);
    return before.at(-1) ?? null;
  });

  protected readonly following = computed(() => {
    const position = this.position();
    return this.layout().cells.find((cell) => cell.round * ORDER + cell.stitch > position) ?? null;
  });

  protected readonly summary = computed(() => {
    const kind = this.store.pieceChart()?.kind ?? 'round';
    const head = `${this.t(kind)} ${this.store.stepIndex() + 1} ${this.t('of')} ${this.store.stepCount()}`;
    const total = this.store.stitchTotal();
    if (!total) return `${head}, ${this.t('notDrawn')}`;
    const stitch = Math.min(this.store.stitchIndex(), total - 1) + 1;
    return `${head}, ${this.t('stitch')} ${stitch} ${this.t('of')} ${total}`;
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
    const kind = this.store.pieceChart()?.kind ?? 'round';
    this.tooltips.showFor(
      event.currentTarget as unknown as HTMLElement,
      `${this.t(kind)} ${cell.round + 1} · ${this.t('stitch')} ${cell.stitch + 1}`,
      `${symbolAbbreviation(symbol, locale)}, ${symbolName(symbol, locale)}`,
    );
  }
}
