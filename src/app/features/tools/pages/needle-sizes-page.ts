import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { InputField } from '../../../shared/ui/field/input';
// `data/` est du domaine partagé : import autorisé d'une autre fonctionnalité.
import { NEEDLE_SIZES, findNeedleSize } from '../../converter/data/needle-sizes';

const NBSP = ' ';

interface NeedleSizesCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly finderLabel: string;
  readonly finderPlaceholder: string;
  readonly notInStandard: string;
  readonly tableCaption: string;
  readonly colMm: string;
  readonly colUs: string;
  readonly sections: readonly { readonly h2: string; readonly paragraphs: readonly string[] }[];
  readonly toHooks: string;
  readonly toGauge: string;
  readonly toReader: string;
}

const COPY: Record<Locale, NeedleSizesCopy> = {
  fr: {
    seoTitle: `Tailles d’aiguilles à tricoter${NBSP}: tableau mm ↔ US`,
    seoDescription:
      'Le tableau des tailles d’aiguilles à tricoter en millimètres et en numéros américains (US 8…), un chercheur pour passer de l’un à l’autre et comment choisir.',
    h1: `Tailles d’aiguilles à tricoter${NBSP}: le tableau mm ↔ US`,
    lead: `Un patron américain écrit «${NBSP}US 8${NBSP}», vos aiguilles indiquent «${NBSP}5${NBSP}mm${NBSP}»${NBSP}: tapez l’un ou l’autre pour trouver l’équivalent, ou parcourez le tableau complet.`,
    finderLabel: `Une taille${NBSP}: 5${NBSP}mm ou US 8`,
    finderPlaceholder: '5 mm, US 8, US 10½…',
    notInStandard: 'Cette taille n’est pas dans la norme',
    tableCaption: `Tailles d’aiguilles à tricoter${NBSP}: diamètre en millimètres et numéro américain`,
    colMm: 'Diamètre (mm)',
    colUs: 'Taille US',
    sections: [
      {
        h2: 'Pourquoi deux numérotations ?',
        paragraphs: [
          `Les aiguilles à tricoter se mesurent de deux façons. La plus simple est le diamètre en millimètres, utilisé presque partout en Europe${NBSP}: une aiguille de 4${NBSP}mm fait 4${NBSP}mm de diamètre, et c’est tout. Les patrons américains, eux, emploient un numéro, de 0 à 50, qui n’a pas de sens en soi${NBSP}: «${NBSP}US 8${NBSP}» ne veut rien dire tant qu’on ne l’a pas rapproché de sa valeur en millimètres, ici 5${NBSP}mm. Plus le numéro est grand, plus l’aiguille est grosse.`,
          `Une troisième numérotation, britannique, a longtemps circulé. Elle compte à l’envers, avec un numéro plus petit pour une aiguille plus grosse, et elle a presque disparu des étiquettes récentes. Nous ne la reproduisons pas dans le tableau faute de source vérifiée${NBSP}: sur un vieux patron, cherchez plutôt le diamètre en millimètres, quand il est donné.`,
        ],
      },
      {
        h2: 'Lire « US 8 » dans un patron',
        paragraphs: [
          `Quand un patron américain écrit «${NBSP}size 8 needles${NBSP}» ou «${NBSP}US 8${NBSP}», il s’agit du numéro américain, pas des millimètres. Tapez-le dans le chercheur ci-dessus avec le préfixe «${NBSP}US${NBSP}»${NBSP}: sans lui, un nombre seul est lu en millimètres d’abord, parce que «${NBSP}8${NBSP}» est aussi un diamètre du tableau (8${NBSP}mm, soit US 11). Seul le numéro 10½ s’écrit avec une demi-taille, et il correspond à 6,5${NBSP}mm.`,
          `Le tableau de cette page reprend la correspondance publiée par le Craft Yarn Council, l’organisme américain qui normalise les étiquettes de fil et les patrons. Il couvre dix-neuf tailles, de 2${NBSP}mm (US 0) à 25${NBSP}mm (US 50). Il décrit ce que les patrons américains attendent, pas une loi${NBSP}: deux marques peuvent différer d’une fraction de millimètre, et le diamètre gravé sur l’aiguille reste la seule information fiable. Mesurez-la avec un gabarit si le marquage est effacé.`,
        ],
      },
      {
        h2: 'Droites, circulaires, double pointe',
        paragraphs: [
          `Les aiguilles existent en trois formes, et la taille ne change pas de l’une à l’autre${NBSP}: une aiguille circulaire de 4${NBSP}mm donne les mêmes mailles qu’une paire d’aiguilles droites de 4${NBSP}mm. Ce qui change, c’est l’usage. Les aiguilles droites conviennent aux petits ouvrages tricotés à plat, comme une écharpe. Les circulaires, deux pointes reliées par un câble souple, portent le poids d’un grand ouvrage sur le câble plutôt que sur les poignets, et se tricotent aussi en rond, pour un pull sans couture. Les aiguilles à double pointe, vendues par jeux de quatre ou cinq, servent aux petits tubes${NBSP}: chaussettes, manches, bonnets au sommet.`,
          `Un patron en rond demande donc souvent deux sortes d’aiguilles de même taille${NBSP}: une circulaire pour le corps, un jeu à double pointe pour la fin des diminutions. Vérifiez la taille de chacune avant de commencer.`,
        ],
      },
      {
        h2: 'Choisir sa taille selon le fil et l’échantillon',
        paragraphs: [
          `L’étiquette d’une pelote suggère une aiguille, souvent sous forme d’une plage en millimètres, et c’est un bon point de départ. Mais la bonne taille est celle qui donne la bonne tension avec votre main et votre fil, et cela ne se devine pas${NBSP}: cela se mesure sur un échantillon. Tricotez un carré d’une quinzaine de centimètres dans le point du patron, lavez-le et laissez-le sécher comme l’ouvrage le sera, puis comptez les mailles et les rangs sur dix centimètres.`,
          `Trop de mailles pour dix centimètres${NBSP}: votre ouvrage est trop serré, passez à une aiguille plus grosse. Pas assez${NBSP}: il est trop lâche, prenez une aiguille plus fine. Une demi-taille change déjà nettement la dimension d’un vêtement. Le calculateur d’échantillon fait la comparaison à votre place, et dit de combien de mailles vous êtes éloignée du patron. Pour un ouvrage qui doit rester ferme, un sac par exemple, tricotez volontiers un peu plus serré que ne le suggère l’étiquette.`,
        ],
      },
      {
        h2: 'Et si vous croisez un patron de crochet ?',
        paragraphs: [
          `Les crochets suivent une autre échelle, avec des lettres et des numéros${NBSP}: le tableau des tailles de crochet en donne la correspondance en millimètres. Un même diamètre ne convient pas pour autant aux deux techniques, puisqu’on ne travaille pas le fil de la même façon.`,
        ],
      },
    ],
    toHooks: 'Les tailles de crochet',
    toGauge: 'Le calculateur d’échantillon',
    toReader: 'Le lecteur de patron',
  },
  en: {
    seoTitle: `Knitting needle sizes, mm ↔ US chart — ${SITE_NAME}`,
    seoDescription:
      'The knitting needle size chart in millimetres and US numbers (US 8, US 10½…), a finder to go from one to the other, and how to pick the right needles.',
    h1: 'Knitting needle sizes: the mm ↔ US chart',
    lead: 'A US pattern says "US 8", your needles say "5 mm": type either one to find its equivalent, or browse the full chart.',
    finderLabel: 'A size: 5 mm or US 8',
    finderPlaceholder: '5 mm, US 8, US 10½…',
    notInStandard: 'This size is not in the standard',
    tableCaption: 'Knitting needle sizes: diameter in millimetres and US number',
    colMm: 'Diameter (mm)',
    colUs: 'US size',
    sections: [
      {
        h2: 'Why two numbering systems?',
        paragraphs: [
          'Knitting needles are measured in two ways. The simplest is the diameter in millimetres, used almost everywhere in Europe: a 4 mm needle is 4 mm across, and that is all. American patterns use a number instead, from 0 to 50, which means nothing by itself: "US 8" says little until you match it to its millimetre value, here 5 mm. The bigger the number, the bigger the needle.',
          'A third numbering, British, was used for a long time. It counts backwards, with a smaller number for a bigger needle, and it has almost vanished from recent labels. We do not reproduce it in the chart for lack of a verified source: on an old pattern, look for the diameter in millimetres when one is given.',
        ],
      },
      {
        h2: 'Reading "US 8" in a pattern',
        paragraphs: [
          'When a US pattern says "size 8 needles" or "US 8", it means the American number, not millimetres. Type it into the finder above with the "US" prefix: without it, a bare number is read as millimetres first, because "8" is also a diameter in the chart (8 mm, which is US 11). Only size 10½ is written with a half, and it matches 6.5 mm.',
          'The chart on this page follows the correspondence published by the Craft Yarn Council, the American body that standardises yarn labels and patterns. It covers nineteen sizes, from 2 mm (US 0) to 25 mm (US 50). It describes what American patterns expect, not a law: two brands can differ by a fraction of a millimetre, and the diameter stamped on the needle remains the only dependable figure. Measure it with a gauge if the marking has worn off.',
        ],
      },
      {
        h2: 'Straight, circular, double-pointed',
        paragraphs: [
          'Needles come in three shapes, and the size does not change from one to the other: a 4 mm circular needle makes the same stitches as a pair of 4 mm straight needles. What changes is the use. Straight needles suit small pieces worked flat, such as a scarf. Circular needles, two tips joined by a flexible cable, carry the weight of a large piece on the cable rather than on your wrists, and can also be worked in the round for a seamless sweater. Double-pointed needles, sold in sets of four or five, are for small tubes: socks, sleeves, the crown of a hat.',
          'A pattern worked in the round therefore often calls for two kinds of needles of the same size: a circular one for the body, a double-pointed set for the end of the decreases. Check the size of each before you start.',
        ],
      },
      {
        h2: 'Choosing your size from the yarn and your gauge',
        paragraphs: [
          'A yarn label suggests a needle, often as a range in millimetres, and it is a good starting point. But the right size is the one that gives the right tension with your hand and your yarn, and that cannot be guessed: it has to be measured on a swatch. Knit a square of about fifteen centimetres in the pattern’s stitch, wash it and let it dry the way the finished piece will be treated, then count the stitches and rows over ten centimetres.',
          'Too many stitches over ten centimetres: your work is too tight, move up to a bigger needle. Too few: it is too loose, take a finer needle. Half a size already makes a clear difference to a garment. The gauge calculator does the comparison for you, and tells you how far you are from the pattern. For a piece that must stay firm, a bag for instance, it is fine to knit a little tighter than the label suggests.',
        ],
      },
      {
        h2: 'And if you come across a crochet pattern?',
        paragraphs: [
          'Crochet hooks follow another scale, with letters and numbers: the crochet hook size chart gives their millimetre equivalents. The same diameter does not suit both crafts, however, since the yarn is not handled the same way.',
        ],
      },
    ],
    toHooks: 'Crochet hook sizes',
    toGauge: 'The gauge calculator',
    toReader: 'The pattern reader',
  },
};

/**
 * Page dédiée aux tailles d'aiguilles à tricoter (fiche 50) : jumelle de la
 * page des tailles de crochet, pour la requête « knitting needle sizes chart ».
 */
@Component({
  selector: 'fil-needle-sizes-page',
  imports: [Button, InputField, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
    </section>

    <section class="card">
      <div class="field">
        <label for="needle-size-input">{{ c.finderLabel }}</label>
        <input
          filInput
          type="text"
          id="needle-size-input"
          autocomplete="off"
          [placeholder]="c.finderPlaceholder"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
      </div>
      <div class="needle-result step-body" aria-live="polite">
        @if (found(); as size) {
          {{ size.mm }} mm = US {{ size.us }}
        } @else if (query().trim()) {
          {{ c.notInStandard }}
        }
      </div>
    </section>

    <section class="stack">
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
            @for (size of sizes; track size.us) {
              <tr>
                <td>{{ size.mm }} mm</td>
                <td>
                  <code>US {{ size.us }}</code>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <article class="prose">
      @for (section of c.sections; track section.h2) {
        <h2>{{ section.h2 }}</h2>
        @for (paragraph of section.paragraphs; track $index) {
          <p>{{ paragraph }}</p>
        }
      }
    </article>

    <div class="navrow">
      <a filButton="primary" [routerLink]="i18n.link('gaugeCalculator')">{{ c.toGauge }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('hookSizes')">{{ c.toHooks }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('reader')">{{ c.toReader }}</a>
    </div>
  `,
})
export default class NeedleSizesPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];
  protected readonly sizes = NEEDLE_SIZES;

  protected readonly query = signal('');
  protected readonly found = computed(() => findNeedleSize(this.query()));

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.needleSizes;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${this.origin}${localePrefix(this.locale)}${path[this.locale]}`,
        name: this.c.h1,
        description: this.c.seoDescription,
        inLanguage: this.locale,
      },
    });
  }
}
