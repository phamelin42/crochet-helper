import { Component, ElementRef, effect, inject, model, signal, viewChild } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { InputField } from '../../../shared/ui/field/input';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ChartIntake } from '../state/chart-intake';
import { ReaderStore } from '../state/reader-store';

/**
 * Panneau d'import : coller ou taper le texte du patron, ou charger
 * l'exemple. Replié dès qu'un patron est chargé pour
 * laisser la place au lecteur.
 */
@Component({
  selector: 'fil-pattern-import',
  imports: [Button, Dialog, Disclosure, InputField],
  template: `
    <fil-disclosure
      [label]="t('ui.import')"
      [state]="state()"
      [(open)]="open"
      variant="import"
      class="import-host"
    >
      <div class="import-body">
        <div>
          <div class="field">
            <label for="pattern-source">{{ t('ui.paste') }}</label>
            <textarea
              #source
              filInput
              id="pattern-source"
              class="src-input"
              spellcheck="false"
              [value]="store.source()"
              [attr.placeholder]="t('ui.placeholder')"
            ></textarea>
          </div>
          <div class="import-actions">
            <button type="button" filButton="primary" (click)="load(source.value)">
              {{ t('ui.load') }}
            </button>
            <button
              type="button"
              filButton="secondary"
              [disabled]="store.pdfImporting()"
              (click)="pdfInput().nativeElement.click()"
            >
              {{ store.pdfImporting() ? t('ui.pdfLoading') : t('ui.pdfOpen') }}
            </button>
            <button
              type="button"
              filButton="secondary"
              [disabled]="intake.busy()"
              (click)="openInput().nativeElement.click()"
            >
              {{ intake.busy() ? t('ui.chartBusy') : t('ui.chartOpen') }}
            </button>
            <button
              type="button"
              filButton="secondary"
              data-testid="grid-open"
              (click)="gridInput().nativeElement.click()"
            >
              {{ t('ui.gridOpen') }}
            </button>
            <button type="button" filButton="secondary" (click)="demo()">{{ t('ui.demo') }}</button>
            <button type="button" filButton="ghost" (click)="clear()">{{ t('ui.clear') }}</button>
          </div>
          <input
            #pdfFile
            type="file"
            accept="application/pdf,.pdf"
            class="visually-hidden"
            tabindex="-1"
            aria-hidden="true"
            (change)="onPdfChange($event)"
          />
          <input
            #openFile
            data-testid="chart-open-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
            class="visually-hidden"
            tabindex="-1"
            aria-hidden="true"
            (change)="onOpenChange($event)"
          />
          <input
            #gridFile
            data-testid="grid-open-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="visually-hidden"
            tabindex="-1"
            aria-hidden="true"
            (change)="onGridChange($event)"
          />
          @if (pdfErrorMessage(); as message) {
            <p class="hint" role="alert">{{ message }}</p>
          } @else if (noRows()) {
            <p class="hint" role="alert">{{ t('ui.noRows') }}</p>
          } @else if (emptyText()) {
            <p class="hint" role="alert">{{ t('ui.emptyText') }}</p>
          }
        </div>
      </div>
    </fil-disclosure>

    @if (clearOpen()) {
      <fil-dialog [(open)]="clearOpen" [label]="t('ui.clearConfirmTitle')">
        <h2 class="dialog-title">{{ t('ui.clearConfirmTitle') }}</h2>
        <p class="dialog-body">{{ t('ui.clearConfirmBody') }}</p>
        <div class="dialog-actions">
          <button type="button" filButton="secondary" (click)="clearOpen.set(false)">
            {{ t('ui.cancel') }}
          </button>
          <button type="button" filButton="primary" (click)="confirmClear()">
            {{ t('ui.clearConfirmAction') }}
          </button>
        </div>
      </fil-dialog>
    }
  `,
})
export class PatternImport {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  readonly open = model(true);
  private readonly source = viewChild<ElementRef<HTMLTextAreaElement>>('source');
  protected readonly pdfInput = viewChild.required<ElementRef<HTMLInputElement>>('pdfFile');
  protected readonly gridInput = viewChild.required<ElementRef<HTMLInputElement>>('gridFile');
  protected readonly openInput = viewChild.required<ElementRef<HTMLInputElement>>('openFile');
  protected readonly intake = inject(ChartIntake);

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  /**
   * Texte chargé, mais aucun rang reconnu : sans ce message, « Split into
   * steps » ne faisait rien de visible et la lectrice ne savait pas pourquoi.
   */
  protected readonly noRows = signal(false);
  /** « Découper » sur un champ vide : le panneau reste ouvert et le dit. */
  protected readonly emptyText = signal(false);
  protected readonly clearOpen = signal(false);

  constructor() {
    // Rouvre le panneau dès qu'une erreur de PDF survient, y compris quand le
    // PDF a été collé ou déposé ailleurs sur la page, panneau replié.
    effect(() => {
      if (this.store.pdfError()) this.open.set(true);
    });
    // Un diagramme relu et découpé en étapes : le panneau se replie comme après « Découper ».
    effect(() => {
      if (this.intake.opened()) this.open.set(false);
    });
  }

  protected state(): string {
    const total = this.store.total();
    return total ? `${total} ${this.t('ui.loaded')}` : this.t('ui.noPattern');
  }

  protected pdfErrorMessage(): string | null {
    const error = this.store.pdfError();
    if (error === 'vide') return this.t('ui.pdfEmpty');
    if (error === 'erreur') return this.t('ui.pdfError');
    return null;
  }

  protected load(text: string): void {
    // Un champ vide ne touche pas au projet actif : `load('')` remettrait son
    // texte et sa progression à zéro.
    this.emptyText.set(!text.trim());
    if (this.emptyText()) return;
    this.store.load(text);
    if (this.reportNoRows()) return;
    this.open.set(false);
  }

  /** Vrai, et le panneau reste ouvert avec le message, si rien n'est découpé. */
  private reportNoRows(): boolean {
    const empty = !!this.store.source().trim() && this.store.total() === 0;
    this.noRows.set(empty);
    return empty;
  }

  protected async onPdfChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    await this.store.importPdf(file);
    if (this.store.pdfError()) return;
    const field = this.source();
    if (field) field.nativeElement.value = this.store.source();
    if (this.reportNoRows()) return;
    this.open.set(false);
  }

  protected async onOpenChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.intake.open(file);
  }

  protected onGridChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.intake.chooseGridImage(file);
  }

  protected demo(): void {
    this.store.loadDemo();
    const field = this.source();
    if (field) field.nativeElement.value = this.store.source();
    if (this.reportNoRows()) return;
    this.open.set(false);
  }

  /** Effacer un patron chargé demande confirmation, comme supprimer un projet. */
  protected clear(): void {
    if (this.store.currentId()) this.clearOpen.set(true);
    else this.resetField();
  }

  protected confirmClear(): void {
    this.clearOpen.set(false);
    this.store.clear();
    this.resetField();
  }

  private resetField(): void {
    this.noRows.set(false);
    this.emptyText.set(false);
    const field = this.source();
    if (field) field.nativeElement.value = '';
  }

  /** Amène le focus dans le champ de collage — utilisé par le lien « Changer
   *  de patron » du mode lecture, une fois le panneau rouvert. */
  focusSource(): void {
    this.source()?.nativeElement.focus();
  }
}
