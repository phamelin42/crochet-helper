import { NgComponentOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Type,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { Icon, IconName } from '../../../shared/ui/icon/icon';
import { READER_COPY } from '../../reader/data/reader-copy';
import { ChartIntake } from '../../reader/state/chart-intake';

const NBSP = ' ';

interface Step {
  readonly icon: IconName;
  readonly title: string;
  readonly body: string;
}

interface ImageGridCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly choose: string;
  readonly privacyNote: string;
  readonly h2Steps: string;
  readonly steps: readonly Step[];
  readonly faqTitle: string;
  readonly faq: readonly { readonly q: string; readonly a: string }[];
  readonly backToReader: string;
  readonly toChartGuide: string;
}

// Les textes vivent dans la page, pas dans `translations.ts` : ils n'ont rien à faire dans le bundle initial.
const COPY: Record<Locale, ImageGridCopy> = {
  fr: {
    seoTitle: 'Transformer une image en grille de crochet, gratuit',
    seoDescription:
      'Choisissez une photo ou un dessin : il devient une grille de mailles serrées colorées, à suivre maille par maille. Gratuit, sans compte, rien n’est envoyé.',
    h1: 'Transformer une image en grille de crochet',
    lead: `Choisissez une photo ou un dessin${NBSP}: Fil le découpe en mailles serrées colorées, que vous suivez ensuite maille par maille. Gratuit, sans compte, et l’image ne quitte jamais votre appareil.`,
    choose: 'Choisir une image',
    privacyNote: 'PNG, JPEG ou WebP, 10 Mo au plus. L’image reste sur votre appareil.',
    h2Steps: 'Comment ça marche',
    steps: [
      {
        icon: 'image',
        title: '1. Choisissez l’image',
        body: 'Une photo, un dessin, un logo. Les images simples, aux contours nets, donnent les grilles les plus lisibles.',
      },
      {
        icon: 'sliders',
        title: '2. Réglez largeur et couleurs',
        body: 'Fixez le nombre de mailles par rang et le nombre de fils de couleurs. L’aperçu se met à jour sous vos yeux.',
      },
      {
        icon: 'check',
        title: '3. Suivez maille par maille',
        body: 'La grille s’ouvre dans le lecteur : touchez la maille où vous en êtes, Fil la retient et vous la retrouvez à la prochaine séance.',
      },
    ],
    faqTitle: 'Questions fréquentes',
    faq: [
      {
        q: 'Est-ce gratuit ?',
        a: 'Oui, entièrement, et sans compte à créer. Vous choisissez une image, vous obtenez une grille.',
      },
      {
        q: 'Mon image est-elle envoyée quelque part ?',
        a: 'Non. Tout se passe dans votre navigateur : l’image n’est ni envoyée ni conservée, seule la grille obtenue est enregistrée sur votre appareil. Cela fonctionne même hors connexion une fois la page chargée.',
      },
      {
        q: 'Combien de mailles aura ma grille ?',
        a: 'C’est vous qui choisissez la largeur, de quelques mailles à plusieurs dizaines ; la hauteur suit les proportions de l’image. Le nombre total de mailles s’affiche avant de créer la grille.',
      },
      {
        q: 'Quel point utiliser ?',
        a: 'La maille serrée : chaque case de la grille en représente une. Elle est à peu près carrée, ce qui garde les proportions de l’image. Vous pouvez travailler à plat ou en rond.',
      },
    ],
    backToReader: 'Ouvrir le lecteur de patron',
    toChartGuide: 'Comment lire un diagramme de crochet',
  },
  en: {
    seoTitle: 'Turn an image into a crochet chart — Pattern Reader',
    seoDescription:
      'Pick a photo or a drawing and turn it into a grid of coloured single crochet stitches to follow stitch by stitch. Free, no account, nothing is uploaded.',
    h1: 'Turn an image into a crochet chart',
    lead: 'Pick a photo or a drawing: Fil breaks it into coloured single crochet stitches, then lets you follow them stitch by stitch. Free, no account, and the image never leaves your device.',
    choose: 'Choose an image',
    privacyNote: 'PNG, JPEG or WebP, 10 MB at most. The image stays on your device.',
    h2Steps: 'How it works',
    steps: [
      {
        icon: 'image',
        title: '1. Choose the image',
        body: 'A photo, a drawing, a logo. Simple pictures with clear outlines make the most readable charts.',
      },
      {
        icon: 'sliders',
        title: '2. Set width and colours',
        body: 'Pick the number of stitches per row and the number of yarn colours. The preview updates as you go.',
      },
      {
        icon: 'check',
        title: '3. Follow it stitch by stitch',
        body: 'The chart opens in the reader: tap the stitch you’re on, Fil remembers it, and you pick up where you left off next time.',
      },
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'Is it free?',
        a: 'Yes, completely, and there’s no account to create. You pick an image and you get a chart.',
      },
      {
        q: 'Is my image sent anywhere?',
        a: 'No. Everything happens in your browser: the image is neither uploaded nor kept, only the resulting chart is saved on your device. It even works offline once the page has loaded.',
      },
      {
        q: 'How many stitches will my chart have?',
        a: 'You choose the width, from a handful of stitches to several dozen; the height follows the image’s proportions. The total number of stitches is shown before you create the chart.',
      },
      {
        q: 'Which stitch should I use?',
        a: 'Single crochet: each square of the chart stands for one. It’s roughly square, which keeps the image’s proportions. You can work it flat or in the round.',
      },
    ],
    backToReader: 'Open the pattern reader',
    toChartGuide: 'How to read a crochet chart',
  },
};

/**
 * Page-outil « image en grille » (fiche 49) : la fonction de la fiche 48,
 * rendue trouvable. Le contenu est pré-rendu ; la boîte de réglage, elle, n'est
 * chargée qu'au choix d'un fichier.
 */
@Component({
  selector: 'fil-image-grid-page',
  imports: [Button, Icon, NgComponentOutlet, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
      <p>
        <button type="button" filButton="primary" (click)="fileInput().nativeElement.click()">
          {{ c.choose }}
        </button>
      </p>
      <p class="hint">{{ c.privacyNote }}</p>
      @if (message(); as message) {
        <p class="hint" role="alert">{{ message }}</p>
      }
      <input
        #file
        data-testid="image-grid-file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="visually-hidden"
        tabindex="-1"
        aria-hidden="true"
        (change)="onChange($event)"
      />
    </section>

    <article class="prose">
      <h2>{{ c.h2Steps }}</h2>
      <ol class="step-cards">
        @for (step of c.steps; track step.title) {
          <li class="card">
            <fil-icon [name]="step.icon" />
            <p class="card-title">{{ step.title }}</p>
            <p class="card-body">{{ step.body }}</p>
          </li>
        }
      </ol>

      <h2>{{ c.faqTitle }}</h2>
      @for (item of c.faq; track item.q) {
        <h3>{{ item.q }}</h3>
        <p>{{ item.a }}</p>
      }

      <div class="navrow">
        <a filButton="primary" [routerLink]="i18n.link('reader')">{{ c.backToReader }}</a>
        <a filButton="ghost" [routerLink]="i18n.link('guideReadingChart')">{{ c.toChartGuide }}</a>
      </div>
    </article>

    @if (gridDialog(); as component) {
      <ng-container *ngComponentOutlet="component" />
    }
  `,
})
export default class ImageGridPage {
  protected readonly i18n = inject(I18nService);
  protected readonly intake = inject(ChartIntake);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];
  protected readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('file');
  protected readonly gridDialog = signal<Type<unknown> | null>(null);

  /** Le refus de l'image, dit sous le bouton : la page n'a pas le panneau d'import du lecteur. */
  protected readonly message = computed(() => {
    const copy = READER_COPY[this.locale];
    switch (this.intake.error()) {
      case 'format':
        return copy['ui.chartErrorFormat'];
      case 'lourd':
        return copy['ui.chartErrorHeavy'];
      case 'illisible':
        return copy['ui.chartErrorUnreadable'];
      case 'non-enregistre':
        return copy['ui.gridNotSaved'];
      default:
        return '';
    }
  });

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.imageGrid;
    const url = `${this.origin}${localePrefix(this.locale)}${path[this.locale]}`;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebApplication',
            '@id': url,
            name: this.c.h1,
            description: this.c.seoDescription,
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Any',
            inLanguage: this.locale,
          },
          {
            '@type': 'FAQPage',
            mainEntity: this.c.faq.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          },
        ],
      },
    });

    // `ChartIntake` est un singleton : un projet ouvert avant la visite ne doit pas faire repartir la lectrice.
    const openedBefore = this.intake.opened();
    effect(() => {
      if (this.intake.opened() > openedBefore)
        void this.router.navigateByUrl(this.i18n.link('reader'));
    });
    effect(() => {
      if (this.intake.gridFile() && !this.gridDialog()) {
        void import('../../reader/components/image-grid-dialog').then((m) =>
          this.gridDialog.set(m.ImageGridDialog),
        );
      }
    });
    // Une boîte restée ouverte en quittant la page s'ouvrirait ensuite dans le lecteur.
    inject(DestroyRef).onDestroy(() => this.intake.cancelGrid());
  }

  protected onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.intake.chooseGridImage(file, 'page');
  }
}
