import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { StylesheetService } from '../../../core/platform/stylesheet.service';
import { Button } from '../../../shared/ui/button/button';
import { TooltipService } from '../../../shared/ui/tooltip/tooltip.service';
import {
  ColorGrid,
  colorAt,
  colorLetter,
  colorTotals,
  columnOf,
  nextChange,
  worksRightToLeft,
} from '../data/color-grid';
import { GRID_VIEW_COPY, GridViewKey } from '../data/grid-view-copy';
import { ReaderStore } from '../state/reader-store';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from './chart-viewer';

/** Côté d'une maille à l'échelle 1, en unités du dessin. */
const SIDE = 32;
/** Gouttières des numéros de rang, à gauche et à droite, et des numéros de maille, en haut. */
const GUTTER = 44;
const TOP = 28;
/** Sous ce côté, en pixels, la lettre de la couleur ne tient plus dans la maille. */
const MIN_LETTER_PX = 24;
/** Au-delà, une lettre par maille ferait des milliers de nœuds : seul le rang courant en porte. */
const MAX_LETTERED_CELLS = 2500;
/** « Voir tout » ne réduit pas sous 5 % : une grille de 150 mailles y tient déjà sur un téléphone. */
const MIN_WHOLE = 0.05;

/**
 * La grille de couleurs d'un projet, dans le cadre de l'affichage diagramme.
 * Le dessin (un `<rect>` par maille) ne dépend que de la grille : toucher une
 * maille ne le redessine pas, seuls le repère et l'estompage bougent. Le
 * toucher et le survol sont écoutés sur le `<svg>`, pas sur 22 500 rectangles.
 */
@Component({
  selector: 'fil-grid-view',
  imports: [Button],
  template: `
    <div class="chart-viewer chart-view">
      <div class="chart-toolbar" role="group" [attr.aria-label]="t('controls')">
        <button
          type="button"
          filButton="secondary"
          [disabled]="zoom() <= floor()"
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
        <button type="button" filButton="secondary" (click)="showWhole()">
          {{ t('whole') }}
        </button>
      </div>
      @if (grid(); as g) {
        <div
          #frame
          class="chart-frame"
          role="region"
          tabindex="0"
          [attr.aria-label]="t('frame')"
          (keydown)="onKey($event)"
          (click)="onTap($event)"
        >
          <svg
            class="chart-svg grid-svg"
            role="img"
            [attr.aria-label]="summary()"
            [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
            [attr.width]="width() * zoom()"
            [attr.height]="height() * zoom()"
            #svg
            (pointerover)="onHover($event)"
            (pointerleave)="tooltips.hide()"
          >
            @for (cell of cells(); track cell.i) {
              <rect
                [attr.x]="cell.x"
                [attr.y]="cell.y"
                [attr.width]="SIDE"
                [attr.height]="SIDE"
                [attr.fill]="cell.fill"
              />
            }
            @for (n of stitchNumbers(); track n.n) {
              <text class="grid-number" [attr.x]="n.x" [attr.y]="TOP - 8" text-anchor="middle">
                {{ n.n }}
              </text>
            }
            @for (n of rowNumbers(); track n.n) {
              <text
                class="grid-number"
                [attr.x]="GUTTER - 6"
                [attr.y]="n.y"
                text-anchor="end"
                [class.is-current]="n.current"
              >
                {{ n.n }}
              </text>
              <text
                class="grid-number"
                [attr.x]="GUTTER + g.width * SIDE + 6"
                [attr.y]="n.y"
                text-anchor="start"
                [class.is-current]="n.current"
              >
                {{ n.n }}
              </text>
            }
            @for (rect of dimmed(); track rect.key) {
              <rect
                class="grid-dim"
                [attr.x]="rect.x"
                [attr.y]="rect.y"
                [attr.width]="rect.width"
                [attr.height]="rect.height"
              />
            }
            @if (lettered()) {
              @for (cell of letters(); track cell.i) {
                <text
                  class="grid-letter"
                  [attr.x]="cell.x + SIDE / 2"
                  [attr.y]="cell.y + SIDE / 2"
                  text-anchor="middle"
                  dominant-baseline="central"
                >
                  {{ cell.letter }}
                </text>
              }
            }
            <rect
              class="grid-outline grid-outline-light"
              [attr.x]="rowBox().x"
              [attr.y]="rowBox().y"
              [attr.width]="rowBox().width"
              [attr.height]="SIDE"
            />
            <rect
              class="grid-outline grid-outline-row"
              [attr.x]="rowBox().x"
              [attr.y]="rowBox().y"
              [attr.width]="rowBox().width"
              [attr.height]="SIDE"
            />
            <rect
              #marker
              class="grid-outline grid-outline-light"
              [attr.x]="markerBox().x"
              [attr.y]="markerBox().y"
              [attr.width]="SIDE"
              [attr.height]="SIDE"
            />
            <rect
              class="grid-outline grid-outline-mark"
              [attr.x]="markerBox().x"
              [attr.y]="markerBox().y"
              [attr.width]="SIDE"
              [attr.height]="SIDE"
            />
            <path
              class="grid-arrow"
              [attr.d]="arrow()"
              [attr.transform]="
                'translate(' + (rowRtl() ? GUTTER - 6 : GUTTER + g.width * SIDE + 6) + ' 0)'
              "
            />
          </svg>
        </div>
        <p class="grid-help" role="status">{{ help() }}</p>
        <div class="chart-toolbar">
          <button
            type="button"
            filButton="secondary"
            [step]="true"
            [disabled]="!hasPrevious()"
            (click)="previous()"
          >
            {{ t('prev') }}
          </button>
          <button
            type="button"
            filButton="primary"
            [step]="true"
            [disabled]="!hasNext()"
            (click)="following()"
          >
            {{ t('next') }}
          </button>
          <button
            type="button"
            filButton="secondary"
            [step]="true"
            [disabled]="row() >= g.height - 1"
            (click)="nextRow()"
          >
            {{ t('nextRow') }}
          </button>
        </div>
        <ul class="grid-legend" [attr.aria-label]="t('legend')">
          @for (entry of legend(); track entry.letter) {
            <li>
              <svg class="grid-swatch" viewBox="0 0 16 16" aria-hidden="true">
                <rect width="16" height="16" [attr.fill]="entry.color" />
              </svg>
              <strong>{{ entry.letter }}</strong> · {{ entry.total }} {{ t('stitches') }}
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class GridView {
  protected readonly store = inject(ReaderStore);
  protected readonly tooltips = inject(TooltipService);
  private readonly i18n = inject(I18nService);
  private readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svg');
  private readonly markerRef = viewChild<ElementRef<SVGRectElement>>('marker');
  private readonly frameRef = viewChild<ElementRef<HTMLElement>>('frame');

  protected readonly SIDE = SIDE;
  protected readonly GUTTER = GUTTER;
  protected readonly TOP = TOP;
  protected readonly MIN_ZOOM = MIN_ZOOM;
  protected readonly MAX_ZOOM = MAX_ZOOM;
  protected readonly ZOOM_STEP = ZOOM_STEP;

  protected readonly zoom = signal(1);
  /**
   * Plus petite échelle permise : 50 %, ou moins si c'est ce qu'il faut pour
   * voir la grille entière dans son cadre. Mesurée au moment où l'on réduit.
   */
  protected readonly floor = signal(MIN_ZOOM);

  protected t = (key: GridViewKey) => GRID_VIEW_COPY[this.i18n.locale()][key];

  protected readonly grid = this.store.grid;
  protected readonly width = computed(() => GUTTER * 2 + (this.grid()?.width ?? 0) * SIDE);
  protected readonly height = computed(() => TOP + (this.grid()?.height ?? 0) * SIDE + 4);

  /** Rang courant, à partir de 0, et maille courante dans le sens de travail. */
  protected readonly row = computed(() =>
    Math.min(this.store.stepIndex(), Math.max(0, (this.grid()?.height ?? 1) - 1)),
  );
  protected readonly stitch = computed(() =>
    Math.min(this.store.stitchIndex(), Math.max(0, (this.grid()?.width ?? 1) - 1)),
  );
  protected readonly rowRtl = computed(() => {
    const grid = this.grid();
    return grid ? worksRightToLeft(grid, this.row()) : true;
  });

  private rowY(row: number): number {
    return TOP + ((this.grid()?.height ?? 1) - 1 - row) * SIDE;
  }

  /** Une entrée par maille : ne dépend que de la grille, jamais de la progression. */
  protected readonly cells = computed(() => {
    const grid = this.grid();
    if (!grid) return [];
    return Array.from(grid.cells, (color, i) => ({
      i,
      x: GUTTER + (i % grid.width) * SIDE,
      y: TOP + (grid.height - 1 - Math.floor(i / grid.width)) * SIDE,
      fill: grid.palette[color],
      letter: colorLetter(color),
      row: Math.floor(i / grid.width),
    }));
  });

  protected readonly lettered = computed(() => SIDE * this.zoom() >= MIN_LETTER_PX);
  protected readonly letters = computed(() => {
    const cells = this.cells();
    if (cells.length <= MAX_LETTERED_CELLS) return cells;
    const row = this.row();
    return cells.filter((cell) => cell.row === row);
  });

  protected readonly stitchNumbers = computed(() => {
    const grid = this.grid();
    if (!grid) return [];
    const columns = Array.from({ length: grid.width }, (_, c) => c + 1);
    return columns
      .filter((n) => n === 1 || n % 5 === 0)
      .map((n) => ({ n, x: GUTTER + (n - 0.5) * SIDE }));
  });

  protected readonly rowNumbers = computed(() => {
    const grid = this.grid();
    if (!grid) return [];
    const current = this.row();
    return Array.from({ length: grid.height }, (_, row) => ({
      n: row + 1,
      y: this.rowY(row) + SIDE / 2 + 5,
      current: row === current,
    }));
  });

  /** Colonne de la maille courante, et de la première maille encore à faire. */
  private readonly markerColumn = computed(() => {
    const grid = this.grid();
    return grid ? columnOf(grid, this.row(), this.stitch()) : 0;
  });

  protected readonly markerBox = computed(() => ({
    x: GUTTER + this.markerColumn() * SIDE,
    y: this.rowY(this.row()),
  }));

  protected readonly rowBox = computed(() => ({
    x: GUTTER,
    y: this.rowY(this.row()),
    width: (this.grid()?.width ?? 0) * SIDE,
  }));

  /**
   * Les mailles faites reculent : les rangs en dessous du courant, et dans le
   * courant les mailles déjà passées. Trois rectangles au plus.
   */
  protected readonly dimmed = computed(() => {
    const grid = this.grid();
    if (!grid) return [];
    const y = this.rowY(this.row());
    const rects: { key: string; x: number; y: number; width: number; height: number }[] = [];
    if (this.row() > 0) {
      rects.push({
        key: 'below',
        x: GUTTER,
        y: y + SIDE,
        width: grid.width * SIDE,
        height: this.row() * SIDE,
      });
    }
    const done = this.stitch();
    if (done > 0) {
      const column = this.markerColumn();
      rects.push({
        key: 'row',
        x: this.rowRtl() ? GUTTER + (column + 1) * SIDE : GUTTER,
        y,
        width: done * SIDE,
        height: SIDE,
      });
    }
    return rects;
  });

  /** Une flèche dans la gouttière du bord d'où part le rang courant, dirigée vers l'intérieur. */
  protected readonly arrow = computed(() => {
    const y = this.rowY(this.row()) + SIDE / 2;
    return this.rowRtl()
      ? `M0 ${y - 7} L-12 ${y} L0 ${y + 7} Z`
      : `M0 ${y - 7} L12 ${y} L0 ${y + 7} Z`;
  });

  protected readonly legend = computed(() => {
    const grid = this.grid();
    if (!grid) return [];
    const totals = colorTotals(grid);
    return grid.palette.map((color, i) => ({ color, letter: colorLetter(i), total: totals[i] }));
  });

  protected readonly summary = computed(() => {
    const grid = this.grid();
    if (!grid) return '';
    return `${this.t('row')} ${this.row() + 1} ${this.t('of')} ${grid.height}, ${this.t('stitch')} ${this.stitch() + 1} ${this.t('of')} ${grid.width}`;
  });

  /** « Rang 12 · maille 7 sur 40 · encore 3 en A, puis B » */
  protected readonly help = computed(() => {
    const grid = this.grid();
    if (!grid) return '';
    const row = this.row();
    const stitch = this.stitch();
    const head = `${this.t('row')} ${row + 1} · ${this.t('stitch')} ${stitch + 1} ${this.t('of')} ${grid.width}`;
    const here = colorLetter(colorAt(grid, row, stitch));
    const remaining = nextChange(grid, row, stitch);
    if (remaining === null) {
      const left = grid.width - 1 - stitch;
      return left ? `${head} · ${this.t('toEnd')} ${here}` : `${head} · ${this.t('rowDone')}`;
    }
    const next = colorLetter(colorAt(grid, row, stitch + remaining + 1));
    return remaining
      ? `${head} · ${this.t('more')} ${remaining} ${this.t('in')} ${here}, ${this.t('then')} ${next}`
      : `${head} · ${this.t('then')} ${next}`;
  });

  protected readonly hasPrevious = computed(() => this.row() > 0 || this.stitch() > 0);
  protected readonly hasNext = computed(() => {
    const grid = this.grid();
    return !!grid && (this.row() < grid.height - 1 || this.stitch() < grid.width - 1);
  });

  constructor() {
    inject(StylesheetService).load('chart.css');
    // Une grande grille défile jusqu'à la maille : on la retrouve au retour.
    effect(() => {
      this.markerBox();
      this.markerRef()?.nativeElement.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  }

  protected zoomBy(delta: number): void {
    const floor = Math.min(MIN_ZOOM, this.wholeScale());
    this.floor.set(floor);
    this.zoom.update((zoom) => Math.min(MAX_ZOOM, Math.max(floor, zoom + delta)));
  }

  /** Toute la grille d'un coup d'œil : l'échelle qui la fait tenir dans le cadre. */
  protected showWhole(): void {
    const scale = this.wholeScale();
    this.floor.set(Math.min(MIN_ZOOM, scale));
    this.zoom.set(scale);
  }

  /** Échelle à laquelle la grille tient entière dans le cadre, sans dépasser la taille réelle. */
  private wholeScale(): number {
    const frame = this.frameRef()?.nativeElement;
    if (!frame?.clientWidth || !frame.clientHeight) return MIN_ZOOM;
    // Une grille qui ne déborde pas en hauteur tient déjà verticalement : on ne
    // l'agrandit pas, puisque la hauteur libre du cadre n'est pas mesurable.
    const tall = frame.scrollHeight > frame.clientHeight;
    const fitWidth = frame.clientWidth / this.width();
    const fitHeight = tall ? frame.clientHeight / this.height() : this.zoom();
    const scale = Math.floor(Math.min(fitWidth, fitHeight, 1) * 100) / 100;
    return Math.max(MIN_WHOLE, scale);
  }

  protected previous(): void {
    const grid = this.grid() as ColorGrid;
    if (this.stitch() > 0) this.store.markStitch(this.row(), this.stitch() - 1);
    else if (this.row() > 0) this.store.markStitch(this.row() - 1, grid.width - 1);
  }

  protected following(): void {
    const grid = this.grid() as ColorGrid;
    if (this.stitch() < grid.width - 1) this.store.markStitch(this.row(), this.stitch() + 1);
    else if (this.row() < grid.height - 1) this.store.markStitch(this.row() + 1, 0);
  }

  protected nextRow(): void {
    this.store.markStitch(this.row() + 1, 0);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    // Les flèches suivent le dessin, pas le sens de travail : à droite, c'est la colonne suivante.
    const forward = (event.key === 'ArrowRight') === !this.rowRtl();
    if (forward) this.following();
    else this.previous();
  }

  /** La maille sous le pointeur : rang et position dans le sens de travail, ou `null` hors grille. */
  private cellAt(event: MouseEvent): { row: number; stitch: number } | null {
    const grid = this.grid();
    const svg = this.svgRef()?.nativeElement;
    if (!grid || !svg) return null;
    const box = svg.getBoundingClientRect();
    const scale = this.zoom();
    const column = Math.floor(((event.clientX - box.left) / scale - GUTTER) / SIDE);
    const line = Math.floor(((event.clientY - box.top) / scale - TOP) / SIDE);
    if (column < 0 || column >= grid.width || line < 0 || line >= grid.height) return null;
    const row = grid.height - 1 - line;
    return { row, stitch: worksRightToLeft(grid, row) ? grid.width - 1 - column : column };
  }

  protected onTap(event: MouseEvent): void {
    const hit = this.cellAt(event);
    if (hit) this.store.markStitch(hit.row, hit.stitch);
  }

  /** Au doigt, l'infobulle masquerait la maille que l'on touche : pointeur fin seulement. */
  protected onHover(event: PointerEvent): void {
    const grid = this.grid();
    if (!grid || event.pointerType === 'touch' || this.tooltips.isStationaryHover(event)) return;
    const hit = this.cellAt(event);
    if (!hit) return;
    const color = colorAt(grid, hit.row, hit.stitch);
    this.tooltips.showFor(
      event.target as unknown as HTMLElement,
      `${this.t('row')} ${hit.row + 1}, ${this.t('stitch')} ${hit.stitch + 1}`,
      `${this.t('colour')} ${colorLetter(color)} (${grid.palette[color]})`,
    );
  }
}
