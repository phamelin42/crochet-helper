import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppModeService } from '../../../core/platform/app-mode.service';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { DisplayPrefsService } from '../../../core/platform/display-prefs.service';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME } from '../../../core/seo/site';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { Icon } from '../../../shared/ui/icon/icon';
import { Tile } from '../../../shared/ui/tile/tile';
import { ChartIntakeDialogs } from '../components/chart-intake-dialogs';
import { ViewChoiceSlot } from '../components/view-choice-slot';
import { MaterialsList } from '../components/materials-list';
import { PatternImport } from '../components/pattern-import';
import { PrintView } from '../components/print-view';
import { PatternPhotos } from '../components/pattern-photos';
import { ReaderCounters } from '../components/reader-counters';
import { StepView } from '../components/step-view';
import { InstallSlot } from '../components/install-slot';
import { WaitlistBanner } from '../components/waitlist-banner';
import { READER_COPY, ReaderTranslationKey } from '../data/reader-copy';
import { ChartIntake } from '../state/chart-intake';
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
      {
        href: `${localePrefix('fr')}${ROUTE_PATHS.rowCounter.fr}`,
        title: 'Compteur de rangs en ligne',
        lead: 'Comptez vos rangs d’une main, avec un objectif optionnel et sa barre de progression.',
      },
      {
        href: `${localePrefix('fr')}${ROUTE_PATHS.hookSizes.fr}`,
        title: 'Tailles de crochet : mm ↔ US',
        lead: 'Le tableau complet, et un chercheur pour passer de « G-6 » à « 4 mm ».',
      },
      {
        href: `${localePrefix('fr')}${ROUTE_PATHS.gaugeCalculator.fr}`,
        title: 'Calculateur d’échantillon',
        lead: 'Comparez votre échantillon à celui du patron : crochet plus gros ou plus fin, mailles à monter.',
      },
      {
        href: `${localePrefix('fr')}${ROUTE_PATHS.readForeignPattern.fr}`,
        title: 'Lire un patron anglais',
        lead: 'Collez un rang anglais : chaque abréviation s’écrit en français.',
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
      {
        href: `${localePrefix('en')}${ROUTE_PATHS.rowCounter.en}`,
        title: 'Online row counter',
        lead: 'Count your rows one-handed, with an optional target and progress bar.',
      },
      {
        href: `${localePrefix('en')}${ROUTE_PATHS.hookSizes.en}`,
        title: 'Crochet hook sizes: mm ↔ US',
        lead: 'The full chart, and a finder to go from "G-6" to "4 mm".',
      },
      {
        href: `${localePrefix('en')}${ROUTE_PATHS.gaugeCalculator.en}`,
        title: 'Gauge calculator',
        lead: 'Compare your swatch with the pattern’s: bigger or finer hook, stitches to cast on.',
      },
      {
        href: `${localePrefix('en')}${ROUTE_PATHS.readForeignPattern.en}`,
        title: 'Reading a French pattern',
        lead: 'Paste a French row: every abbreviation is written out in English.',
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

/** Les trois preuves listées sous l'accroche (audit UX-2 : rien ne distingue
 *  l'outil d'une application à compte avant qu'on l'ait essayé). */
const PROOFS: Record<Locale, readonly string[]> = {
  fr: [
    'Gratuit, sans compte',
    'Vos patrons restent sur votre appareil',
    'Marche sans connexion, une fois ouvert',
    'N’importe quel patron : PDF acheté, blog, magazine',
  ],
  en: [
    'Free, no account',
    'Your patterns stay on your device',
    'Works offline, once opened',
    'Any pattern: a bought PDF, a blog, a magazine',
  ],
};

interface HomeStep {
  readonly title: string;
  readonly lead: string;
}

interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

interface HomeCopy {
  readonly ctaExample: string;
  readonly ctaPaste: string;
  readonly howItWorksTitle: string;
  readonly steps: readonly HomeStep[];
  readonly faqTitle: string;
  readonly faq: readonly FaqItem[];
}

/**
 * Contenu propre à l'accueil quand aucun patron n'est chargé (fiche 26) :
 * « Comment ça marche » et la FAQ. Reste dans la page
 * paresseuse plutôt que dans `reader-copy.ts`, partagé par des composants qui
 * chargent avec le lecteur lui-même.
 */
const HOME_COPY: Record<Locale, HomeCopy> = {
  fr: {
    ctaExample: 'Voir un exemple',
    ctaPaste: 'Coller mon patron',
    howItWorksTitle: 'Comment ça marche',
    steps: [
      {
        title: '1. Collez, ou déposez un PDF',
        lead: 'Le texte de votre patron, copié depuis un site, un PDF ou tapé à la main : l’outil accepte tout, sans mise en forme particulière à respecter.',
      },
      {
        title: '2. Découpez en étapes',
        lead: 'Chaque rang devient une étape numérotée, prête à s’afficher une par une, en très grand caractère, avec ses mailles à compter.',
      },
      {
        title: '3. Avancez d’un geste, les répétitions se comptent',
        lead: 'Une touche, un clic ou un geste sur tablette passe à la suite ; le compteur de répétitions et le chronomètre de session suivent tout seuls.',
      },
    ],
    faqTitle: 'Questions fréquentes',
    faq: [
      {
        question: 'Est-ce gratuit ?',
        answer:
          'Oui, l’outil est entièrement gratuit et le restera pour l’usage de base : coller un patron, le découper en étapes, compter les rangs et les répétitions. Aucune carte bancaire n’est demandée nulle part.',
      },
      {
        question: 'Faut-il créer un compte ?',
        answer:
          'Non, aucun compte n’est nécessaire pour utiliser l’outil. Vos patrons sont enregistrés automatiquement dans le navigateur, sur l’appareil que vous utilisez.',
      },
      {
        question: 'Où vont mes patrons ?',
        answer:
          'Nulle part : le texte que vous collez n’est jamais envoyé à un serveur. Il reste dans la mémoire de votre navigateur, comme un brouillon que vous seule pouvez lire.',
      },
      {
        question: 'Ça marche avec un PDF acheté sur Etsy ?',
        answer:
          'Oui, tant que le PDF contient du texte sélectionnable, ce qui est le cas de la plupart des patrons vendus en ligne. Un PDF qui n’est qu’une image scannée ne peut pas être lu automatiquement : collez alors le texte à la main dans la zone prévue.',
      },
      {
        question: 'Et pour le tricot ?',
        answer:
          'Oui : l’outil découpe aussi bien un patron de tricot qu’un patron de crochet. Les rangs, les répétitions et les abréviations fonctionnent de la même façon pour les deux techniques.',
      },
      {
        question: 'Quelle différence avec une application de patrons ?',
        answer:
          'Cet outil ne vend et n’héberge aucun patron : vous apportez le vôtre, d’où qu’il vienne — un PDF acheté, un blog, un magazine — et il se contente de le découper et de l’afficher, une étape à la fois.',
      },
    ],
  },
  en: {
    ctaExample: 'See an example',
    ctaPaste: 'Paste my pattern',
    howItWorksTitle: 'How it works',
    steps: [
      {
        title: '1. Paste, or drop a PDF',
        lead: 'The text of your pattern, copied from a website, a PDF, or typed by hand: the tool accepts it as is, with no particular formatting to follow.',
      },
      {
        title: '2. Split into steps',
        lead: 'Each row becomes a numbered step, ready to display one at a time, in very large print, with its stitches to count.',
      },
      {
        title: '3. Move forward with one gesture, repeats count themselves',
        lead: 'A tap, a click, or a swipe on tablet moves to the next step; the repeat counter and the session timer keep track on their own.',
      },
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        question: 'Is it free?',
        answer:
          'Yes, the tool is entirely free and will stay free for everyday use: pasting a pattern, splitting it into steps, counting rows and repeats. No card is ever asked for.',
      },
      {
        question: 'Do I need an account?',
        answer:
          'No account is needed to use the tool. Your patterns are saved automatically in the browser, on the device you are using.',
      },
      {
        question: 'Where do my patterns go?',
        answer:
          'Nowhere: the text you paste is never sent to a server. It stays in your browser’s memory, like a draft only you can read.',
      },
      {
        question: 'Does it work with a PDF bought on Etsy?',
        answer:
          'Yes, as long as the PDF has selectable text, which is the case for most patterns sold online. A PDF that is only a scanned image can’t be read automatically: paste the text by hand into the box instead.',
      },
      {
        question: 'What about knitting?',
        answer:
          'Yes: the tool splits knitting patterns just as well as crochet ones. Rows, repeats and abbreviations work the same way for both crafts.',
      },
      {
        question: 'What’s the difference with a pattern app?',
        answer:
          'This tool doesn’t sell or host any patterns: you bring your own, from wherever it comes — a bought PDF, a blog, a magazine — and it simply splits it and displays it, one step at a time.',
      },
    ],
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
  imports: [
    Button,
    ChartIntakeDialogs,
    ViewChoiceSlot,
    Dialog,
    Disclosure,
    Icon,
    MaterialsList,
    PatternImport,
    PrintView,
    PatternPhotos,
    ReaderCounters,
    RouterLink,
    InstallSlot,
    StepView,
    Tile,
    WaitlistBanner,
  ],
  host: {
    class: 'wrap',
    '(document:keydown)': 'onKeydown($event)',
    '(document:paste)': 'onPaste($event)',
    '(document:dragover)': 'onDragOver($event)',
    '(document:drop)': 'onDrop($event)',
  },
  template: `
    @if (!store.step()) {
      <section class="hero home-hero">
        <div>
          <h1>{{ hero.title }}</h1>
          <p>{{ hero.lead }}</p>
          <ul class="proof-list">
            @for (proof of proofs; track proof) {
              <li><fil-icon name="check" />{{ proof }}</li>
            }
          </ul>
          <div class="cta-row">
            <button type="button" filButton="primary" (click)="loadExample()">
              {{ homeCopy.ctaExample }}
            </button>
            <button type="button" filButton="secondary" (click)="focusPaste()">
              {{ homeCopy.ctaPaste }}
            </button>
          </div>
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

      <fil-install-slot />

      <fil-pattern-import [(open)]="importOpen" />
    }

    <section class="reader">
      <div>
        <fil-step-view (changePattern)="changePattern()" />
      </div>
    </section>

    <hr class="hr" />

    @if (store.step()) {
      <fil-reader-counters />

      <fil-pattern-photos />

      <fil-pattern-import [(open)]="importOpen" />

      <fil-waitlist-banner />
    } @else {
      <section class="how-it-works">
        <h2>{{ homeCopy.howItWorksTitle }}</h2>
        <div class="grid-steps">
          @for (step of homeCopy.steps; track step.title) {
            <fil-tile [label]="step.title">
              <p>{{ step.lead }}</p>
            </fil-tile>
          }
        </div>
      </section>
    }

    @if (store.materials().length) {
      <fil-materials-list />
    }

    <fil-print-view />

    <fil-chart-intake-dialogs />
    <fil-view-choice-slot />

    @if (!store.step()) {
      <hr class="hr" />

      <section class="faq">
        <h2>{{ homeCopy.faqTitle }}</h2>
        <div class="faq-list">
          @for (item of homeCopy.faq; track item.question) {
            <fil-disclosure [label]="item.question" variant="import">
              <p class="faq-answer">{{ item.answer }}</p>
            </fil-disclosure>
          }
        </div>
      </section>

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
    }

    @if (linkConfirmOpen()) {
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
    }
  `,
})
export default class ReaderPage {
  protected readonly store = inject(ReaderStore);
  protected readonly i18n = inject(I18nService);
  private readonly analytics = inject(AnalyticsService);
  private readonly seo = inject(SeoService);
  private readonly prefs = inject(DisplayPrefsService);
  private readonly appMode = inject(AppModeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  protected t = (key: ReaderTranslationKey) => READER_COPY[this.i18n.locale()][key];
  protected readonly hero = HERO[(this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE];
  protected readonly guides =
    GUIDES[(this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE];
  protected readonly proofs =
    PROOFS[(this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE];
  protected readonly homeCopy =
    HOME_COPY[(this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE];

  protected readonly linkConfirmOpen = signal(false);
  private pendingLinkSource: string | null = null;

  protected readonly importOpen = signal(true);
  private readonly patternImport = viewChild(PatternImport);
  private readonly intake = inject(ChartIntake);

  constructor() {
    const locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
    this.i18n.setLocale(locale);
    this.seo.apply({
      ...SEO[locale],
      path: ROUTE_PATHS.reader,
      locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
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
          {
            '@type': 'FAQPage',
            mainEntity: HOME_COPY[locale].faq.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
        ],
      },
    });

    // Le mode page pleine n'existe qu'avec un patron chargé, et seulement sur
    // cette page : le pré-rendu et les autres routes gardent la page complète.
    effect(() => this.prefs.applyFocus(!!this.store.step() && this.prefs.focus()));
    inject(DestroyRef).onDestroy(() => this.prefs.applyFocus(false));

    // Attend la restauration du projet en cours avant de lire un éventuel
    // permalien : sinon un patron en cours de reprise depuis IndexedDB
    // pourrait être écrasé sans confirmation, la course arrivant avant lui.
    if (isPlatformBrowser(this.platformId)) {
      const untilRestored = effect(() => {
        if (!this.store.restored()) return;
        untilRestored.destroy();
        if (this.opensOnProjects()) {
          void this.router.navigateByUrl(this.i18n.link('projects'));
          return;
        }
        void this.loadFromFragment();
      });
    }
  }

  /** À l'ouverture de l'application, « Mes projets » s'il en existe un, sinon
   *  l'import. Une fois par session, sur l'accueil seulement, et jamais quand
   *  un permalien attend d'être lu. */
  private opensOnProjects(): boolean {
    return (
      this.appMode.consumeLaunch() &&
      this.route.snapshot.url.length === 0 &&
      !window.location.hash &&
      this.store.projects().length > 0
    );
  }

  /** Bouton primaire du bandeau : charge le patron de démonstration et amène
   *  l'étape en cours dans la fenêtre, sans attendre que la lectrice cherche
   *  le lecteur plus bas dans la page. */
  protected loadExample(): void {
    this.analytics.track('home_cta', { cta: 'example' });
    this.store.loadDemo();
    document.querySelector('.reader')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Bouton secondaire du bandeau : amène directement le focus dans la zone
   *  de texte du panneau d'import, déjà ouvert par défaut sans patron chargé. */
  protected focusPaste(): void {
    this.analytics.track('home_cta', { cta: 'paste' });
    document.getElementById('pattern-source')?.focus();
  }

  /** Lit `#p=…` ou `#j=…` au démarrage : un permalien de patron ou de projet
   *  partagé, jamais un paramètre de requête, pour qu'il ne parte ni dans les
   *  journaux serveur ni le `Referer`. */
  private async loadFromFragment(): Promise<void> {
    const hash = window.location.hash;
    if (hash.startsWith('#j=')) {
      await this.loadSharedProject(hash.slice('#j='.length));
      return;
    }
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

  /** Un lien de projet (`#j=`) ouvre toujours une copie neuve, sans jamais
   *  demander confirmation : le projet actif, lui, n'est pas remplacé — il
   *  reste dans « Mes projets », intact. */
  private async loadSharedProject(encoded: string): Promise<void> {
    const { decodeProject } = await import('../data/project-link');
    const decoded = await decodeProject(encoded);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!decoded) return;
    this.store.receiveSharedProject(decoded);
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

  /** Rouvre le panneau d'import et y amène le focus — un battement après le
   *  clic, le temps que `<details open>` reflète le nouvel état. */
  protected changePattern(): void {
    this.importOpen.set(true);
    setTimeout(() => this.patternImport()?.focusSource());
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
      event.preventDefault();
      void this.intake.receive(file);
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
   *  et le collage ; une image demande s'il s'agit d'une couverture ou d'un diagramme. */
  protected onDrop(event: DragEvent): void {
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) {
      event.preventDefault();
      void this.intake.receive(file);
      return;
    }
    if (file?.type !== 'application/pdf') return;
    event.preventDefault();
    this.store.importPdf(file);
  }
}
