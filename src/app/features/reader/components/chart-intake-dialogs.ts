import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ObjectUrlService } from '../../../core/platform/object-url.service';
import { StylesheetService } from '../../../core/platform/stylesheet.service';
import { Button } from '../../../shared/ui/button/button';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ChartIntake, MAX_PDF_CHART_PAGES, MAX_RENDERED_PAGES } from '../state/chart-intake';
import { ReaderStore, ShownPhoto } from '../state/reader-store';
import { ChartComposer } from './chart-composer';

interface PageThumb {
  readonly number: number;
  readonly url: string;
}

/**
 * Les questions du chargement d'un diagramme : « couverture ou
 * diagramme ? » pour une image collée ou déposée, le choix des pages d'un
 * PDF, et la relecture d'un diagramme ouvert comme patron. Montées hors du panneau d'import, replié une fois le patron chargé :
 * une boîte de dialogue dans un panneau fermé ne s'afficherait pas.
 */
@Component({
  selector: 'fil-chart-intake-dialogs',
  imports: [Button, ChartComposer, Checkbox, Dialog],
  template: `
    @if (message(); as message) {
      <p class="hint" role="alert">{{ message }}</p>
    }

    @if (intake.question()) {
      <fil-dialog
        [open]="true"
        (openChange)="!$event && intake.cancelQuestion()"
        [label]="t('ui.chartAskTitle')"
      >
        <h2 class="dialog-title">{{ t('ui.chartAskTitle') }}</h2>
        <div class="dialog-actions">
          <button type="button" filButton="ghost" (click)="intake.cancelQuestion()">
            {{ t('ui.chartCancel') }}
          </button>
          <button type="button" filButton="secondary" (click)="intake.answerCover()">
            {{ t('ui.chartAskCover') }}
          </button>
          <button type="button" filButton="primary" (click)="intake.answerChart()">
            {{ t('ui.chartAskChart') }}
          </button>
        </div>
      </fil-dialog>
    }

    @if (intake.pages()) {
      <fil-dialog
        [open]="true"
        (openChange)="!$event && intake.closePages()"
        [label]="t('ui.chartPdfTitle')"
        [wide]="true"
      >
        <h2 class="dialog-title">{{ t('ui.chartPdfTitle') }}</h2>
        <p class="dialog-body">{{ t('ui.chartPdfHint') }}</p>
        @if (intake.pdfTotal() > MAX_RENDERED_PAGES) {
          <p class="hint" role="status">{{ t('ui.chartPdfTruncated') }}</p>
        }
        <ul class="chart-pages">
          @for (thumb of thumbs(); track thumb.number) {
            <li>
              <img [src]="thumb.url" alt="" decoding="async" />
              <fil-checkbox
                [label]="t('ui.chartPage') + ' ' + thumb.number"
                [checked]="selected().has(thumb.number)"
                [disabled]="!selected().has(thumb.number) && selected().size >= MAX_PAGES"
                (checkedChange)="toggle(thumb.number, $event)"
              />
            </li>
          }
        </ul>
        <div class="dialog-actions">
          <button type="button" filButton="ghost" (click)="intake.closePages()">
            {{ t('ui.chartCancel') }}
          </button>
          <button type="button" filButton="primary" [disabled]="!selected().size" (click)="add()">
            {{ t('ui.chartPdfAdd') }}
          </button>
        </div>
      </fil-dialog>
    }

    @if (intake.opening(); as opening) {
      <fil-chart-composer
        mode="open"
        [open]="true"
        (openChange)="!$event && intake.cancelOpening()"
        [seed]="opening.recognition"
        [chart]="preview()"
        [label]="t('ui.chartOf')"
        (composed)="confirm($event)"
      />
    }
  `,
})
export class ChartIntakeDialogs {
  protected readonly intake = inject(ChartIntake);
  private readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);
  private readonly objectUrls = inject(ObjectUrlService);

  protected readonly MAX_PAGES = MAX_PDF_CHART_PAGES;
  protected readonly MAX_RENDERED_PAGES = MAX_RENDERED_PAGES;

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  /** Le refus du dernier diagramme, dit hors du panneau d'import, replié une fois le patron chargé. */
  protected readonly message = computed(() => {
    const error = this.intake.error();
    if (error === 'format') return this.t('ui.chartErrorFormat');
    if (error === 'lourd') return this.t('ui.chartErrorHeavy');
    if (error === 'illisible') return this.t('ui.chartErrorUnreadable');
    if (error === 'pdf') return this.t('ui.chartErrorPdf');
    const stored = this.store.chartError();
    if (stored === 'non-enregistre') return this.t('ui.chartNotSaved');
    if (stored === 'plafond') return this.t('ui.chartLimit');
    return '';
  });

  protected readonly thumbs = signal<readonly PageThumb[]>([]);
  /** Le diagramme lu, affiché au-dessus de sa transcription pour la comparer. */
  protected readonly preview = signal<ShownPhoto | null>(null);
  protected readonly selected = signal<ReadonlySet<number>>(new Set());

  constructor() {
    const styles = inject(StylesheetService);
    // Les adresses `blob:` des vignettes suivent les pages : révoquées à la
    // fermeture ou avant d'en créer d'autres.
    effect(() => {
      const pages = this.intake.pages();
      untracked(() => {
        if (pages) void styles.load('chart.css');
        this.thumbs().forEach((thumb) => this.objectUrls.revoke(thumb.url));
        this.selected.set(new Set());
        this.thumbs.set(
          (pages ?? []).map((page) => ({
            number: page.number,
            url: this.objectUrls.create(page.blob),
          })),
        );
      });
    });
    effect(() => {
      const chart = this.intake.opening()?.charts[0] ?? null;
      untracked(() => {
        if (chart) void styles.load('chart.css');
        const previous = this.preview();
        if (previous) this.objectUrls.revoke(previous.url);
        this.preview.set(
          chart
            ? { url: this.objectUrls.create(chart.blob), width: chart.width, height: chart.height }
            : null,
        );
      });
    });
  }

  protected confirm(text: string): void {
    void this.intake.confirmOpening(text);
  }

  protected toggle(number: number, checked: boolean): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (checked && next.size < MAX_PDF_CHART_PAGES) next.add(number);
      else next.delete(number);
      return next;
    });
  }

  protected add(): void {
    void this.intake.addPages([...this.selected()]);
  }
}
