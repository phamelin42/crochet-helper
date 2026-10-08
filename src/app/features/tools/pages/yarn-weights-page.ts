import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
// `data/` est du domaine partagé : import autorisé d'une autre fonctionnalité.
import { YARN_WEIGHTS } from '../../converter/data/yarn-weights';

const NBSP = ' ';

interface Section {
  readonly h2: string;
  readonly paragraphs: readonly string[];
}

interface YarnWeightsCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly tableCaption: string;
  readonly colCategory: string;
  readonly colUs: string;
  readonly colUk: string;
  readonly colHook: string;
  readonly colNeedle: string;
  readonly noUk: string;
  readonly andMore: string;
  readonly tableNote: string;
  readonly sections: readonly Section[];
  readonly faqTitle: string;
  readonly faq: readonly { readonly q: string; readonly a: string }[];
  readonly toGauge: string;
  readonly toHooks: string;
  readonly toNeedles: string;
}

const COPY: Record<Locale, YarnWeightsCopy> = {
  fr: {
    seoTitle: `Poids de fil${NBSP}: worsted, aran, DK, le tableau des catégories 0 à 7`,
    seoDescription:
      'Worsted, aran, DK, chunky : le tableau des catégories de poids de fil du Craft Yarn Council, avec le crochet et les aiguilles usuels, et comment remplacer un fil.',
    h1: `Poids de fil${NBSP}: worsted, aran, DK… le tableau`,
    lead: `Un patron américain demande du «${NBSP}worsted${NBSP}», un patron britannique de l’«${NBSP}aran${NBSP}», un patron français de la laine «${NBSP}n°${NBSP}4${NBSP}»${NBSP}: voici les huit catégories, avec le crochet et les aiguilles qui vont avec.`,
    tableCaption: `Catégories de poids de fil 0 à 7${NBSP}: noms américains et britanniques, crochet et aiguilles recommandés`,
    colCategory: 'Catégorie',
    colUs: 'Noms américains',
    colUk: 'Britannique',
    colHook: 'Crochet',
    colNeedle: 'Aiguilles',
    noUk: '—',
    andMore: 'et plus',
    tableNote: `Source${NBSP}: Craft Yarn Council, «${NBSP}Standard Yarn Weight System${NBSP}». Les cases vides signifient que la source ne donne pas d’équivalent britannique${NBSP}; nous n’en inventons pas. Il n’existe pas de numérotation française reconnue de la même façon${NBSP}: la mention «${NBSP}n°${NBSP}4${NBSP}» d’un patron français se lit avec sa pelote ou son échantillon, pas avec ce tableau.`,
    sections: [
      {
        h2: 'Que veut dire « poids de fil » ?',
        paragraphs: [
          `Le poids d’un fil n’est pas son poids sur la balance${NBSP}: c’est sa grosseur. Un fil fin donne un ouvrage léger et très détaillé, un fil gros avance vite et donne un tissu épais. Le Craft Yarn Council, l’organisme américain qui normalise les étiquettes et les patrons, range les fils en huit catégories numérotées de 0 (dentelle) à 7 (jumbo). Chaque catégorie réunit plusieurs noms d’usage, et c’est là que naît la confusion${NBSP}: le même fil s’appelle «${NBSP}worsted${NBSP}» à New York et «${NBSP}aran${NBSP}» à Londres.`,
          `Le tableau ci-dessus donne, pour chaque catégorie, les noms américains que la source cite, l’équivalent britannique quand elle le nomme, la plage de crochets et la plage d’aiguilles à tricoter, en millimètres. Ce sont des plages de départ, pas des obligations${NBSP}: elles supposent une main moyenne et un ouvrage ordinaire.`,
        ],
      },
      {
        h2: 'Lire l’étiquette d’une pelote',
        paragraphs: [
          `L’étiquette porte presque toujours trois informations utiles. D’abord un symbole, une pelote avec un chiffre de 0 à 7${NBSP}: c’est la catégorie du tableau, et c’est la plus rapide à repérer. Ensuite le métrage pour un poids donné, par exemple 200${NBSP}mètres aux 100${NBSP}grammes${NBSP}: c’est le renseignement le plus fiable pour comparer deux fils, parce qu’il ne dépend d’aucun nom. À poids égal, plus il y a de mètres, plus le fil est fin. Enfin l’échantillon et l’outil suggéré, un nombre de mailles et de rangs sur dix centimètres avec telle taille de crochet ou d’aiguilles.`,
          `Les noms de pays se lisent avec prudence. Un fil étiqueté «${NBSP}worsted${NBSP}» par une marque américaine et un fil «${NBSP}aran${NBSP}» d’une marque britannique tombent tous deux dans la catégorie 4, mais ils peuvent différer d’un cheveu. Le symbole et le métrage départagent.`,
        ],
      },
      {
        h2: 'Remplacer un fil par un autre',
        paragraphs: [
          `Vous n’avez pas le fil du patron, ou il n’est plus fabriqué${NBSP}: rien de grave. Cherchez un fil de la même catégorie et d’un métrage voisin. Si le patron demande 400${NBSP}mètres de worsted et que votre pelote en offre 200 aux 100${NBSP}grammes, il vous faut deux pelotes de 100${NBSP}grammes, et un peu de marge. Pensez aussi à la matière${NBSP}: un coton ne tombe pas comme une laine, et un patron pensé pour une fibre souple donnera un ouvrage raide dans une fibre rigide.`,
          `Ne refaites pas le calcul des mailles à la main. Tricotez ou crochetez un échantillon avec le nouveau fil, mesurez-le, et comparez-le à celui du patron${NBSP}: si les nombres concordent, vous pouvez suivre le patron tel quel. S’ils s’écartent, changez de taille de crochet ou d’aiguilles, d’une demi-taille à la fois, jusqu’à retrouver les bons chiffres. Le calculateur d’échantillon fait cette comparaison pour vous.`,
        ],
      },
      {
        h2: 'Le crochet et les aiguilles du tableau',
        paragraphs: [
          `Les plages du tableau disent quelle taille essayer en premier. Les crochets et les aiguilles ne se correspondent pas toujours millimètre pour millimètre, parce qu’on ne manie pas le fil de la même façon. Pour passer d’une notation américaine («${NBSP}H-8${NBSP}», «${NBSP}US 8${NBSP}») au diamètre en millimètres, reportez-vous aux tableaux des tailles de crochet et des tailles d’aiguilles. Votre échantillon reste le seul juge, quelle que soit la plage.`,
        ],
      },
    ],
    faqTitle: 'Questions fréquentes',
    faq: [
      {
        q: `Worsted ou aran${NBSP}?`,
        a: `Ce sont deux noms de la même catégorie, la 4. Worsted est le mot américain, aran le mot britannique. Les deux conviennent pour la plupart des patrons qui demandent l’un ou l’autre, à condition de vérifier l’échantillon.`,
      },
      {
        q: 'Puis-je remplacer un fil par un autre ?',
        a: `Oui, si vous choisissez la même catégorie, un métrage voisin et une fibre au tombé comparable. Tricotez ou crochetez ensuite un échantillon avant de commencer l’ouvrage, et ajustez la taille de l’outil si les chiffres diffèrent.`,
      },
      {
        q: 'Le DK est-il plus fin que le worsted ?',
        a: `Oui. Le DK est de catégorie 3, le worsted de catégorie 4 : le DK est un peu plus fin et demande un crochet ou des aiguilles un peu plus petits.`,
      },
    ],
    toGauge: 'Le calculateur d’échantillon',
    toHooks: 'Les tailles de crochet',
    toNeedles: 'Les tailles d’aiguilles',
  },
  en: {
    seoTitle: `Yarn weight chart: worsted, aran, DK, categories 0 to 7 — ${SITE_NAME}`,
    seoDescription:
      'Worsted, aran, DK, chunky: the Craft Yarn Council yarn weight categories with the usual crochet hook and knitting needle sizes, and how to substitute a yarn.',
    h1: 'Yarn weights: worsted, aran, DK… the chart',
    lead: 'An American pattern asks for "worsted", a British one for "aran", a French one for "laine n° 4": here are the eight categories, with the hook and needles that go with them.',
    tableCaption:
      'Yarn weight categories 0 to 7: US and UK names, recommended crochet hook and knitting needles',
    colCategory: 'Category',
    colUs: 'US names',
    colUk: 'UK',
    colHook: 'Crochet hook',
    colNeedle: 'Needles',
    noUk: '—',
    andMore: 'and up',
    tableNote:
      'Source: Craft Yarn Council, "Standard Yarn Weight System". An empty cell means the source gives no British equivalent; we do not make one up. French labels such as "n° 4" have no standard recognised in the same way: read them with the ball band or the gauge, not with this chart.',
    sections: [
      {
        h2: 'What does "yarn weight" mean?',
        paragraphs: [
          'A yarn’s weight is not what it reads on the scales: it is how thick it is. A thin yarn gives a light, detailed piece; a thick yarn works up fast and gives a dense fabric. The Craft Yarn Council, the American body that standardises labels and patterns, sorts yarns into eight categories numbered from 0 (lace) to 7 (jumbo). Each category gathers several everyday names, and that is where the confusion starts: the same yarn is "worsted" in New York and "aran" in London.',
          'The chart above gives, for each category, the American names the source cites, the British equivalent where it names one, the range of crochet hooks and the range of knitting needles, in millimetres. These are starting ranges, not rules: they assume an average hand and an ordinary project.',
        ],
      },
      {
        h2: 'Reading a ball band',
        paragraphs: [
          'A ball band almost always carries three useful facts. First a symbol, a ball of yarn with a number from 0 to 7: that is the category in the chart, and the quickest thing to spot. Then the length for a given weight, for example 200 metres per 100 grams: it is the most dependable figure for comparing two yarns, because it depends on no name. For the same weight, the more metres, the finer the yarn. Finally the gauge and the suggested tool, a number of stitches and rows over ten centimetres with a given hook or needle size.',
          'Treat country names with care. A yarn labelled "worsted" by an American brand and an "aran" yarn from a British brand both fall into category 4, but they can differ slightly. The symbol and the length settle it.',
        ],
      },
      {
        h2: 'Substituting one yarn for another',
        paragraphs: [
          'You do not have the pattern’s yarn, or it is no longer made: no harm done. Look for a yarn in the same category with a similar length. If the pattern calls for 400 metres of worsted and your ball offers 200 per 100 grams, you need two 100-gram balls, and a little to spare. Think about the fibre too: cotton does not drape like wool, and a pattern designed for a soft fibre will come out stiff in a rigid one.',
          'Do not redo the stitch arithmetic by hand. Knit or crochet a swatch with the new yarn, measure it, and compare it with the pattern’s: if the numbers match, follow the pattern as written. If they do not, change the hook or needle size, half a size at a time, until you get the right figures. The gauge calculator makes that comparison for you.',
        ],
      },
      {
        h2: 'The hook and needles in the chart',
        paragraphs: [
          'The chart’s ranges tell you which size to try first. Hooks and needles do not always match millimetre for millimetre, because the yarn is not handled the same way. To go from an American notation ("H-8", "US 8") to a diameter in millimetres, see the crochet hook size chart and the knitting needle size chart. Your swatch remains the only judge, whatever the range.',
        ],
      },
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'Worsted or aran?',
        a: 'They are two names for the same category, number 4. Worsted is the American word, aran the British one. Either suits most patterns that call for the other, as long as you check the gauge.',
      },
      {
        q: 'Can I replace one yarn with another?',
        a: 'Yes, if you pick the same category, a similar length and a fibre with a comparable drape. Then knit or crochet a swatch before you start, and adjust the tool size if the numbers differ.',
      },
      {
        q: 'Is DK thinner than worsted?',
        a: 'Yes. DK is category 3 and worsted category 4: DK is slightly finer and takes a slightly smaller hook or needles.',
      },
    ],
    toGauge: 'The gauge calculator',
    toHooks: 'Crochet hook sizes',
    toNeedles: 'Knitting needle sizes',
  },
};

/**
 * Page « poids de fil » (fiche 51) : point de chute commun des pages des
 * tailles de crochet et d'aiguilles, pour la requête « yarn weight chart ».
 */
@Component({
  selector: 'fil-yarn-weights-page',
  imports: [Button, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
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
              <th scope="col">{{ c.colCategory }}</th>
              <th scope="col">{{ c.colUs }}</th>
              <th scope="col">{{ c.colUk }}</th>
              <th scope="col">{{ c.colHook }}</th>
              <th scope="col">{{ c.colNeedle }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track row.category) {
              <tr>
                <th scope="row">{{ row.category }}</th>
                <td>{{ row.us }}</td>
                <td>{{ row.uk }}</td>
                <td>{{ row.hook }}</td>
                <td>{{ row.needle }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="prose">{{ c.tableNote }}</p>
    </section>

    <article class="prose">
      @for (section of c.sections; track section.h2) {
        <h2>{{ section.h2 }}</h2>
        @for (paragraph of section.paragraphs; track $index) {
          <p>{{ paragraph }}</p>
        }
      }
      <h2>{{ c.faqTitle }}</h2>
      @for (item of c.faq; track item.q) {
        <h3>{{ item.q }}</h3>
        <p>{{ item.a }}</p>
      }
    </article>

    <div class="navrow">
      <a filButton="primary" [routerLink]="i18n.link('gaugeCalculator')">{{ c.toGauge }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('hookSizes')">{{ c.toHooks }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('needleSizes')">{{ c.toNeedles }}</a>
    </div>
  `,
})
export default class YarnWeightsPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];
  protected readonly rows = YARN_WEIGHTS.map((weight) => ({
    category: weight.category,
    us: weight.us.join(', '),
    uk: weight.uk ?? this.c.noUk,
    hook: this.range(weight.hookMm),
    needle: this.range(weight.needleMm),
  }));

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.yarnWeights;
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

  /** « 5,5 – 6,5 mm » (virgule en français), ou « 15 mm et plus » sans borne haute. */
  private range(range: { min: number; max: number | null }): string {
    const num = (value: number) =>
      this.locale === 'fr' ? String(value).replace('.', ',') : String(value);
    return range.max === null
      ? `${num(range.min)}${NBSP}mm ${this.c.andMore}`
      : `${num(range.min)}${NBSP}–${NBSP}${num(range.max)}${NBSP}mm`;
  }
}
