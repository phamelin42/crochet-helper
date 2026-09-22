import { Component, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale } from '../../../core/i18n/locale';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME } from '../../../core/seo/site';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { MaterialsList } from '../components/materials-list';
import { PatternImport } from '../components/pattern-import';
import { PrintView } from '../components/print-view';
import { ReaderCounters } from '../components/reader-counters';
import { StepView } from '../components/step-view';
import { ReaderStore } from '../state/reader-store';

const SEO: Record<Locale, { title: string; description: string }> = {
  fr: {
    title: `Lecteur de patrons crochet et tricot — ${SITE_NAME}`,
    description:
      'Collez votre patron de crochet ou de tricot : découpage en étapes, une instruction à la fois, compteur de rangs et abréviations traduites. Gratuit, sans compte.',
  },
  en: {
    title: `Crochet and knitting pattern reader — ${SITE_NAME}`,
    description:
      'Paste your crochet or knitting pattern: split into steps, one instruction at a time, with a row counter and abbreviations explained. Free, no account.',
  },
};

/**
 * Page du lecteur : import, étape en cours, compteurs, matériel.
 *
 * Les raccourcis clavier sont posés ici plutôt que dans les composants
 * enfants — une seule page les écoute, et ils restent inactifs quand le focus
 * est dans un champ de saisie.
 */
@Component({
  selector: 'fil-reader-page',
  imports: [Dialog, MaterialsList, PatternImport, PrintView, ReaderCounters, StepView],
  host: {
    class: 'wrap',
    '(document:keydown)': 'onKeydown($event)',
    '(document:paste)': 'onPaste($event)',
    '(document:dragover)': 'onDragOver($event)',
    '(document:drop)': 'onDrop($event)',
  },
  template: `
    <fil-pattern-import />

    <section class="reader">
      <div>
        <fil-step-view />
      </div>
    </section>

    <hr class="hr" />

    <fil-reader-counters />

    @if (store.materials().length) {
      <fil-materials-list />
    }

    <fil-print-view />

    <fil-dialog [(open)]="linkConfirmOpen" [label]="i18n.t('ui.linkImportTitle')">
      <h2 class="dialog-title">{{ i18n.t('ui.linkImportTitle') }}</h2>
      <p class="dialog-body">{{ i18n.t('ui.linkImportBody') }}</p>
      <div class="dialog-actions">
        <button type="button" filButton="secondary" (click)="cancelLinkImport()">
          {{ i18n.t('ui.cancel') }}
        </button>
        <button type="button" filButton="primary" (click)="confirmLinkImport()">
          {{ i18n.t('ui.linkImportAction') }}
        </button>
      </div>
    </fil-dialog>
  `,
})
export class ReaderPage {
  protected readonly store = inject(ReaderStore);
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly linkConfirmOpen = signal(false);
  private pendingLinkSource: string | null = null;

  constructor() {
    const locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
    this.i18n.setLocale(locale);
    this.seo.apply({
      ...SEO[locale],
      path: ROUTE_PATHS.reader,
      locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: SITE_NAME,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        description: SEO[locale].description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        featureList: [
          'Découpage automatique en étapes',
          'Compteur de rangs et de répétitions',
          'Glossaire crochet et tricot FR/EN',
          'Chronomètre de session',
        ],
      },
    });

    // Attend la restauration du projet en cours avant de lire un éventuel
    // permalien : sinon un patron en cours de reprise depuis IndexedDB
    // pourrait être écrasé sans confirmation, la course arrivant avant lui.
    if (isPlatformBrowser(this.platformId)) {
      const untilRestored = effect(() => {
        if (!this.store.restored()) return;
        untilRestored.destroy();
        void this.loadFromFragment();
      });
    }
  }

  /** Lit `#p=…` au démarrage : un permalien de patron partagé, jamais un paramètre
   *  de requête, pour qu'il ne parte ni dans les journaux serveur ni le `Referer`. */
  private async loadFromFragment(): Promise<void> {
    const hash = window.location.hash;
    if (!hash.startsWith('#p=')) return;
    const { decodePattern } = await import('../data/pattern-link');
    const decoded = await decodePattern(hash.slice('#p='.length));
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!decoded || decoded === this.store.source()) return;
    if (this.store.source()) {
      this.pendingLinkSource = decoded;
      this.linkConfirmOpen.set(true);
      return;
    }
    this.store.load(decoded, 'lien');
  }

  /** Le patron en cours reste enregistré dans « Mes projets » : `clear()` ne le
   *  supprime pas, il libère seulement l'affichage pour le patron du lien. */
  protected confirmLinkImport(): void {
    if (this.pendingLinkSource === null) return;
    this.store.clear();
    this.store.load(this.pendingLinkSource, 'lien');
    this.pendingLinkSource = null;
    this.linkConfirmOpen.set(false);
  }

  protected cancelLinkImport(): void {
    this.pendingLinkSource = null;
    this.linkConfirmOpen.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' || event.metaKey || event.ctrlKey || event.altKey)
      return;

    switch (event.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        event.preventDefault();
        this.store.move(1);
        break;
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault();
        this.store.move(-1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.store.addRepeat(1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.store.addRepeat(-1);
        break;
      default:
    }
  }

  /** Coller une image, un PDF ou un patron entier n'importe où sur la page l'importe. */
  protected onPaste(event: ClipboardEvent): void {
    const file = event.clipboardData?.files?.[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => this.store.setImage(String(reader.result));
      reader.readAsDataURL(file);
      event.preventDefault();
      return;
    }
    if (file?.type === 'application/pdf') {
      event.preventDefault();
      this.store.importPdf(file);
      return;
    }
    if ((event.target as HTMLElement | null)?.tagName === 'TEXTAREA') return;
    const text = event.clipboardData?.getData('text') ?? '';
    if (text.trim().length > 20) {
      this.store.load(text);
      event.preventDefault();
    }
  }

  /** Autorise le dépôt sur la page : nécessaire pour que `drop` se déclenche. */
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  /** Un PDF déposé n'importe où sur la page suit le même chemin que le bouton
   *  et le collage. Les images gardent leur comportement actuel : pas de dépôt géré. */
  protected onDrop(event: DragEvent): void {
    const file = event.dataTransfer?.files?.[0];
    if (file?.type !== 'application/pdf') return;
    event.preventDefault();
    this.store.importPdf(file);
  }
}
