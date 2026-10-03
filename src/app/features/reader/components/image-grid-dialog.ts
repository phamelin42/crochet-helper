import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { DecodedPixels } from '../../../core/platform/image-pixels';
import { StylesheetService } from '../../../core/platform/stylesheet.service';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { InputField } from '../../../shared/ui/field/input';
import { Segmented, SegmentedOption } from '../../../shared/ui/segmented/segmented';
import { ColorGrid, gridToText } from '../data/color-grid';
import { IMAGE_GRID_COPY, ImageGridKey } from '../data/image-grid-copy';
import {
  DEFAULT_GRID_COLORS,
  DEFAULT_GRID_WIDTH,
  MAX_GRID_WIDTH,
  MIN_GRID_WIDTH,
  imageToGrid,
} from '../data/image-to-grid';
import { ChartIntake } from '../state/chart-intake';
import { ReaderStore } from '../state/reader-store';

const MIN_COLORS = 2;
const MAX_COLORS = 12;
/** L'aperçu attend que la lectrice ait fini de régler. */
const PREVIEW_DELAY_MS = 150;
const MAX_NAME = 60;

/**
 * « Ouvrir une image en grille » (fiche 48) : largeur, couleurs et sens de
 * travail, un aperçu qui suit les réglages, puis un nouveau projet grille.
 * Chargé par `import()` au choix d'une image, avec la réduction.
 */
@Component({
  selector: 'fil-image-grid-dialog',
  imports: [Button, Dialog, InputField, Segmented],
  template: `
    <fil-dialog [open]="true" (openChange)="!$event && close()" [label]="t('title')" [wide]="true">
      <h2 class="dialog-title">{{ t('title') }}</h2>
      <p class="dialog-body">{{ t('square') }}</p>
      <div class="image-grid">
        <div class="image-grid-settings">
          <div class="image-grid-field">
            <label for="image-grid-width">{{ t('width') }}</label>
            <div class="image-grid-stepper">
              <button
                type="button"
                filButton="secondary"
                [attr.aria-label]="t('less') + ' — ' + t('width')"
                [disabled]="width() <= MIN_WIDTH"
                (click)="setWidth(width() - 1)"
              >
                −
              </button>
              <input
                id="image-grid-width"
                filInput
                type="number"
                inputmode="numeric"
                [min]="MIN_WIDTH"
                [max]="MAX_WIDTH"
                [value]="width()"
                (change)="setWidth(+$any($event.target).value)"
              />
              <button
                type="button"
                filButton="secondary"
                [attr.aria-label]="t('more') + ' — ' + t('width')"
                [disabled]="width() >= MAX_WIDTH"
                (click)="setWidth(width() + 1)"
              >
                +
              </button>
            </div>
          </div>
          <div class="image-grid-field">
            <label for="image-grid-colors">{{ t('colors') }}</label>
            <div class="image-grid-stepper">
              <button
                type="button"
                filButton="secondary"
                [attr.aria-label]="t('less') + ' — ' + t('colors')"
                [disabled]="colors() <= MIN_COLORS"
                (click)="setColors(colors() - 1)"
              >
                −
              </button>
              <input
                id="image-grid-colors"
                filInput
                type="number"
                inputmode="numeric"
                [min]="MIN_COLORS"
                [max]="MAX_COLORS"
                [value]="colors()"
                (change)="setColors(+$any($event.target).value)"
              />
              <button
                type="button"
                filButton="secondary"
                [attr.aria-label]="t('more') + ' — ' + t('colors')"
                [disabled]="colors() >= MAX_COLORS"
                (click)="setColors(colors() + 1)"
              >
                +
              </button>
            </div>
          </div>
          <fil-segmented
            name="image-grid-worked"
            [label]="t('worked')"
            [options]="workedOptions()"
            [(selected)]="workedIndex"
          />
        </div>
        <figure class="image-grid-preview">
          @if (preview(); as p) {
            <svg
              role="img"
              [attr.aria-label]="t('preview') + ', ' + summary()"
              [attr.viewBox]="'0 0 ' + p.width + ' ' + p.height"
              preserveAspectRatio="xMidYMid meet"
            >
              @for (layer of p.layers; track $index) {
                <path [attr.d]="layer.d" [attr.fill]="layer.fill" />
              }
            </svg>
            <figcaption aria-live="polite">{{ summary() }}</figcaption>
          } @else {
            <p class="hint" role="status">{{ t('computing') }}</p>
          }
        </figure>
      </div>
      @if (saveFailed()) {
        <p class="hint" role="alert">{{ t('notSaved') }}</p>
      }
      <div class="dialog-actions">
        <button type="button" filButton="ghost" (click)="close()">{{ t('cancel') }}</button>
        <button
          type="button"
          filButton="primary"
          [disabled]="!grid() || creating()"
          (click)="create()"
        >
          {{ t('create') }}
        </button>
      </div>
    </fil-dialog>
  `,
})
export class ImageGridDialog {
  private readonly intake = inject(ChartIntake);
  private readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  protected readonly MIN_WIDTH = MIN_GRID_WIDTH;
  protected readonly MAX_WIDTH = MAX_GRID_WIDTH;
  protected readonly MIN_COLORS = MIN_COLORS;
  protected readonly MAX_COLORS = MAX_COLORS;

  protected t = (key: ImageGridKey) => IMAGE_GRID_COPY[this.i18n.locale()][key];

  protected readonly width = signal(DEFAULT_GRID_WIDTH);
  protected readonly colors = signal(DEFAULT_GRID_COLORS);
  protected readonly workedIndex = signal(0);
  protected readonly workedOptions = computed<SegmentedOption[]>(() => [
    { value: 0, label: this.t('flat') },
    { value: 1, label: this.t('round') },
  ]);

  private readonly pixels = signal<DecodedPixels | null>(null);
  protected readonly grid = signal<ColorGrid | null>(null);
  protected readonly creating = signal(false);
  protected readonly saveFailed = signal(false);

  /** Une couche par couleur : un tracé de rectangles, rang 1 en bas. */
  protected readonly preview = computed(() => {
    const grid = this.grid();
    if (!grid) return null;
    const paths = grid.palette.map(() => [] as string[]);
    for (let row = 0; row < grid.height; row++) {
      const y = grid.height - 1 - row;
      let start = 0;
      for (let column = 1; column <= grid.width; column++) {
        const color = grid.cells[row * grid.width + start];
        if (column < grid.width && grid.cells[row * grid.width + column] === color) continue;
        paths[color].push(`M${start} ${y}h${column - start}v1h${start - column}z`);
        start = column;
      }
    }
    return {
      width: grid.width,
      height: grid.height,
      layers: grid.palette
        .map((fill, i) => ({ fill, d: paths[i].join('') }))
        .filter((layer) => layer.d),
    };
  });

  protected readonly summary = computed(() => {
    const grid = this.grid();
    if (!grid) return '';
    const format = new Intl.NumberFormat(this.i18n.locale());
    return this.t('summary')
      .replace('{w}', String(grid.width))
      .replace('{h}', String(grid.height))
      .replace('{c}', String(new Set(grid.cells).size))
      .replace('{n}', format.format(grid.width * grid.height));
  });

  constructor() {
    inject(StylesheetService).load('chart.css');
    void this.decode();

    let timer: ReturnType<typeof setTimeout> | undefined;
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    effect(() => {
      const pixels = this.pixels();
      const options = {
        width: this.width(),
        colors: this.colors(),
        worked: this.workedIndex() === 1 ? ('round' as const) : ('flat' as const),
      };
      clearTimeout(timer);
      if (!pixels) return;
      // Le premier aperçu part tout de suite ; les suivants attendent la fin du réglage.
      if (!untracked(this.grid)) this.grid.set(imageToGrid(pixels, options));
      else timer = setTimeout(() => this.grid.set(imageToGrid(pixels, options)), PREVIEW_DELAY_MS);
    });
  }

  private async decode(): Promise<void> {
    const pixels = await this.intake.gridPixels;
    // Illisible ou démesurée (plus de 64 millions de pixels) : refus propre, dit à la lectrice.
    if (!pixels) this.intake.closeImageGrid(false, 'illisible');
    else this.pixels.set(pixels);
  }

  protected setWidth(value: number): void {
    if (!Number.isFinite(value)) return;
    this.width.set(Math.min(MAX_GRID_WIDTH, Math.max(MIN_GRID_WIDTH, Math.round(value))));
  }

  protected setColors(value: number): void {
    if (!Number.isFinite(value)) return;
    this.colors.set(Math.min(MAX_COLORS, Math.max(MIN_COLORS, Math.round(value))));
  }

  protected async create(): Promise<void> {
    const grid = this.grid();
    if (!grid || this.creating()) return;
    this.creating.set(true);
    this.saveFailed.set(false);
    const name = (this.intake.gridImage()?.name ?? '').replace(/\.[^.]*$/, '').slice(0, MAX_NAME);
    const saved = await this.store.openFromGrid(grid, gridToText(grid, this.i18n.locale()), name);
    this.creating.set(false);
    if (saved) this.intake.closeImageGrid(true);
    else this.saveFailed.set(true);
  }

  protected close(): void {
    this.intake.closeImageGrid(false);
  }
}
