import { Component, computed, inject, input, output, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { StylesheetService } from '../../../core/platform/stylesheet.service';
import { Button } from '../../../shared/ui/button/button';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import type { ShownPhoto } from '../state/reader-store';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.25;

/**
 * Un diagramme avec ses commandes : zoom (0,5 à 4), retour à la largeur du
 * cadre, quart de tour. Le même composant sert dans le panneau et en plein
 * écran ; chacun garde son propre zoom.
 */
@Component({
  selector: 'fil-chart-viewer',
  imports: [Button],
  template: `
    <div class="chart-viewer">
      <div class="chart-toolbar" role="group" [attr.aria-label]="t('ui.chartControls')">
        <button
          type="button"
          filButton="secondary"
          [disabled]="zoom() <= MIN_ZOOM"
          (click)="zoomBy(-ZOOM_STEP)"
        >
          {{ t('ui.chartZoomOut') }}
        </button>
        <button
          type="button"
          filButton="secondary"
          [disabled]="zoom() >= MAX_ZOOM"
          (click)="zoomBy(ZOOM_STEP)"
        >
          {{ t('ui.chartZoomIn') }}
        </button>
        <button type="button" filButton="secondary" (click)="fit()">
          {{ t('ui.chartFit') }}
        </button>
        <button type="button" filButton="secondary" (click)="rotate()">
          {{ t('ui.chartRotate') }}
        </button>
        @if (canFullscreen()) {
          <button type="button" filButton="ghost" (click)="fullscreen.emit()">
            {{ t('ui.chartFullscreen') }}
          </button>
        }
      </div>
      <!-- Défilable au clavier : la région est focalisable et nommée. -->
      <div class="chart-frame" role="region" tabindex="0" [attr.aria-label]="label()">
        <div class="chart-stage" [style.aspect-ratio]="ratio()" [style.transform]="scale()">
          <img
            class="chart-img"
            [class]="turnClass()"
            [src]="chart().url"
            [alt]="label()"
            decoding="async"
          />
        </div>
      </div>
    </div>
  `,
})
export class ChartViewer {
  private readonly i18n = inject(I18nService);

  readonly chart = input.required<ShownPhoto>();
  readonly label = input.required<string>();
  readonly canFullscreen = input(false);
  readonly fullscreen = output<void>();

  readonly zoom = signal(1);
  /** Quarts de tour dans le sens des aiguilles d'une montre : 0 à 3. */
  readonly turns = signal(0);

  protected readonly MIN_ZOOM = MIN_ZOOM;
  protected readonly MAX_ZOOM = MAX_ZOOM;
  protected readonly ZOOM_STEP = ZOOM_STEP;

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  protected readonly ratio = computed(() => {
    const { width, height } = this.chart();
    return this.turns() % 2 ? `${height} / ${width}` : `${width} / ${height}`;
  });
  protected readonly scale = computed(() => `scale(${this.zoom()})`);
  protected readonly turnClass = computed(() => `turn-${this.turns()}`);

  constructor() {
    inject(StylesheetService).load('chart.css');
  }

  zoomBy(delta: number): void {
    this.zoom.update((zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta)));
  }

  fit(): void {
    this.zoom.set(1);
  }

  rotate(): void {
    this.turns.update((turns) => (turns + 1) % 4);
  }
}
