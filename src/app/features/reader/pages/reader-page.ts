import { Component, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME } from '../../../core/seo/site';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { MaterialsList } from '../components/materials-list';
import { PatternImport } from '../components/pattern-import';
import { PrintView } from '../components/print-view';
import { ReaderCounters } from '../components/reader-counters';
import { StepView } from '../components/step-view';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ReaderStore } from '../state/reader-store';

interface GuideLink {
  readonly href: string;
  readonly title: string;
  readonly lead: string;
}

/**
 * Maille l'accueil vers les trois guides éditoriaux (fiche 04) : c'est la
 * seule page à fort trafic qui peut leur faire gagner du poids de lien
 * interne.
 */
const GUIDES: Record<Locale, { sectionTitle: string; items: readonly GuideLink[] }> = {
  fr: {
    sectionTitle: 'Pour aller plus loin',
    items: [
      {
        href: `${localePrefix('fr')}${ROUTE_PATHS.guideReadingPattern.fr}`,
        title: 'Comment lire un patron de crochet ou de tricot',
        lead: 'Abréviations, rangs, nombre de mailles entre parenthèses : la méthode expliquée pas à pas.',
      },
      {
        href: `${localePrefix('fr')}${ROUTE_PATHS.guideReadingChart.fr}`,
        title: 'Comment lire un diagramme de crochet',
        lead: 'Symboles, sens de lecture, diagramme en rang ou en rond.',
      },
      {
        href: `${localePrefix('fr')}${ROUTE_PATHS.guideCrochetOrKnitting.fr}`,
        title: 'Crochet ou tricot : par lequel commencer ?',
        lead: 'Les différences entre les deux techniques, pour choisir la sienne.',
      },
      {
        href: `${localePrefix('fr')}${ROUTE_PATHS.forDesigners.fr}`,
        title: 'Vous créez des patrons ?',
        lead: 'Un badge et un lien à offrir à vos clientes pour ouvrir votre patron directement dans le lecteur.',
      },
    ],
  },
  en: {
    sectionTitle: 'Go further',
    items: [
      {
        href: `${localePrefix('en')}${ROUTE_PATHS.guideReadingPattern.en}`,
        title: 'How to read a crochet or knitting pattern',
        lead: 'Abbreviations, rows, the stitch count in parentheses: the method explained step by step.',
      },
      {
        href: `${localePrefix('en')}${ROUTE_PATHS.guideReadingChart.en}`,
        title: 'How to read a crochet chart',
        lead: 'Symbols, reading direction, flat versus in-the-round charts.',
      },
      {
        href: `${localePrefix('en')}${ROUTE_PATHS.guideCrochetOrKnitting.en}`,
        title: 'Crochet or knitting: which to start with?',
        lead: 'The differences between the two crafts, to help you pick one.',
      },
      {
        href: `${localePrefix('en')}${ROUTE_PATHS.forDesigners.en}`,
        title: 'Do you design patterns?',
        lead: 'A badge and a link to give your customers, to open your pattern straight in the reader.',
      },
    ],
  },
};

/**
 * Bandeau d'accueil : le seul `<h1>` de la page, et une vraie image (pas un
 * décor CSS) pour que l'illustration soit indexée.
 */
const HERO: Record<Locale, { title: string; lead: string; alt: string }> = {
  fr: {
    title: 'Votre patron de crochet ou de tricot, une étape à la fois',
    lead: 'Collez un patron\u00a0: chaque rang s’affiche en grand, les répétitions se comptent et chaque abréviation s’explique au survol.',
    alt: 'Pelotes de laine rose, violette et jaune, un crochet et des aiguilles à tricoter',
  },
  en: {
    title: 'Your crochet or knitting pattern, one step at a time',
    lead: 'Paste a pattern: each row shows in large print, your repeats are counted and every abbreviation is explained on hover.',
    alt: 'Pink, purple and yellow balls of yarn with a crochet hook and knitting needles',
  },
};

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
  imports: [Dialog, MaterialsList, PatternImport, PrintView, ReaderCounters, RouterLink, StepView],
  host: {
    class: 'wrap',
    '(document:keydown)': 'onKeydown($event)',
    '(document:paste)': 'onPaste($event)',
    '(document:dragover)': 'onDragOver($event)',
    '(document:drop)': 'onDrop($event)',
  },
  template: `
    <section class="hero home-hero">
      <div>
        <h1>{{ hero.title }}</h1>
        <p>{{ hero.lead }}</p>
      </div>
      <!--
        Balise native plutôt que NgOptimizedImage : pour un SVG, il n'apporte
        ni srcset ni redimensionnement, et coûte 5,5 ko au bundle initial
        (mesuré), dont la marge se compte en kilo-octets.
      -->
      <img
        src="/illustrations/pelotes.svg"
        width="520"
        height="320"
        fetchpriority="high"
        [alt]="hero.alt"
      />
    </section>

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

    <hr class="hr" />

    <section>
      <h2>{{ guides.sectionTitle }}</h2>
      <div class="grid-cards">
        @for (item of guides.items; track item.href) {
          <!--
            Le résumé reste en dehors du lien : à l'intérieur, il hérite de la
            couleur d'accent et son opacité le fait passer sous le seuil de
            contraste AA (relevé par l'audit axe).
          -->
          <div class="card">
            <p class="card-title">
              <a [routerLink]="item.href">{{ item.title }}</a>
            </p>
            <p class="card-body">{{ item.lead }}</p>
          </div>
        }
      </div>
    </section>

    <fil-dialog [(open)]="linkConfirmOpen" [label]="t('ui.linkImportTitle')">
      <h2 class="dialog-title">{{ t('ui.linkImportTitle') }}</h2>
      <p class="dialog-body">{{ t('ui.linkImportBody') }}</p>
      <div class="dialog-actions">
        <button type="button" filButton="secondary" (click)="cancelLinkImport()">
          {{ t('ui.cancel') }}
        </button>
        <button type="button" filButton="primary" (click)="confirmLinkImport()">
          {{ t('ui.linkImportAction') }}
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

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];
  protected readonly hero = HERO[(this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE];
  protected readonly guides =
    GUIDES[(this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE];

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
