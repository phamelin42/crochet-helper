import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiRefusal } from '../../../core/ai/format-client.token';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { InputField } from '../../../shared/ui/field/input';
import { AI_FORMAT_URL_TOKEN, AI_INTEREST_URL_TOKEN } from '../data/ai-format';
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
  imports: [Button, Checkbox, Dialog, Disclosure, InputField, RouterLink],
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
          @if (aiUrl) {
            <div class="field">
              <fil-checkbox [(checked)]="aiChecked" [label]="t('ui.aiLabel')" />
              <p class="hint">
                {{ t('ui.aiHelp') }}
                <a [routerLink]="i18n.link('privacy')">{{ t('ui.aiPrivacy') }}</a>
              </p>
            </div>
          }
          <div class="import-actions">
            <button
              type="button"
              filButton="primary"
              [disabled]="busy()"
              (click)="load(source.value)"
            >
              {{ t('ui.load') }}
            </button>
            <button type="button" filButton="secondary" [disabled]="busy()" (click)="openPdf()">
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
          @if (aiUrl) {
            <div aria-live="polite">
              @if (store.aiBusy()) {
                <p class="hint">{{ t('ui.aiBusy') }}</p>
              } @else if (store.aiRefusal(); as raison) {
                <p class="hint">{{ refusalText(raison, store.aiDetail()) }}</p>
                @if (refusalCode(raison, store.aiDetail()); as code) {
                  <p class="hint">{{ t('ui.aiCode') }} {{ code }}</p>
                }
                @if (raison === 'quota-jour' || raison === 'budget-mois') {
                  <p class="hint">
                    {{ t('ui.aiSorry') }}
                    @if (interestUrl) {
                      {{ t('ui.aiAsk') }}
                      <a [href]="interestUrl" target="_blank" rel="noopener">{{
                        t('ui.aiAskLink')
                      }}</a
                      >{{ t('ui.aiAskEnd') }}
                    }
                  </p>
                }
              }
            </div>
          }
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

    @if (store.sourceBeforeAi() !== null) {
      <p class="hint">
        {{ doneText() }}
        <button type="button" filButton="ghost" (click)="revertOpen.set(true)">
          {{ t('ui.aiRevert') }}
        </button>
      </p>
    }

    @if (revertOpen()) {
      <fil-dialog [(open)]="revertOpen" [label]="t('ui.aiRevertTitle')">
        <h2 class="dialog-title">{{ t('ui.aiRevertTitle') }}</h2>
        <p class="dialog-body">{{ t('ui.aiRevertBody') }}</p>
        <div class="dialog-actions">
          <button type="button" filButton="secondary" (click)="revertOpen.set(false)">
            {{ t('ui.cancel') }}
          </button>
          <button type="button" filButton="primary" (click)="confirmRevert()">
            {{ t('ui.aiRevert') }}
          </button>
        </div>
      </fil-dialog>
    }

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
  protected readonly i18n = inject(I18nService);
  protected readonly aiUrl = inject(AI_FORMAT_URL_TOKEN);
  protected readonly interestUrl = inject(AI_INTEREST_URL_TOKEN);

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
  /** Jamais mémorisée : chaque ouverture du panneau repart décochée. */
  protected readonly aiChecked = signal(false);
  protected readonly revertOpen = signal(false);
  protected readonly busy = computed(() => this.store.pdfImporting() || this.store.aiBusy());

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

  /**
   * Dit la vraie cause : le Worker et le client donnent une raison et, souvent, un
   * détail (« trop-court:25% »). Un détail inconnu retombe sur le message général.
   */
  protected refusalText(raison: AiRefusal, detail: string | null): string {
    if (raison === 'quota-jour') return this.t('ui.aiDay');
    if (raison === 'budget-mois') return this.t('ui.aiMonth');
    if (raison === 'trop-long') return this.t('ui.aiTooLong');
    if (raison === 'reseau') return this.t('ui.aiNetwork');
    if (raison === 'delai') return this.t('ui.aiSlow');
    if (raison === 'echec') {
      if (detail?.startsWith('trop-court')) return this.t('ui.aiShort');
      if (detail?.startsWith('nombres:')) return this.t('ui.aiNumbers');
      if (detail === 'vide' || detail?.startsWith('arret:')) return this.t('ui.aiIncomplete');
    }
    if (raison === 'indisponible' && detail !== null) return this.t('ui.aiDown');
    return this.t('ui.aiFailed');
  }

  /**
   * Le code technique, pour s'en servir en cas de doute : la raison et son détail.
   * Pas pour les limites d'usage, dont le message dit tout.
   */
  protected refusalCode(raison: AiRefusal, detail: string | null): string {
    if (raison === 'quota-jour' || raison === 'budget-mois') return '';
    return detail ? `${raison} · ${detail}` : raison;
  }

  protected doneText(): string {
    const left = this.store.aiRemaining();
    return left === null
      ? this.t('ui.aiDoneShort')
      : this.t('ui.aiDone').replace('{n}', String(left));
  }

  /** Vrai si la mise en forme est demandée : case cochée et Worker renseigné. La case repart décochée. */
  private wantsAi(): boolean {
    const wanted = this.aiChecked() && !!this.aiUrl;
    this.aiChecked.set(false);
    return wanted;
  }

  /** Refus ou échec : le panneau reste ouvert, le message est dessous. */
  private keepOpenForAiMessage(): boolean {
    return this.store.aiRefusal() !== null;
  }

  protected async load(text: string): Promise<void> {
    // Un champ vide ne touche pas au projet actif : `load('')` remettrait son
    // texte et sa progression à zéro.
    this.emptyText.set(!text.trim());
    if (this.emptyText()) return;
    if (this.wantsAi()) await this.store.loadText(text, true);
    else this.store.load(text); // synchrone : pas d'attente sans IA
    if (this.reportNoRows() || this.keepOpenForAiMessage()) return;
    this.open.set(false);
  }

  /** Le client se charge au clic, pas au choix du fichier : le service worker le ferait attendre. */
  protected openPdf(): void {
    if (this.aiChecked() && this.aiUrl) void import('../../../core/ai/format-client');
    this.pdfInput().nativeElement.click();
  }

  protected confirmRevert(): void {
    this.revertOpen.set(false);
    this.store.restoreSourceBeforeAi();
    const field = this.source();
    if (field) field.nativeElement.value = this.store.source();
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
    await this.store.importPdf(file, this.wantsAi());
    if (this.store.pdfError()) return;
    const field = this.source();
    if (field) field.nativeElement.value = this.store.source();
    if (this.reportNoRows() || this.keepOpenForAiMessage()) return;
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
