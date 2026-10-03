import {
  Component,
  ElementRef,
  ViewContainerRef,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { ChartIntake } from '../state/chart-intake';

const NBSP = ' ';

interface Step {
  readonly title: string;
  readonly text: string;
}

interface Faq {
  readonly q: string;
  readonly a: string;
}

interface ImageGridCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly pick: string;
  readonly pickHint: string;
  readonly stepsTitle: string;
  readonly steps: readonly [Step, Step, Step];
  readonly faqTitle: string;
  readonly faq: readonly Faq[];
  readonly errorFormat: string;
  readonly errorHeavy: string;
  readonly errorUnreadable: string;
  readonly seeAlso: string;
  readonly linkChart: string;
  readonly linkCounter: string;
  readonly toReader: string;
}

const COPY: Record<Locale, ImageGridCopy> = {
  fr: {
    seoTitle: `Transformer une image en grille de crochet, gratuitement — ${SITE_NAME}`,
    seoDescription:
      'Une photo ou un dessin devient une grille de mailles serrées en couleurs, à suivre maille par maille. Gratuit, sans compte, et l’image ne quitte jamais votre appareil.',
    h1: 'Une image en grille de crochet',
    lead: `Choisissez une photo ou un dessin${NBSP}: chaque zone de l’image devient une maille serrée de sa couleur. Vous réglez la largeur et le nombre de couleurs, puis vous suivez la grille rang après rang, sans compte et sans rien envoyer.`,
    pick: 'Choisir une image',
    pickHint: 'PNG, JPEG ou WebP, 10 Mo au plus.',
    stepsTitle: 'En trois gestes',
    steps: [
      {
        title: 'Choisir l’image',
        text: 'Une photo du téléphone, un dessin d’enfant, un logo. Les images simples, aux couleurs franches, donnent les grilles les plus nettes.',
      },
      {
        title: 'Régler largeur et couleurs',
        text: `La largeur se compte en mailles, de 10 à 150${NBSP}; la hauteur suit les proportions de l’image. Moins de couleurs, c’est moins de changements de fil.`,
      },
      {
        title: 'Suivre maille par maille',
        text: `La grille s’ouvre dans le lecteur. Touchez la maille où vous en êtes${NBSP}: elle est retenue, et le lecteur annonce combien de mailles reste avant de changer de couleur.`,
      },
    ],
    faqTitle: 'Questions fréquentes',
    faq: [
      {
        q: `Est-ce gratuit${NBSP}?`,
        a: 'Oui, entièrement, et sans compte à créer. Aucune fonction n’est réservée à une version payante.',
      },
      {
        q: `Mon image est-elle envoyée quelque part${NBSP}?`,
        a: 'Non. L’image est lue et réduite par votre navigateur, sur votre appareil. Elle n’est envoyée à aucun serveur, et elle n’est pas gardée une fois la grille créée.',
      },
      {
        q: `Combien de mailles compter${NBSP}?`,
        a: `De 10 à 150 mailles par rang. Le résumé donne la taille exacte avant de créer la grille${NBSP}: 40 mailles sur 52 rangs, par exemple, font 2${NBSP}080 mailles. Pour une couverture, comptez large${NBSP}; pour un coussin ou une pochette, 30 à 60 mailles suffisent souvent.`,
      },
      {
        q: `Quel point utiliser${NBSP}?`,
        a: `La maille serrée, qui est à peu près carrée${NBSP}: la grille garde ainsi les proportions de l’image. On change de couleur à la dernière étape de la maille qui précède, et l’on porte le fil qui ne sert pas à l’intérieur des mailles.`,
      },
    ],
    errorFormat: 'Ce fichier n’est pas une image lisible : choisissez un PNG, un JPEG ou un WebP.',
    errorHeavy: 'Cette image est trop lourde : 10 Mo au plus.',
    errorUnreadable: 'Cette image n’a pas pu être lue.',
    seeAlso: 'Voir aussi',
    linkChart: 'Lire un diagramme de crochet',
    linkCounter: 'Le compteur de rangs',
    toReader: 'Ouvrir le lecteur de patrons',
  },
  en: {
    seoTitle: `Turn a picture into a crochet chart, free — ${SITE_NAME}`,
    seoDescription:
      'A photo or a drawing becomes a colour grid of single crochet stitches that you follow stitch by stitch. Free, no account, and the picture never leaves your device.',
    h1: 'Turn a picture into a crochet chart',
    lead: 'Pick a photo or a drawing and each area of it becomes one single crochet stitch in its colour. Set the width and the number of colours, then follow the grid row by row — no sign-up, nothing uploaded.',
    pick: 'Choose a picture',
    pickHint: 'PNG, JPEG or WebP, up to 10 MB.',
    stepsTitle: 'Three steps',
    steps: [
      {
        title: 'Pick the picture',
        text: 'A phone photo, a child’s drawing, a logo. Simple pictures with clear colours make the cleanest grids.',
      },
      {
        title: 'Set the width and colours',
        text: 'Width is counted in stitches, from 10 to 150; the height follows the picture’s proportions. Fewer colours mean fewer yarn changes.',
      },
      {
        title: 'Follow it stitch by stitch',
        text: 'The grid opens in the pattern reader. Tap the stitch you have reached: it is remembered, and the reader tells you how many stitches are left before the next colour change.',
      },
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'Is it free?',
        a: 'Yes, completely, with no account to create. Nothing is held back for a paid version.',
      },
      {
        q: 'Is my picture uploaded anywhere?',
        a: 'No. Your browser reads and reduces the picture on your own device. It is never sent to a server, and it is not kept once the grid is made.',
      },
      {
        q: 'How many stitches should I use?',
        a: 'Anything from 10 to 150 stitches per row. The summary shows the exact size before you create the grid: 40 stitches over 52 rows, for instance, is 2,080 stitches. Blankets call for a wide grid; a cushion or a pouch is often fine with 30 to 60.',
      },
      {
        q: 'Which stitch should I use?',
        a: 'Single crochet, which is roughly square, so the grid keeps the picture’s proportions. Change colour on the last step of the stitch before, and carry the unused yarn inside the stitches.',
      },
    ],
    errorFormat: 'This file isn’t a readable picture: choose a PNG, JPEG or WebP.',
    errorHeavy: 'This picture is too large: 10 MB at most.',
    errorUnreadable: 'This picture couldn’t be read.',
    seeAlso: 'See also',
    linkChart: 'Reading a crochet chart',
    linkCounter: 'The row counter',
    toReader: 'Open the pattern reader',
  },
};

/**
 * Page-outil « image en grille » (fiche 49) : la fonction de la fiche 48,
 * trouvable par la recherche. Le texte est pré-rendu ; le dialogue et la
 * réduction arrivent par `import()` quand la lectrice choisit une image.
 * Rangée avec le lecteur, dont elle ouvre le dialogue et le magasin : une
 * page de `tools/` dépendrait d'une autre fonctionnalité.
 */
@Component({
  selector: 'fil-image-grid-page',
  imports: [Button, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
    </section>

    <section class="card image-grid-tool">
      <button type="button" filButton="primary" [step]="true" (click)="pick()">
        {{ c.pick }}
      </button>
      <p class="hint">{{ c.pickHint }}</p>
      @if (error(); as message) {
        <p class="hint" role="alert">{{ message }}</p>
      }
      <input
        #file
        data-testid="grid-page-file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="visually-hidden"
        tabindex="-1"
        aria-hidden="true"
        (change)="onFile($event)"
      />
      <ng-container #dialogHost />
    </section>

    <section>
      <h2>{{ c.stepsTitle }}</h2>
      <ol class="image-grid-steps">
        @for (step of c.steps; track step.title; let i = $index) {
          <li class="card">
            <svg
              class="image-grid-ill"
              viewBox="0 0 64 48"
              width="96"
              height="72"
              aria-hidden="true"
            >
              @switch (i) {
                @case (0) {
                  <rect class="ill-paper" x="4" y="4" width="56" height="40" rx="4" />
                  <circle class="ill-sun" cx="46" cy="15" r="6" />
                  <path class="ill-hill" d="M4 40 L22 20 L34 32 L42 26 L60 40 Z" />
                }
                @case (1) {
                  <rect class="ill-track" x="6" y="13" width="52" height="4" rx="2" />
                  <circle class="ill-knob" cx="24" cy="15" r="6" />
                  <rect class="ill-track" x="6" y="31" width="52" height="4" rx="2" />
                  <circle class="ill-knob-alt" cx="44" cy="33" r="6" />
                }
                @default {
                  @for (cell of illustrationCells; track cell.key) {
                    <rect
                      [attr.class]="cell.cls"
                      [attr.x]="cell.x"
                      [attr.y]="cell.y"
                      width="10"
                      height="10"
                    />
                  }
                  <rect class="ill-mark" x="27" y="17" width="10" height="10" />
                }
              }
            </svg>
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </li>
        }
      </ol>
    </section>

    <article class="prose">
      <h2>{{ c.faqTitle }}</h2>
      @for (item of c.faq; track item.q) {
        <h3>{{ item.q }}</h3>
        <p>{{ item.a }}</p>
      }

      <h2>{{ c.seeAlso }}</h2>
      <ul>
        <li>
          <a [routerLink]="i18n.link('guideReadingChart')">{{ c.linkChart }}</a>
        </li>
        <li>
          <a [routerLink]="i18n.link('rowCounter')">{{ c.linkCounter }}</a>
        </li>
      </ul>
    </article>

    <div class="navrow">
      <a filButton="ghost" [routerLink]="i18n.link('reader')">{{ c.toReader }}</a>
    </div>
  `,
})
export default class ImageGridPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly intake = inject(ChartIntake);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('file');
  private readonly dialogHost = viewChild.required('dialogHost', { read: ViewContainerRef });
  private dialogLoad = 0;

  /** Une petite grille de trois couleurs, la maille courante entourée. */
  protected readonly illustrationCells = Array.from({ length: 24 }, (_, i) => {
    const column = i % 6;
    const row = Math.floor(i / 6);
    const tone = (column + row * 2) % 3;
    return {
      key: i,
      x: 2 + column * 10,
      y: 4 + row * 10,
      cls: tone === 0 ? 'ill-a' : tone === 1 ? 'ill-b' : 'ill-c',
    };
  });

  protected readonly error = () => {
    const error = this.intake.error();
    if (error === 'format') return this.c.errorFormat;
    if (error === 'lourd') return this.c.errorHeavy;
    if (error === 'illisible') return this.c.errorUnreadable;
    return '';
  };

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
            '@type': 'WebPage',
            '@id': url,
            name: this.c.h1,
            description: this.c.seoDescription,
            inLanguage: this.locale,
          },
          {
            '@type': 'HowTo',
            name: this.c.h1,
            inLanguage: this.locale,
            step: this.c.steps.map((step, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: step.title,
              text: step.text,
            })),
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

    effect(() => {
      const file = this.intake.gridImage();
      untracked(() => void this.mountDialog(file));
    });
  }

  /** Le dialogue se charge pendant que la lectrice choisit son image (voir CLAUDE.md). */
  protected pick(): void {
    void import('../components/image-grid-dialog').catch(() => undefined);
    this.fileInput().nativeElement.click();
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.intake.openImageGrid(file);
  }

  private async mountDialog(file: File | null): Promise<void> {
    const load = ++this.dialogLoad;
    const host = this.dialogHost();
    host.clear();
    if (!file) return;
    let dialog: typeof import('../components/image-grid-dialog').ImageGridDialog;
    try {
      ({ ImageGridDialog: dialog } = await import('../components/image-grid-dialog'));
    } catch {
      this.intake.closeImageGrid(false, 'illisible');
      return;
    }
    if (load !== this.dialogLoad) return;
    const ref = host.createComponent(dialog);
    ref.setInput('origin', 'page');
    // La grille créée s'ouvre dans le lecteur, sur le nouveau projet.
    ref.instance.created.subscribe(() => void this.router.navigateByUrl(this.i18n.link('reader')));
  }
}
