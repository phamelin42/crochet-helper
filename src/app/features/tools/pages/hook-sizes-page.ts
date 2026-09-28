import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { InputField } from '../../../shared/ui/field/input';
import { HOOK_SIZES, HookSize, findHookSize } from '../../converter/data/hook-sizes';

const NBSP = ' ';

interface HookSizesCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly finderLabel: string;
  readonly finderPlaceholder: string;
  readonly finderHint: string;
  readonly finderEmpty: string;
  readonly finderUnknown: string;
  readonly tableTitle: string;
  readonly tableCaption: string;
  readonly colMm: string;
  readonly colUs: string;
  /** Séparateur décimal des diamètres : « 2,25 mm » en français. */
  readonly decimal: string;
  readonly h2Why: string;
  readonly bodyWhy: string;
  readonly h2Standard: string;
  readonly bodyStandard: string;
  readonly h2Metric: string;
  readonly bodyMetric: string;
  readonly h2Choose: string;
  readonly bodyChoose: string;
  readonly bodySwatch: string;
  readonly h2Pattern: string;
  readonly bodyPattern: string;
  readonly h2Converter: string;
  readonly bodyConverter: string;
  readonly toConverter: string;
  readonly tryReader: string;
  readonly toGlossary: string;
}

const COPY: Record<Locale, HookSizesCopy> = {
  fr: {
    seoTitle: `Tailles de crochet${NBSP}: tableau mm ↔ US et comment choisir — ${SITE_NAME}`,
    seoDescription:
      'Le tableau complet des tailles de crochet en millimètres et en notation américaine (G-6 = 4 mm), un chercheur de taille, et comment choisir la vôtre selon le fil et l’échantillon.',
    h1: `Tailles de crochet${NBSP}: le tableau mm ↔ US`,
    lead: `Un patron américain parle de «${NBSP}G-6${NBSP}», votre crochet porte «${NBSP}4 mm${NBSP}»${NBSP}: c’est le même. Tapez une taille pour la retrouver dans l’autre système, ou parcourez le tableau complet de la norme.`,
    finderLabel: 'Votre taille de crochet',
    finderPlaceholder: '4 mm ou G-6',
    finderHint: 'En millimètres (4, 4 mm, 4,0) ou en notation américaine (G, G-6, 7).',
    finderEmpty: 'L’équivalent s’affichera ici.',
    finderUnknown: 'Cette taille n’est pas dans la norme.',
    tableTitle: 'Le tableau complet des tailles',
    tableCaption:
      'Tailles de crochet selon la norme du Craft Yarn Council, en millimètres et en notation américaine',
    colMm: 'Diamètre (mm)',
    colUs: 'Taille US',
    decimal: ',',
    h2Why: `Pourquoi une lettre et un chiffre${NBSP}?`,
    bodyWhy: `Aux États-Unis, l’usage est de désigner un crochet par une lettre${NBSP}: B pour les plus fins, puis C, D, E et ainsi de suite jusqu’aux plus gros. Un numéro suit la même progression${NBSP}: le B est aussi le 1, le G est le 6, le K le 10½. Sur les emballages et dans les patrons, on trouve la lettre seule («${NBSP}size G${NBSP}»), le numéro seul, ou les deux accolés («${NBSP}G-6${NBSP}»)${NBSP}: c’est toujours le même crochet. Seule exception du tableau, le crochet de 4,5 mm n’a pas de lettre et ne porte que le numéro 7. Tout en haut de l’échelle, la norme donne deux lettres, «${NBSP}M/N-13${NBSP}» ou «${NBSP}N/P-15${NBSP}», parce que toutes les marques n’emploient pas la même pour ces gros crochets.`,
    h2Standard: 'La norme du Craft Yarn Council',
    bodyStandard: `Pendant longtemps, chaque fabricant a gradué ses crochets à sa façon, et une même lettre a pu correspondre à des diamètres légèrement différents d’une marque à l’autre. Le Craft Yarn Council, l’association professionnelle américaine qui réunit fabricants de fil, d’accessoires et éditeurs, publie des recommandations communes, dont la correspondance entre millimètres et notation américaine reprise dans le tableau ci-dessus. Les crochets vendus aujourd’hui la suivent en général, mais un crochet ancien, hérité ou chiné peut s’en écarter de quelques dixièmes de millimètre${NBSP}: si le manche porte un diamètre en millimètres, c’est lui qui fait foi.`,
    h2Metric: 'Millimètres, US et ancienne numérotation britannique',
    bodyMetric: `En France comme dans la plupart des pays, la taille d’un crochet se donne en millimètres${NBSP}: c’est le diamètre de la tige, la partie sur laquelle se forment les boucles, et donc la mesure qui règle la taille de chaque maille. C’est le système le plus simple, puisqu’un crochet de 4 mm mesure bien 4 mm. Les patrons américains donnent souvent les deux, «${NBSP}4 mm (G-6)${NBSP}», mais pas toujours. Les patrons britanniques anciens utilisaient encore une autre numérotation, qui avait la particularité de fonctionner à l’envers${NBSP}: plus le numéro était grand, plus le crochet était fin. Si un vieux patron anglais indique un numéro qui ne correspond à rien dans le tableau, c’est probablement de ce système qu’il s’agit${NBSP}; les patrons britanniques récents, eux, sont en millimètres.`,
    h2Choose: 'Choisir sa taille selon le fil et l’échantillon',
    bodyChoose: `La taille conseillée figure le plus souvent sur l’étiquette de la pelote, à côté de celle des aiguilles à tricoter${NBSP}: c’est un bon point de départ. Un fil fin appelle un crochet fin, un fil épais un crochet plus gros. Mais la taille indiquée par le patron compte davantage, car elle a été choisie pour obtenir un tissu précis, plus ou moins souple, plus ou moins ajouré. Et chacune crochète avec sa propre tension${NBSP}: avec le même fil et le même crochet, deux personnes n’obtiennent pas forcément les mêmes dimensions.`,
    bodySwatch: `D’où l’échantillon${NBSP}: crochetez un carré d’une dizaine de centimètres de côté, comptez les mailles et les rangs sur 10 cm, et comparez avec ce qu’annonce le patron. Trop de mailles, c’est que vos mailles sont trop petites${NBSP}: prenez un crochet plus gros. Pas assez${NBSP}: prenez-en un plus fin. Pour un amigurumi, on choisit souvent un crochet plus petit que ne l’indique la pelote, pour un tissu serré qui ne laisse pas voir le rembourrage.`,
    h2Pattern: `Le patron dit «${NBSP}size G${NBSP}»${NBSP}: que faire${NBSP}?`,
    bodyPattern: `Cherchez la lettre dans le tableau ou dans le chercheur en haut de page${NBSP}: «${NBSP}size G${NBSP}» désigne le crochet de 4 mm. Si le patron précise aussi les millimètres, fiez-vous à eux plutôt qu’à la lettre. Si vous n’avez pas exactement cette taille, prenez la plus proche et faites un échantillon avant de vous lancer${NBSP}: sur un bonnet ou un plaid, un demi-millimètre d’écart change nettement la taille finale. Méfiez-vous enfin des abréviations${NBSP}: un patron américain ne nomme pas les mailles comme un patron britannique, et «${NBSP}dc${NBSP}» n’y désigne pas la même maille.`,
    h2Converter: 'Convertir un patron entier',
    bodyConverter: `Le convertisseur US ↔ UK traite tout le patron d’un coup${NBSP}: il remplace les abréviations d’une convention par celles de l’autre et ajoute, à côté de chaque taille de crochet qu’il reconnaît, son équivalent entre parenthèses, sans jamais effacer la taille d’origine. Collez ensuite le résultat dans le lecteur, qui l’affiche une étape à la fois, en très grand.`,
    toConverter: 'Ouvrir le convertisseur US ↔ UK',
    tryReader: 'Essayer le lecteur',
    toGlossary: 'Le glossaire des abréviations',
  },
  en: {
    seoTitle: `Crochet hook sizes chart: mm to US letters — ${SITE_NAME}`,
    seoDescription:
      'The full crochet hook size chart in millimetres and US letters (G-6 = 4 mm), a size finder, and how to choose your hook for your yarn and gauge.',
    h1: 'Crochet hook sizes: mm ↔ US chart',
    lead: 'Your US pattern says "G-6", your hook says "4 mm": they are the same hook. Type a size to find it in the other system, or browse the full standard chart.',
    finderLabel: 'Your hook size',
    finderPlaceholder: '4 mm or G-6',
    finderHint: 'In millimetres (4, 4 mm, 4.0) or US notation (G, G-6, 7).',
    finderEmpty: 'The equivalent will appear here.',
    finderUnknown: 'This size is not in the standard.',
    tableTitle: 'The full hook size chart',
    tableCaption:
      'Crochet hook sizes from the Craft Yarn Council standard, in millimetres and US notation',
    colMm: 'Diameter (mm)',
    colUs: 'US size',
    decimal: '.',
    h2Why: 'Why a letter and a number?',
    bodyWhy:
      'In the US, crochet hooks are usually named by a letter: B for the finest, then C, D, E and so on up to the largest. A number follows the same progression: B is also 1, G is 6, K is 10½. On packaging and in patterns you will find the letter alone ("size G"), the number alone, or both together ("G-6"): it is always the same hook. The one exception in the chart is the 4.5 mm hook, which has no letter and is simply called 7. At the top of the scale, the standard gives two letters, "M/N-13" or "N/P-15", because not every brand uses the same letter for those large hooks.',
    h2Standard: 'The Craft Yarn Council standard',
    bodyStandard:
      'For a long time, each manufacturer sized its hooks its own way, and the same letter could mean slightly different diameters from one brand to another. The Craft Yarn Council, the US trade association of yarn companies, accessory makers and publishers, publishes shared guidelines, including the millimetre-to-US correspondence used in the chart above. Hooks sold today generally follow it, but an old, inherited or second-hand hook may be a few tenths of a millimetre off: if the handle shows a diameter in millimetres, that is the number to trust.',
    h2Metric: 'Millimetres, US sizes and the old British numbering',
    bodyMetric:
      'In most countries, a hook’s size is given in millimetres: it is the diameter of the shaft, the part the loops sit on, and therefore the measurement that sets the size of every stitch. It is the simplest system, since a 4 mm hook really is 4 mm. US patterns often give both, "4 mm (G-6)", but not always. Older British patterns used yet another numbering, with one peculiarity: it ran backwards, so the bigger the number, the finer the hook. If an old UK pattern gives a number that matches nothing in the chart, that system is the likely culprit; current British patterns use millimetres.',
    h2Choose: 'Choosing your size for your yarn and gauge',
    bodyChoose:
      'The recommended size is usually printed on the yarn label, next to the knitting needle size: it is a good starting point. Fine yarn calls for a fine hook, thick yarn for a larger one. But the size given by the pattern matters more, because it was chosen to produce a specific fabric, softer or firmer, more or less open. And everyone crochets with their own tension: with the same yarn and the same hook, two people don’t necessarily end up with the same measurements.',
    bodySwatch:
      'Hence the gauge swatch: crochet a square about 10 cm (4 in) across, count the stitches and rows over 10 cm, and compare with what the pattern states. Too many stitches means your stitches are too small: switch to a larger hook. Too few: switch to a smaller one. For amigurumi, people often go smaller than the yarn label suggests, for a tight fabric that hides the stuffing.',
    h2Pattern: 'The pattern says "size G": what now?',
    bodyPattern:
      'Look the letter up in the chart or in the finder at the top of the page: "size G" is the 4 mm hook. If the pattern also gives millimetres, trust those over the letter. If you don’t have that exact size, take the closest one and make a gauge swatch before you start: on a hat or a blanket, half a millimetre makes a clear difference to the finished size. And watch the abbreviations too: a US pattern doesn’t name stitches the way a UK pattern does, and "dc" is not the same stitch in both.',
    h2Converter: 'Converting a whole pattern',
    bodyConverter:
      'The US ↔ UK converter handles the whole pattern at once: it swaps one convention’s abbreviations for the other’s and adds, next to every hook size it recognises, its equivalent in brackets, without ever removing the original size. Then paste the result into the reader, which shows it one step at a time, in large print.',
    toConverter: 'Open the US ↔ UK converter',
    tryReader: 'Try the reader',
    toGlossary: 'The abbreviation glossary',
  },
};

/**
 * Page des tailles de crochet (fiche 29) : le tableau existait déjà dans le
 * convertisseur, sous un titre qui parle de conversion US / UK ; « crochet
 * hook size chart » mérite sa propre URL, avec l'explication qui va avec.
 * Seule donnée : `HOOK_SIZES`, pour que le tableau, le chercheur et le
 * convertisseur ne puissent pas diverger.
 */
@Component({
  selector: 'fil-hook-sizes-page',
  imports: [Button, InputField, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
    </section>

    <section class="card">
      <div class="field">
        <label for="hook-size-input">{{ c.finderLabel }}</label>
        <input
          filInput
          type="text"
          id="hook-size-input"
          autocomplete="off"
          spellcheck="false"
          aria-describedby="hook-size-hint"
          [placeholder]="c.finderPlaceholder"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
        <p class="hint" id="hook-size-hint">{{ c.finderHint }}</p>
      </div>

      <div aria-live="polite">
        @if (!query().trim()) {
          <p class="step-body empty">{{ c.finderEmpty }}</p>
        } @else if (found(); as size) {
          <p class="step-body hook-size-result">{{ mm(size) }} = US {{ size.us }}</p>
        } @else {
          <p class="step-body empty">{{ c.finderUnknown }}</p>
        }
      </div>
    </section>

    <section class="stack">
      <h2>{{ c.tableTitle }}</h2>
      <div class="glossary-table-scroll">
        <table class="table">
          <caption class="visually-hidden">
            {{
              c.tableCaption
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ c.colMm }}</th>
              <th scope="col">{{ c.colUs }}</th>
            </tr>
          </thead>
          <tbody>
            @for (size of hookSizes; track size.us) {
              <tr>
                <td>{{ mm(size) }}</td>
                <td>
                  <code>{{ size.us }}</code>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <article class="prose">
      <h2>{{ c.h2Why }}</h2>
      <p>{{ c.bodyWhy }}</p>

      <h2>{{ c.h2Standard }}</h2>
      <p>{{ c.bodyStandard }}</p>

      <h2>{{ c.h2Metric }}</h2>
      <p>{{ c.bodyMetric }}</p>

      <h2>{{ c.h2Choose }}</h2>
      <p>{{ c.bodyChoose }}</p>
      <p>{{ c.bodySwatch }}</p>

      <h2>{{ c.h2Pattern }}</h2>
      <p>{{ c.bodyPattern }}</p>

      <h2>{{ c.h2Converter }}</h2>
      <p>{{ c.bodyConverter }}</p>
      <p>
        <a filButton="secondary" [routerLink]="i18n.link('converter')">{{ c.toConverter }}</a>
      </p>
    </article>

    <div class="navrow">
      <a filButton="primary" [routerLink]="i18n.link('reader')">{{ c.tryReader }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('glossary')">{{ c.toGlossary }}</a>
    </div>
  `,
})
export class HookSizesPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];

  protected readonly hookSizes = HOOK_SIZES;
  protected readonly query = signal('');
  protected readonly found = computed(() => findHookSize(this.query()));

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.hookSizes;
    const url = `${this.origin}${localePrefix(this.locale)}${path[this.locale]}`;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': url,
        url,
        name: this.c.h1,
        description: this.c.seoDescription,
        inLanguage: this.locale,
      },
    });
  }

  /** « 2,25 mm » en français, « 2.25 mm » en anglais, sans coupure avant l'unité. */
  protected mm(size: HookSize): string {
    return `${String(size.mm).replace('.', this.c.decimal)}${NBSP}mm`;
  }
}
