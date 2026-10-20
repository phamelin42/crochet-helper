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
import { ProjectType, estimateYardage } from '../../converter/data/yardage';
import { YARN_WEIGHTS } from '../../converter/data/yarn-weights';

const NBSP = ' ';

interface Section {
  readonly h2: string;
  readonly paragraphs: readonly string[];
}

interface YardageCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly projectLabel: string;
  readonly weightLabel: string;
  readonly skeinLabel: string;
  readonly skeinHint: string;
  readonly resultTitle: string;
  readonly projects: Record<ProjectType, string>;
  /** `{min}`, `{max}` : mètres ; `{minS}`, `{maxS}` : pelotes. */
  readonly result: string;
  readonly resultOneCount: string;
  readonly needSkein: string;
  readonly noSource: string;
  readonly estimateNote: string;
  readonly sections: readonly Section[];
  readonly faqTitle: string;
  readonly faq: readonly { readonly q: string; readonly a: string }[];
  readonly toWeights: string;
  readonly toGauge: string;
  readonly toHooks: string;
  readonly toNeedles: string;
}

const COPY: Record<Locale, YardageCopy> = {
  fr: {
    seoTitle: `Combien de pelotes${NBSP}? Calculateur de métrage de fil`,
    seoDescription:
      'Bonnet, écharpe, plaid, pull : une fourchette de mètres et de pelotes selon le poids de fil et le métrage de votre pelote, avec la source du tableau.',
    h1: `Combien de fil me faut-il${NBSP}?`,
    lead: `Choisissez un ouvrage et un poids de fil, saisissez le métrage de votre pelote${NBSP}: la page donne une fourchette de mètres et de pelotes, jamais un chiffre unique.`,
    projectLabel: 'Ouvrage',
    weightLabel: 'Poids de fil',
    skeinLabel: 'Métrage d’une pelote, en mètres',
    skeinHint: 'Lisible sur l’étiquette, par exemple 200.',
    resultTitle: 'Estimation',
    projects: {
      hat: 'Bonnet adulte',
      scarf: 'Écharpe',
      afghan: 'Plaid',
      sweater: 'Pull adulte',
      mittens: 'Moufles',
      socks: 'Chaussettes',
    },
    result: `Il faut compter de {min}${NBSP}à${NBSP}{max}${NBSP}mètres.`,
    resultOneCount: `Soit {minS}${NBSP}à${NBSP}{maxS}${NBSP}pelotes de votre métrage.`,
    needSkein: 'Saisissez le métrage d’une pelote pour obtenir le nombre de pelotes.',
    noSource: `Nous n’avons pas de valeur sourcée pour cet ouvrage dans ce poids de fil, et nous n’en inventons pas${NBSP}: essayez un poids voisin, ou suivez le métrage indiqué par votre patron.`,
    estimateNote: `Ceci est une estimation${NBSP}: le tableau vient d’AllFreeKnitting («${NBSP}How Much Yarn Do I Need?${NBSP}») et concerne des ouvrages d’adulte. Votre point, votre taille et votre tension feront varier le résultat. En cas de doute, prenez une pelote de plus.`,
    sections: [
      {
        h2: 'Lire le métrage sur l’étiquette',
        paragraphs: [
          `Le renseignement qui compte sur une pelote n’est pas son poids en grammes mais son métrage${NBSP}: la longueur de fil qu’elle contient. Deux pelotes de 100${NBSP}grammes peuvent contenir 120 ou 300${NBSP}mètres selon la fibre et la finesse. C’est ce nombre, indiqué en mètres et souvent en yards, que l’on saisit ici. Si votre étiquette ne donne que des yards, multipliez par 0,9144 pour obtenir des mètres.`,
          `Le tableau de la page est publié en yards, comme les patrons américains${NBSP}; nous le convertissons en mètres et arrondissons au mètre le plus proche. Le nombre de pelotes est toujours arrondi au supérieur${NBSP}: on n’achète pas un tiers de pelote.`,
        ],
      },
      {
        h2: 'Pourquoi une fourchette, et pas un chiffre',
        paragraphs: [
          `Un bonnet adulte en fil moyen demande, selon la source, entre 137 et 229${NBSP}mètres. L’écart n’est pas une imprécision de la page${NBSP}: il est réel. Il vient de la taille de la tête, de la hauteur du bonnet, du point choisi, d’un revers ou d’un pompon, et de la façon dont chacune serre son fil. Un point en relief, comme les côtes ou les torsades, consomme nettement plus de fil qu’un point plat.`,
          `Prenez le bas de la fourchette pour un petit ouvrage au point simple, le haut pour un grand ouvrage ou un point travaillé. Entre les deux, partez du haut${NBSP}: un reste de fil se range, un manque se paie.`,
        ],
      },
      {
        h2: 'Le crochet consomme plus que le tricot',
        paragraphs: [
          `À poids de fil égal, un ouvrage au crochet demande en général plus de fil qu’un ouvrage tricoté. Une maille de crochet est faite de boucles enroulées et nouées, qui retiennent davantage de longueur que la maille jersey du tricot, et le tissu obtenu est plus épais. Le tableau utilisé ici ne distingue pas les deux techniques${NBSP}; si vous crochetez, mieux vaut viser le haut de la fourchette, voire un peu au-dessus pour un point dense comme la maille serrée.`,
          `Le point lui-même pèse plus que la technique. Des brides espacées, un point ajouré ou un motif en granny demandent moins de fil qu'un tissu plein. Si votre patron donne un métrage, il l'emporte toujours sur cette page.`,
        ],
      },
      {
        h2: 'Acheter une pelote de plus, du même lot',
        paragraphs: [
          `Une pelote de plus est la meilleure assurance de l’ouvrage. D’abord parce que vous pouvez en manquer avant la dernière manche ou la dernière bordure. Ensuite parce que la teinte change d’un bain de teinture à l’autre${NBSP}: le numéro de lot figure sur l’étiquette, et deux pelotes de lots différents peuvent laisser une bande visible dans l’ouvrage. Achetez tout le fil d’un coup, avec le même numéro de lot, et gardez l’étiquette.`,
          `Si vous n’êtes pas sûre de la quantité, choisissez un fil que la marque fabrique encore, pour pouvoir en racheter. Pour un grand ouvrage comme un plaid ou un pull, alternez les pelotes toutes les deux rangées si les lots diffèrent${NBSP}: la différence de teinte se fond alors dans le tissu.`,
        ],
      },
      {
        h2: 'Et si le poids de fil ne me dit rien ?',
        paragraphs: [
          `Les catégories 0 à 6 de la liste sont celles du Craft Yarn Council. Si vous hésitez entre «${NBSP}worsted${NBSP}» et «${NBSP}aran${NBSP}», la page des poids de fil les explique${NBSP}; pour vérifier que votre fil fait bien la tension du patron, le calculateur d’échantillon compare les deux. Les pages des tailles de crochet et d’aiguilles donnent l’outil qui va avec chaque poids.`,
        ],
      },
    ],
    faqTitle: 'Questions fréquentes',
    faq: [
      {
        q: 'Combien de pelotes pour un plaid ?',
        a: `Pour un plaid en fil moyen (catégorie 4), la source donne de 1${NBSP}500 à 2${NBSP}000 yards, soit environ 1${NBSP}372 à 1${NBSP}829 mètres. Avec des pelotes de 200 mètres, cela fait 7 à 10 pelotes.`,
      },
      {
        q: 'Cette estimation est-elle exacte ?',
        a: 'Non, c’est une fourchette, annoncée comme telle. Elle part de tableaux publiés pour des ouvrages d’adulte et ne connaît ni votre point ni votre tension.',
      },
      {
        q: 'Que faire s’il me manque quelques mètres ?',
        a: 'Gardez une pelote entière de plus, du même lot. Pour la dernière bordure, une pelote entamée suffit souvent, et elle reste utilisable pour un autre ouvrage.',
      },
    ],
    toWeights: 'Les poids de fil',
    toGauge: 'Le calculateur d’échantillon',
    toHooks: 'Les tailles de crochet',
    toNeedles: 'Les tailles d’aiguilles',
  },
  en: {
    seoTitle: `How much yarn do I need? Yardage calculator — ${SITE_NAME}`,
    seoDescription:
      'Hat, scarf, afghan, sweater: a range of yards and skeins by yarn weight and your skein length, with the source of the chart.',
    h1: 'How much yarn do I need?',
    lead: 'Pick a project and a yarn weight, enter the length of your skein: the page gives a range of metres and skeins, never a single figure.',
    projectLabel: 'Project',
    weightLabel: 'Yarn weight',
    skeinLabel: 'Length of one skein, in metres',
    skeinHint: 'Printed on the ball band, for example 200.',
    resultTitle: 'Estimate',
    projects: {
      hat: 'Adult hat',
      scarf: 'Scarf',
      afghan: 'Afghan',
      sweater: 'Adult sweater',
      mittens: 'Mittens',
      socks: 'Socks',
    },
    result: 'Plan on {min} to {max} metres.',
    resultOneCount: 'That is {minS} to {maxS} skeins of your length.',
    needSkein: 'Enter the length of one skein to get the number of skeins.',
    noSource:
      'We have no sourced figure for this project in this yarn weight, and we do not make one up: try a neighbouring weight, or follow the length your pattern gives.',
    estimateNote:
      'This is an estimate: the chart comes from AllFreeKnitting ("How Much Yarn Do I Need?") and covers adult-sized projects. Your stitch, size and tension will move the result. When in doubt, buy one skein more.',
    sections: [
      {
        h2: 'Reading the length on the ball band',
        paragraphs: [
          'What counts on a skein is not its weight in grams but its length: how much yarn it holds. Two 100-gram skeins can hold 120 or 300 metres depending on the fibre and the thickness. That is the number, given in metres and often in yards, that you enter here. If your label only gives yards, multiply by 0.9144 to get metres.',
          'The chart behind this page is published in yards, like American patterns; we convert it to metres and round to the nearest metre. The number of skeins is always rounded up: nobody buys a third of a skein.',
        ],
      },
      {
        h2: 'Why a range and not a figure',
        paragraphs: [
          'An adult hat in medium-weight yarn takes, according to the source, between 137 and 229 metres. The gap is not vagueness on the page’s part: it is real. It comes from head size, the height of the hat, the stitch chosen, a brim or a pompom, and how tightly each person works. A textured stitch, such as ribbing or cables, uses noticeably more yarn than a flat one.',
          'Take the low end for a small project in a simple stitch, the high end for a large project or a worked stitch. When in between, start from the high end: a leftover can be stored, a shortfall has to be paid for.',
        ],
      },
      {
        h2: 'Crochet uses more than knitting',
        paragraphs: [
          'At the same yarn weight, a crocheted piece generally takes more yarn than a knitted one. A crochet stitch is made of looped and knotted wraps that hold more length than a knit stockinette stitch, and the fabric comes out thicker. The chart used here does not tell the two techniques apart; if you crochet, aim for the top of the range, even a little above it for a dense stitch such as single crochet.',
          'The stitch matters more than the technique. Spaced double crochets, an openwork stitch or a granny motif take less yarn than a solid fabric. If your pattern gives a length, it always wins over this page.',
        ],
      },
      {
        h2: 'Buy one more skein, from the same dye lot',
        paragraphs: [
          'One more skein is the best insurance for a project. First because you can run out before the last sleeve or the last border. Then because the shade changes from one dye bath to the next: the lot number is on the label, and two skeins from different lots can leave a visible band in the work. Buy all the yarn at once, with the same lot number, and keep the label.',
          'If you are unsure of the amount, choose a yarn the brand still makes, so you can buy more. For a large project such as an afghan or a sweater, alternate skeins every two rows if the lots differ: the difference in shade then blends into the fabric.',
        ],
      },
      {
        h2: 'What if yarn weight means nothing to me?',
        paragraphs: [
          'Categories 0 to 6 in the list are the Craft Yarn Council’s. If you hesitate between "worsted" and "aran", the yarn weight page explains them; to check that your yarn makes the pattern’s tension, the gauge calculator compares the two. The crochet hook and knitting needle pages give the tool that goes with each weight.',
        ],
      },
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'How many skeins for an afghan?',
        a: 'For an afghan in medium-weight yarn (category 4), the source gives 1,500 to 2,000 yards, about 1,372 to 1,829 metres. With 200-metre skeins, that is 7 to 10 skeins.',
      },
      {
        q: 'Is this estimate exact?',
        a: 'No, it is a range, and says so. It starts from published charts for adult-sized projects and knows neither your stitch nor your tension.',
      },
      {
        q: 'What if I am a few metres short?',
        a: 'Keep one whole extra skein, from the same lot. For the last border, a partly used skein is often enough, and it stays usable for another project.',
      },
    ],
    toWeights: 'Yarn weights',
    toGauge: 'The gauge calculator',
    toHooks: 'Crochet hook sizes',
    toNeedles: 'Knitting needle sizes',
  },
};

const PROJECT_ORDER: readonly ProjectType[] = [
  'hat',
  'scarf',
  'afghan',
  'sweater',
  'mittens',
  'socks',
];

/** Lit un nombre tapé à la française ou à l'anglaise ; vide ou illisible : `NaN`. */
function parseNumber(text: string): number {
  const cleaned = text.trim().replace(',', '.');
  return cleaned ? Number(cleaned) : Number.NaN;
}

/**
 * Page-outil « combien de fil » (fiche 54) : fourchette de mètres et de
 * pelotes tirée d'un tableau sourcé. Le résultat est vide dans le HTML
 * pré-rendu ; le formulaire, l'explication et la FAQ y sont.
 */
@Component({
  selector: 'fil-yardage-page',
  imports: [Button, InputField, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
    </section>

    <section class="card stack">
      <div class="field">
        <label for="yardage-project">{{ c.projectLabel }}</label>
        <select filInput id="yardage-project" (change)="project.set($any($event.target).value)">
          @for (option of projectOptions; track option.value) {
            <option [value]="option.value" [selected]="option.value === project()">
              {{ option.label }}
            </option>
          }
        </select>
      </div>
      <div class="field">
        <label for="yardage-weight">{{ c.weightLabel }}</label>
        <select filInput id="yardage-weight" (change)="category.set(+$any($event.target).value)">
          @for (option of weightOptions; track option.value) {
            <option [value]="option.value" [selected]="option.value === category()">
              {{ option.label }}
            </option>
          }
        </select>
      </div>
      <div class="field">
        <label for="yardage-skein">{{ c.skeinLabel }}</label>
        <input
          filInput
          type="text"
          inputmode="decimal"
          id="yardage-skein"
          autocomplete="off"
          [value]="skeinText()"
          (input)="skeinText.set($any($event.target).value)"
        />
        <p class="hint">{{ c.skeinHint }}</p>
      </div>
    </section>

    <section class="card stack">
      <h2 class="card-title">{{ c.resultTitle }}</h2>
      <div class="gauge-result" aria-live="polite">
        @if (missing()) {
          <p>{{ c.noSource }}</p>
        } @else if (rangeText(); as text) {
          <p class="step-body">{{ text }}</p>
          <p>{{ skeinsText() || c.needSkein }}</p>
        }
      </div>
      <p>{{ c.estimateNote }}</p>
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
      <a filButton="primary" [routerLink]="i18n.link('yarnWeights')">{{ c.toWeights }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('gaugeCalculator')">{{ c.toGauge }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('hookSizes')">{{ c.toHooks }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('needleSizes')">{{ c.toNeedles }}</a>
    </div>
  `,
})
export default class YardagePage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];

  protected readonly projectOptions = PROJECT_ORDER.map((value) => ({
    value,
    label: this.c.projects[value],
  }));
  // Les catégories 0 à 6 : la 7 (jumbo) n'a aucune ligne sourcée.
  protected readonly weightOptions = YARN_WEIGHTS.filter((w) => w.category <= 6).map((w) => ({
    value: w.category,
    label: `${w.category} – ${w.us.slice(0, 2).join(', ')}`,
  }));

  protected readonly project = signal<ProjectType>('hat');
  protected readonly category = signal(4);
  protected readonly skeinText = signal('');

  /** Mètres de la combinaison, indépendamment de la pelote. */
  private readonly base = computed(() => estimateYardage(this.project(), this.category(), 1));
  protected readonly missing = computed(() => this.base() === null);
  private readonly full = computed(() =>
    estimateYardage(this.project(), this.category(), parseNumber(this.skeinText())),
  );

  protected readonly rangeText = computed(() => {
    const base = this.base();
    if (!base) return '';
    return this.c.result
      .replace('{min}', this.num(base.minMetres))
      .replace('{max}', this.num(base.maxMetres));
  });
  protected readonly skeinsText = computed(() => {
    const full = this.full();
    if (!full) return '';
    return this.c.resultOneCount
      .replace('{minS}', String(full.minSkeins))
      .replace('{maxS}', String(full.maxSkeins));
  });

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.yardageCalculator;
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

  private num(value: number): string {
    return value.toLocaleString(this.locale === 'fr' ? 'fr-FR' : 'en-GB');
  }
}
