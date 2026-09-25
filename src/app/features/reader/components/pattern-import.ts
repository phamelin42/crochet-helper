import {
  Component,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { InputField } from '../../../shared/ui/field/input';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { SharedProgress } from '../data/project-link';
import { ReaderStore } from '../state/reader-store';

/** Un lien plus long qu'une adresse de partage usuelle est un lien qui échoue
 *  au collage dans certains outils : autant refuser avant plutôt que de
 *  livrer un lien tronqué, silencieusement cassé. */
const MAX_LINK_LENGTH = 8000;

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
            @if (store.total()) {
              <button
                type="button"
                filButton="secondary"
                [disabled]="linkTooLong()"
                (click)="copyLink()"
              >
                {{ t('ui.copyLink') }}
              </button>
            }
            @if (store.currentId()) {
              <button
                type="button"
                filButton="secondary"
                [disabled]="projectLinkTooLong()"
                (click)="sendProject()"
              >
                {{ t('ui.sendProject') }}
              </button>
            }
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
          @if (pdfErrorMessage(); as message) {
            <p class="hint" role="alert">{{ message }}</p>
          }
          @if (linkTooLong()) {
            <p class="hint" role="alert">{{ t('ui.linkTooLong') }}</p>
          }
          @if (linkCopied()) {
            <p class="hint" role="status">{{ t('ui.linkCopied') }}</p>
          }
          @if (linkCopyFailed()) {
            <p class="hint" role="alert">{{ t('ui.linkCopyFailed') }}</p>
          }
          @if (store.currentId()) {
            <p class="hint">{{ t('ui.projectShareHint') }}</p>
          }
          @if (projectLinkTooLong()) {
            <p class="hint" role="alert">{{ t('ui.projectLinkTooLong') }}</p>
          }
          @if (projectLinkCopied()) {
            <p class="hint" role="status">{{ t('ui.linkCopied') }}</p>
          }
          @if (projectLinkCopyFailed()) {
            <p class="hint" role="alert">{{ t('ui.linkCopyFailed') }}</p>
          }
        </div>
      </div>
    </fil-disclosure>
  `,
})
export class PatternImport {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);
  private readonly analytics = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly open = signal(true);
  private readonly source = viewChild<ElementRef<HTMLTextAreaElement>>('source');
  protected readonly pdfInput = viewChild.required<ElementRef<HTMLInputElement>>('pdfFile');

  protected readonly linkTooLong = signal(false);
  protected readonly linkCopied = signal(false);
  protected readonly linkCopyFailed = signal(false);
  private shareUrl: string | null = null;
  private shareTicket = 0;

  protected readonly projectLinkTooLong = signal(false);
  protected readonly projectLinkCopied = signal(false);
  protected readonly projectLinkCopyFailed = signal(false);
  private projectShareUrl: string | null = null;
  private projectShareTicket = 0;

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  constructor() {
    // Rouvre le panneau dès qu'une erreur de PDF survient, y compris quand le
    // PDF a été collé ou déposé ailleurs sur la page, panneau replié.
    effect(() => {
      if (this.store.pdfError()) this.open.set(true);
    });

    // Prépare le lien de partage à l'avance : au clic sur « Copier le lien »,
    // il doit déjà être prêt, et le bouton doit déjà savoir s'il tient dans
    // l'URL. Inerte côté serveur : la compression n'a rien à faire au pré-rendu.
    effect(() => {
      const source = this.store.source();
      if (!this.isBrowser) return;
      void this.refreshShareUrl(source);
    });

    // Même principe pour le lien de projet : refait à chaque changement de
    // position, de rang coché ou de répétition — pas seulement au chargement.
    effect(() => {
      const progress: SharedProgress = {
        source: this.store.source(),
        name: this.store.currentName(),
        pieceIndex: this.store.pieceIndex(),
        stepIndex: this.store.stepIndex(),
        done: this.store.done(),
        reps: this.store.reps(),
      };
      if (!this.isBrowser) return;
      void this.refreshProjectShareUrl(progress);
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

  private async refreshShareUrl(source: string): Promise<void> {
    const ticket = ++this.shareTicket;
    this.linkCopied.set(false);
    this.linkCopyFailed.set(false);
    if (!source) {
      this.shareUrl = null;
      this.linkTooLong.set(false);
      return;
    }
    // Chargé à la demande : le permalien n'a pas sa place dans le bundle initial.
    const { encodePattern } = await import('../data/pattern-link');
    const encoded = await encodePattern(source);
    if (ticket !== this.shareTicket) return; // une saisie plus récente a pris le dessus
    const url = `${window.location.origin}${window.location.pathname}#p=${encoded}`;
    this.shareUrl = url;
    this.linkTooLong.set(url.length > MAX_LINK_LENGTH);
  }

  protected async copyLink(): Promise<void> {
    if (!this.shareUrl || this.linkTooLong()) return;
    try {
      await navigator.clipboard.writeText(this.shareUrl);
      this.linkCopied.set(true);
    } catch {
      // Presse-papiers refusé (permission, contexte non sécurisé) : on le dit
      // plutôt que d'échouer en silence.
      this.linkCopyFailed.set(true);
    }
  }

  private async refreshProjectShareUrl(progress: SharedProgress): Promise<void> {
    const ticket = ++this.projectShareTicket;
    this.projectLinkCopied.set(false);
    this.projectLinkCopyFailed.set(false);
    if (!progress.source) {
      this.projectShareUrl = null;
      this.projectLinkTooLong.set(false);
      return;
    }
    // Chargé à la demande : le lien de projet n'a pas sa place dans le bundle initial.
    const { encodeProject } = await import('../data/project-link');
    const encoded = await encodeProject(progress);
    if (ticket !== this.projectShareTicket) return; // une progression plus récente a pris le dessus
    const url = `${window.location.origin}${window.location.pathname}#j=${encoded}`;
    this.projectShareUrl = url;
    this.projectLinkTooLong.set(url.length > MAX_LINK_LENGTH);
  }

  protected async sendProject(): Promise<void> {
    if (!this.projectShareUrl || this.projectLinkTooLong()) return;
    try {
      await navigator.clipboard.writeText(this.projectShareUrl);
      this.projectLinkCopied.set(true);
      this.analytics.track('project_shared');
    } catch {
      this.projectLinkCopyFailed.set(true);
    }
  }
}
