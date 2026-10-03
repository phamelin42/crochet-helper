import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { decodePixels, paintCells } from '../../../core/platform/image-pixels';
import { StylesheetService } from '../../../core/platform/stylesheet.service';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { InputField } from '../../../shared/ui/field/input';
import { Segmented } from '../../../shared/ui/segmented/segmented';
import { ColorGrid } from '../data/color-grid';
import {
  GridPixels,
  MAX_IMAGE_GRID_WIDTH,
  MIN_IMAGE_GRID_WIDTH,
  imageToGrid,
} from '../data/image-to-grid';
import { ChartIntake } from '../state/chart-intake';

// Les textes vivent ici et non dans `reader-copy.ts` : la boîte n'existe
// qu'après le choix d'une image, elle ne doit pas peser sur le premier affichage.
const COPY = {
  fr: {
    title: 'Ouvrir une image en grille',
    hint: 'Chaque maille serrée devient un carré de couleur. Une maille serrée est à peu près carrée : l’image garde ses proportions.',
    width: 'Largeur en mailles',
    colors: 'Nombre de couleurs',
    less: 'Moins',
    more: 'Plus',
    worked: 'Façon de travailler',
    flat: 'À plat',
    round: 'En rond',
    preview: 'Aperçu de la grille',
    computing: 'Calcul de l’aperçu…',
    create: 'Créer la grille',
    cancel: 'Annuler',
    stitches: 'mailles',
    color: 'couleur',
    colorsPlural: 'couleurs',
    stitch: 'maille',
  },
  en: {
    title: 'Open an image as a grid',
    hint: 'Each single crochet becomes a square of colour. A single crochet is roughly square, so the image keeps its proportions.',
    width: 'Width in stitches',
    colors: 'Number of colours',
    less: 'Fewer',
    more: 'More',
    worked: 'How it is worked',
    flat: 'Flat',
    round: 'In the round',
    preview: 'Grid preview',
    computing: 'Computing the preview…',
    create: 'Create the grid',
    cancel: 'Cancel',
    stitches: 'stitches',
    color: 'colour',
    colorsPlural: 'colours',
    stitch: 'stitch',
  },
} as const;

/** Le côté des pixels gardés pour l'aperçu : plus que la largeur maximale, de quoi moyenner juste. */
const DECODE_SIDE = 600;
/** L'aperçu se recalcule 150 ms après le dernier réglage, pas à chaque touche. */
const PREVIEW_DELAY_MS = 150;
const MAX_NAME = 60;
const MIN_COLORS = 2;
const MAX_COLORS = 12;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(value)));

/**
 * Réglages d'une image à transformer en grille : largeur, couleurs, façon de
 * travailler, aperçu, puis un nouveau projet. Tout se passe sur l'appareil ;
 * chargée par `import()` depuis `ChartIntakeDialogs`.
 */
@Component({
  selector: 'fil-image-grid-dialog',
  imports: [Button, Dialog, InputField, Segmented],
  template: `
    @if (intake.gridFile()) {
      <fil-dialog [open]="true" (openChange)="!$event && intake.cancelGrid()" [label]="c.title">
        <h2 class="dialog-title">{{ c.title }}</h2>
        <p class="dialog-body">{{ c.hint }}</p>
        <div class="grid-maker">
          <canvas
            #preview
            class="grid-preview"
            role="img"
            [attr.aria-label]="c.preview + ' : ' + summary()"
          ></canvas>
          <p class="hint" role="status">{{ pending() ? c.computing : summary() }}</p>
          <div class="grid-setting">
            <label for="grid-width">{{ c.width }}</label>
            <div class="grid-stepper">
              <button
                type="button"
                filButton="secondary"
                [attr.aria-label]="c.less"
                [disabled]="width() <= MIN_WIDTH"
                (click)="setWidth(width() - 1)"
              >
                −
              </button>
              <input
                filInput
                id="grid-width"
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
                [attr.aria-label]="c.more"
                [disabled]="width() >= MAX_WIDTH"
                (click)="setWidth(width() + 1)"
              >
                +
              </button>
            </div>
          </div>
          <div class="grid-setting">
            <label for="grid-colors">{{ c.colors }}</label>
            <div class="grid-stepper">
              <button
                type="button"
                filButton="secondary"
                [attr.aria-label]="c.less"
                [disabled]="colors() <= MIN_COLORS"
                (click)="setColors(colors() - 1)"
              >
                −
              </button>
              <input
                filInput
                id="grid-colors"
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
                [attr.aria-label]="c.more"
                [disabled]="colors() >= MAX_COLORS"
                (click)="setColors(colors() + 1)"
              >
                +
              </button>
            </div>
          </div>
          <fil-segmented
            name="grid-worked"
            [label]="c.worked"
            [options]="workedOptions"
            [(selected)]="worked"
          />
        </div>
        <div class="dialog-actions">
          <button type="button" filButton="ghost" (click)="intake.cancelGrid()">
            {{ c.cancel }}
          </button>
          <button
            type="button"
            filButton="primary"
            [disabled]="!grid() || pending()"
            (click)="create()"
          >
            {{ c.create }}
          </button>
        </div>
      </fil-dialog>
    }
  `,
})
export class ImageGridDialog {
  protected readonly intake = inject(ChartIntake);
  private readonly i18n = inject(I18nService);
  protected readonly c = COPY[this.i18n.locale()];

  protected readonly MIN_WIDTH = MIN_IMAGE_GRID_WIDTH;
  protected readonly MAX_WIDTH = MAX_IMAGE_GRID_WIDTH;
  protected readonly MIN_COLORS = MIN_COLORS;
  protected readonly MAX_COLORS = MAX_COLORS;
  protected readonly workedOptions = [
    { value: 0, label: this.c.flat },
    { value: 1, label: this.c.round },
  ];

  protected readonly width = signal(40);
  protected readonly colors = signal(6);
  /** 0 : à plat, 1 : en rond (les valeurs d'un `Segmented`). */
  protected readonly worked = signal(0);

  private readonly pixels = signal<GridPixels | null>(null);
  protected readonly grid = signal<ColorGrid | null>(null);
  protected readonly pending = signal(true);
  private readonly preview = viewChild<ElementRef<HTMLCanvasElement>>('preview');

  protected readonly summary = computed(() => {
    const grid = this.grid();
    if (!grid) return '';
    const format = (n: number) => n.toLocaleString(this.i18n.locale());
    const used = new Set(grid.cells).size;
    return `${grid.width} × ${grid.height} ${this.c.stitches}, ${used} ${
      used > 1 ? this.c.colorsPlural : this.c.color
    }, ${format(grid.width * grid.height)} ${grid.width * grid.height > 1 ? this.c.stitches : this.c.stitch}`;
  });

  constructor() {
    void inject(StylesheetService).load('chart.css');
    let reading = 0;
    // Une image à la fois : si la lectrice en choisit une autre pendant le décodage, l'ancienne est ignorée.
    effect(() => {
      const file = this.intake.gridFile();
      const turn = ++reading;
      this.pixels.set(null);
      this.grid.set(null);
      this.pending.set(true);
      if (!file) return;
      void decodePixels(file, DECODE_SIDE).then((decoded) => {
        if (turn !== reading) return;
        if (decoded) this.pixels.set(decoded);
        else this.intake.failGridImage();
      });
    });
    effect((onCleanup) => {
      const pixels = this.pixels();
      const options = {
        width: this.width(),
        colors: this.colors(),
        worked: this.worked() === 1 ? ('round' as const) : ('flat' as const),
      };
      if (!pixels) return;
      this.pending.set(true);
      const timer = setTimeout(() => {
        this.grid.set(imageToGrid(pixels, options));
        this.pending.set(false);
      }, PREVIEW_DELAY_MS);
      onCleanup(() => clearTimeout(timer));
    });
    effect(() => {
      const grid = this.grid();
      const canvas = this.preview()?.nativeElement;
      if (grid && canvas) paintCells(canvas, grid.width, grid.height, grid.palette, grid.cells);
    });
  }

  protected setWidth(value: number): void {
    if (Number.isFinite(value)) this.width.set(clamp(value, MIN_IMAGE_GRID_WIDTH, MAX_IMAGE_GRID_WIDTH));
  }

  protected setColors(value: number): void {
    if (Number.isFinite(value)) this.colors.set(clamp(value, MIN_COLORS, MAX_COLORS));
  }

  protected create(): void {
    const grid = this.grid();
    const file = this.intake.gridFile();
    if (!grid || !file) return;
    const name = file.name.replace(/\.[^.]*$/, '').slice(0, MAX_NAME);
    void this.intake.createGrid(grid, name);
  }
}
