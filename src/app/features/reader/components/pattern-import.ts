import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { InputField } from '../../../shared/ui/field/input';
import { ReaderStore } from '../state/reader-store';

/**
 * Panneau d'import : coller ou taper le texte du patron, ou charger
 * l'exemple. Replié dès qu'un patron est chargé pour
 * laisser la place au lecteur.
 */
@Component({
  selector: 'fil-pattern-import',
  imports: [Button, Disclosure, InputField],
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
            <button type="button" filButton="secondary" (click)="demo()">{{ t('ui.demo') }}</button>
            <button type="button" filButton="ghost" (click)="clear()">{{ t('ui.clear') }}</button>
          </div>
          <input
            #pdfInput
            type="file"
            accept="application/pdf,.pdf"
            class="visually-hidden"
            (change)="onPdfChange($event)"
          />
          @if (pdfErrorMessage(); as message) {
            <p class="hint" role="alert">{{ message }}</p>
          }
        </div>
      </div>
    </fil-disclosure>
  `,
  styles: `
    .import-host {
      display: block;
    }
  `,
})
export class PatternImport {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  readonly open = signal(true);
  private readonly source = viewChild<ElementRef<HTMLTextAreaElement>>('source');
  private readonly pdfInput = viewChild.required<ElementRef<HTMLInputElement>>('pdfInput');

  protected t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);

  constructor() {
    // Rouvre le panneau dès qu'une erreur de PDF survient, y compris quand le
    // PDF a été collé ou déposé ailleurs sur la page, panneau replié.
    effect(() => {
      if (this.store.pdfError()) this.open.set(true);
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
    this.store.load(text);
    this.open.set(false);
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
    this.open.set(false);
  }

  protected demo(): void {
    this.store.loadDemo();
    const field = this.source();
    if (field) field.nativeElement.value = this.store.source();
    this.open.set(false);
  }

  protected clear(): void {
    this.store.clear();
    const field = this.source();
    if (field) field.nativeElement.value = '';
  }
}
