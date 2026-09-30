import { Component, DestroyRef, PLATFORM_ID, effect, inject, output, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PrintService } from '../../../core/platform/print.service';
import { Button } from '../../../shared/ui/button/button';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';

/** Un lien plus long qu'une adresse de partage usuelle est un lien qui échoue
 *  au collage dans certains outils : autant refuser avant plutôt que de
 *  livrer un lien tronqué, silencieusement cassé. */
const MAX_LINK_LENGTH = 8000;

/** Durée d'affichage de « Lien copié » : le temps de le lire, pas plus. */
export const COPIED_VISIBLE_MS = 3000;

/**
 * Actions du patron en cours : partager le patron (un lien qui l'ouvre à la
 * première étape, chez l'autre), imprimer, changer de patron. Un seul bouton
 * de partage : « Copier le lien du patron » et « Envoyer ce projet » copiaient
 * tous deux un lien, indiscernables pour la lectrice. Les liens de projet
 * (`#j=`) déjà envoyés s'ouvrent toujours (`reader-page.ts`).
 */
@Component({
  selector: 'fil-share-actions',
  imports: [Button],
  template: `
    <div class="import-actions">
      <button type="button" filButton="secondary" [disabled]="linkTooLong()" (click)="copyLink()">
        {{ t('ui.copyPatternLink') }}
      </button>
      <button type="button" filButton="secondary" (click)="print()">{{ t('ui.print') }}</button>
      <button type="button" filButton="ghost" (click)="changePattern.emit()">
        {{ t('ui.changePattern') }}
      </button>
    </div>
    @if (linkTooLong()) {
      <p class="hint" role="alert">{{ t('ui.linkTooLong') }}</p>
    }
    @if (linkCopied()) {
      <p class="hint" role="status">{{ t('ui.linkCopied') }}</p>
    }
    @if (linkCopyFailed()) {
      <p class="hint" role="alert">{{ t('ui.linkCopyFailed') }}</p>
    }
  `,
})
export class ShareActions {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);
  private readonly analytics = inject(AnalyticsService);
  private readonly printService = inject(PrintService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** « Changer de patron » ouvre le panneau d'import : la page parente seule
   *  sait où il vit et comment y amener le focus. */
  readonly changePattern = output<void>();

  protected readonly linkTooLong = signal(false);
  protected readonly linkCopied = signal(false);
  protected readonly linkCopyFailed = signal(false);
  private shareUrl: string | null = null;
  private shareTicket = 0;

  private hideCopied: ReturnType<typeof setTimeout> | undefined;

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];

  constructor() {
    // Prépare le lien de partage à l'avance : au clic sur « Copier le lien »,
    // il doit déjà être prêt, et le bouton doit déjà savoir s'il tient dans
    // l'URL. Inerte côté serveur : la compression n'a rien à faire au pré-rendu.
    effect(() => {
      const source = this.store.source();
      if (!this.isBrowser) return;
      void this.refreshShareUrl(source);
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.hideCopied));
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
      this.analytics.track('pattern_shared');
      // Une confirmation, pas un état : elle s'efface d'elle-même.
      clearTimeout(this.hideCopied);
      this.hideCopied = setTimeout(() => this.linkCopied.set(false), COPIED_VISIBLE_MS);
    } catch {
      // Presse-papiers refusé (permission, contexte non sécurisé) : on le dit
      // plutôt que d'échouer en silence.
      this.linkCopyFailed.set(true);
    }
  }

  protected print(): void {
    this.printService.print();
    this.analytics.track('print_opened');
  }
}
