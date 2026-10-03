import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { InputField } from '../../../shared/ui/field/input';
import { Segmented, SegmentedOption } from '../../../shared/ui/segmented/segmented';
// `data/` est du domaine partagé : import autorisé d'une autre fonctionnalité.
import { findHookSize } from '../../converter/data/hook-sizes';
import { GaugeAdvice, Unit, compareGauges, nextHook, stitchesFor, widthFor } from '../data/gauge';

const NBSP = ' ';

interface GaugeCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly unitLabel: string;
  readonly unitCm: string;
  readonly unitIn: string;
  readonly patternTitle: string;
  readonly mineTitle: string;
  readonly resultTitle: string;
  readonly overCm: string;
  readonly overIn: string;
  readonly stitches: string;
  readonly rows: string;
  readonly hookLabel: string;
  readonly hookPlaceholder: string;
  readonly hookUnknown: string;
  readonly invalid: string;
  readonly advice: Record<GaugeAdvice, string>;
  readonly hookUp: string;
  readonly hookDown: string;
  readonly hookEdge: string;
  readonly ratios: string;
  readonly widthLabelCm: string;
  readonly widthLabelIn: string;
  readonly countLabel: string;
  readonly widthToStitches: string;
  readonly stitchesToWidth: string;
  readonly convertInvalid: string;
  readonly sections: readonly { readonly h2: string; readonly paragraphs: readonly string[] }[];
  readonly toHooks: string;
  readonly toConverter: string;
  readonly toImageGrid: string;
  readonly toReader: string;
}

const COPY: Record<Locale, GaugeCopy> = {
  fr: {
    seoTitle: `Calculateur d’échantillon de crochet : mailles et centimètres — ${SITE_NAME}`,
    seoDescription:
      'Comparez l’échantillon du patron et le vôtre : le calculateur dit s’il faut un crochet plus gros ou plus fin, et convertit mailles et centimètres (ou pouces).',
    h1: 'Calculateur d’échantillon de crochet',
    lead: `Saisissez l’échantillon du patron et le vôtre${NBSP}: la page dit quoi changer, puis convertit des mailles en centimètres, ou l’inverse, avec votre propre tension.`,
    unitLabel: 'Unité de mesure',
    unitCm: 'Centimètres',
    unitIn: 'Pouces',
    patternTitle: 'Le patron demande',
    mineTitle: 'Mon échantillon',
    resultTitle: 'Résultat',
    overCm: 'sur 10 cm',
    overIn: 'sur 4 pouces',
    stitches: 'Mailles',
    rows: 'Rangs',
    hookLabel: 'Taille de crochet utilisée (facultatif)',
    hookPlaceholder: '4 mm, G-6…',
    hookUnknown: 'Cette taille n’est pas dans le tableau des tailles de crochet.',
    invalid: `Vérifiez les nombres${NBSP}: il faut de 1 à 100 mailles et de 1 à 100 rangs pour chaque échantillon.`,
    advice: {
      'go-up': `Vous avez plus de mailles que le patron${NBSP}: votre ouvrage est plus serré. Prenez un crochet plus gros.`,
      'go-down': `Vous avez moins de mailles que le patron${NBSP}: votre ouvrage est plus lâche. Prenez un crochet plus fin.`,
      ok: 'Votre échantillon correspond à celui du patron, à 5 % près. Gardez ce crochet.',
    },
    hookUp: 'Taille voisine plus grosse dans le tableau',
    hookDown: 'Taille voisine plus fine dans le tableau',
    hookEdge: 'Il n’y a pas de taille voisine dans ce sens dans le tableau.',
    ratios: 'Vos mailles font {s} % de celles du patron, vos rangs {r} %.',
    widthLabelCm: 'Largeur voulue (cm)',
    widthLabelIn: 'Largeur voulue (pouces)',
    countLabel: 'Nombre de mailles',
    widthToStitches: 'mailles à monter',
    stitchesToWidth: 'de large',
    convertInvalid: `Entrez une largeur plausible (0,5 à 500${NBSP}cm) ou un nombre de mailles entre 1 et 5${NBSP}000.`,
    sections: [
      {
        h2: 'Pourquoi l’échantillon décide de la taille finale',
        paragraphs: [
          `Deux personnes qui suivent le même patron, avec le même fil et le même crochet, n’obtiennent pas le même tissu. L’une serre, l’autre laisse du mou, et chaque maille en porte la trace. Sur dix mailles, l’écart passe inaperçu. Sur un pull de cent quarante mailles, il se compte en dizaines de centimètres${NBSP}: le vêtement est trop petit, ou il flotte.`,
          `L’échantillon est la seule façon de le savoir avant de monter la première maille de l’ouvrage. Il donne le nombre de mailles et de rangs que produit votre main sur une longueur de référence, dix centimètres ou quatre pouces. Le patron annonce ses propres chiffres${NBSP}: le calculateur de cette page compare les deux et vous dit dans quel sens corriger.`,
        ],
      },
      {
        h2: 'Comment faire son échantillon',
        paragraphs: [
          `Travaillez un carré d’environ quinze centimètres de côté, dans le point du patron et avec le fil prévu. Il doit être plus grand que la mesure cherchée${NBSP}: les bords se déforment, et ce sont les mailles du centre qui comptent. Si le patron demande un point compliqué ou des rayures, faites-le tel quel, pas en mailles serrées simples.`,
          `Traitez ensuite l’échantillon comme l’ouvrage fini${NBSP}: lavez-le et faites-le sécher à plat si vous lavez l’ouvrage, bloquez-le à la vapeur ou à l’humidité si le patron le demande. Certains fils, en coton ou en laine, changent sensiblement après un lavage, et un échantillon mesuré avant ne dit plus rien de l’ouvrage lavé. Laissez-le reposer, puis posez-le à plat, sans l’étirer.`,
          `Mesurez au centre, sur dix centimètres, avec une règle rigide. Comptez les mailles sur une rangée, puis les rangs sur une colonne, et notez-les dans les champs «${NBSP}Mon échantillon${NBSP}» ci-dessus. Si le résultat tombe entre deux nombres entiers, comptez les fractions de maille${NBSP}: la page accepte les nombres entiers, alors arrondissez au plus proche, ou mesurez sur vingt centimètres et divisez.`,
        ],
      },
      {
        h2: 'Lire la ligne « gauge » d’un patron anglais',
        paragraphs: [
          `Les patrons anglais donnent l’échantillon sous le nom de «${NBSP}gauge${NBSP}» ou «${NBSP}tension${NBSP}», souvent en début de patron, avec les fournitures. Une ligne typique dit «${NBSP}14 sts and 16 rows = 4 in${NBSP}»${NBSP}: quatorze mailles («${NBSP}stitches${NBSP}») et seize rangs («${NBSP}rows${NBSP}») donnent quatre pouces, soit environ dix centimètres. Le point utilisé est parfois précisé, «${NBSP}in single crochet${NBSP}» ou «${NBSP}in pattern${NBSP}», et il faut le respecter.`,
          `Les patrons européens écrivent plutôt «${NBSP}14 mailles et 16 rangs = 10 cm${NBSP}». Choisissez l’unité du patron avec le sélecteur au-dessus des champs${NBSP}: la longueur de référence passe de dix centimètres à quatre pouces, et les conversions du bas de page suivent.`,
        ],
      },
      {
        h2: 'Ce que fait le calculateur',
        paragraphs: [
          `Il compare vos mailles à celles du patron. Trop de mailles sur la même longueur${NBSP}: votre ouvrage est serré, et il faut un crochet plus gros pour l’aérer. Trop peu${NBSP}: il est lâche, un crochet plus fin le resserrera. Un écart de cinq pour cent ou moins n’appelle aucune correction. Les rangs sont comparés à part, à titre d’information${NBSP}: un rang de plus ou de moins sur dix centimètres se rattrape plus facilement, en ajoutant ou en retirant un tour, qu’une largeur qui ne tombe pas juste.`,
          `Si vous indiquez le crochet utilisé, la page propose la taille voisine du tableau des tailles de crochet, plus grosse ou plus fine selon le conseil. Il s’agit d’un point de départ${NBSP}: un demi-millimètre change nettement la taille d’un vêtement, mais le seul juge est un nouvel échantillon. Refaites-le avec ce crochet avant de vous lancer.`,
          `Les deux conversions du bas servent une fois l’échantillon bon. Avec votre tension, elles disent combien de mailles monter pour une largeur voulue, ou quelle largeur donne un nombre de mailles annoncé.`,
        ],
      },
      {
        h2: 'Quand l’échantillon ne correspond pas',
        paragraphs: [
          `Changer de crochet est le premier réflexe, et le plus simple. Si les mailles sont bonnes mais que les rangs ne le sont pas, changer de crochet dérègle aussitôt les mailles${NBSP}: ajustez plutôt le nombre de rangs du patron à votre hauteur. Si vous ne pouvez pas obtenir le bon échantillon sans un tissu trop raide ou trop mou, changez de fil${NBSP}: un fil de même grosseur mais de fibre différente se comporte autrement.`,
          `Enfin, ne sautez pas cette étape parce que l’ouvrage est petit. Un bonnet ou un châle exigent l’échantillon autant qu’un pull${NBSP}; seul un amigurumi ou un objet décoratif pardonne un écart. Un quart d’heure de crochet au départ vaut mieux qu’un ouvrage à défaire.`,
        ],
      },
    ],
    toHooks: 'Le tableau des tailles de crochet',
    toConverter: 'Convertir un patron entier',
    toImageGrid: 'Une image en grille de crochet',
    toReader: 'Le lecteur de patron',
  },
  en: {
    seoTitle: `Crochet gauge calculator: stitches and centimetres — ${SITE_NAME}`,
    seoDescription:
      'Compare the pattern’s gauge with yours: the calculator tells you whether to go up or down a hook size, and converts stitches to centimetres (or inches) and back.',
    h1: 'Crochet gauge calculator',
    lead: 'Enter the pattern’s gauge and your own: the page tells you what to change, then converts stitches to inches or centimetres, or the other way round, using your own tension.',
    unitLabel: 'Unit of measure',
    unitCm: 'Centimetres',
    unitIn: 'Inches',
    patternTitle: 'The pattern asks for',
    mineTitle: 'My swatch',
    resultTitle: 'Result',
    overCm: 'over 10 cm',
    overIn: 'over 4 in',
    stitches: 'Stitches',
    rows: 'Rows',
    hookLabel: 'Hook size you used (optional)',
    hookPlaceholder: '4 mm, G-6…',
    hookUnknown: 'This size is not in the crochet hook size chart.',
    invalid: 'Check the numbers: each swatch needs 1 to 100 stitches and 1 to 100 rows.',
    advice: {
      'go-up': 'You have more stitches than the pattern: your work is tighter. Go up a hook size.',
      'go-down':
        'You have fewer stitches than the pattern: your work is looser. Go down a hook size.',
      ok: 'Your swatch matches the pattern’s to within 5%. Keep this hook.',
    },
    hookUp: 'Next size up in the chart',
    hookDown: 'Next size down in the chart',
    hookEdge: 'There is no neighbouring size in that direction in the chart.',
    ratios: 'Your stitches are {s}% of the pattern’s, your rows {r}%.',
    widthLabelCm: 'Width you want (cm)',
    widthLabelIn: 'Width you want (inches)',
    countLabel: 'Number of stitches',
    widthToStitches: 'stitches to cast on',
    stitchesToWidth: 'wide',
    convertInvalid: 'Enter a plausible width (0.5 to 500 cm) or a stitch count from 1 to 5,000.',
    sections: [
      {
        h2: 'Why gauge decides the final size',
        paragraphs: [
          'Two people following the same pattern, with the same yarn and the same hook, do not get the same fabric. One pulls tight, the other leaves some slack, and every stitch carries the mark of it. Over ten stitches the difference goes unnoticed. Over a sweater of a hundred and forty stitches it adds up to tens of centimetres: the garment comes out too small, or hangs loose.',
          'A swatch is the only way to find out before you cast on the first stitch of the real piece. It gives the number of stitches and rows your hand produces over a reference length, ten centimetres or four inches. The pattern states its own figures: the calculator on this page compares the two and tells you which way to correct.',
        ],
      },
      {
        h2: 'How to make a swatch',
        paragraphs: [
          'Work a square about fifteen centimetres, or six inches, on each side, in the pattern’s stitch and with the yarn it calls for. It has to be bigger than the length you want to measure: the edges distort, and it is the stitches in the middle that count. If the pattern asks for a complicated stitch or stripes, work it as written, not in plain single crochet.',
          'Then treat the swatch as you will treat the finished piece: wash it and dry it flat if you will wash the piece, block it with steam or dampness if the pattern says to. Some yarns, cotton or wool, change noticeably after a wash, and a swatch measured beforehand says nothing about the washed piece. Let it rest, then lay it flat, without stretching it.',
          'Measure in the middle, over ten centimetres, with a rigid ruler. Count the stitches along a row, then the rows along a column, and enter them in the “My swatch” fields above. If the result falls between two whole numbers, count the fractions of a stitch: this page takes whole numbers, so round to the nearest, or measure over twenty centimetres and halve it.',
        ],
      },
      {
        h2: 'Reading the “gauge” line of an English pattern',
        paragraphs: [
          'English patterns give the swatch under the name “gauge” or “tension”, often at the start of the pattern, with the materials. A typical line reads “14 sts and 16 rows = 4 in”: fourteen stitches and sixteen rows make four inches, about ten centimetres. The stitch used is sometimes given, “in single crochet” or “in pattern”, and you must follow it.',
          'European patterns tend to write “14 stitches and 16 rows = 10 cm”. Pick the pattern’s unit with the selector above the fields: the reference length switches from ten centimetres to four inches, and the conversions at the bottom follow.',
        ],
      },
      {
        h2: 'What the calculator does',
        paragraphs: [
          'It compares your stitches with the pattern’s. Too many stitches over the same length: your work is tight, and a bigger hook will loosen it. Too few: it is loose, and a finer hook will tighten it. A difference of five per cent or less calls for no correction. Rows are compared separately, for information: one row more or fewer over ten centimetres is easier to make up, by adding or removing a round, than a width that does not come out right.',
          'If you tell it which hook you used, the page suggests the neighbouring size in the crochet hook size chart, bigger or finer depending on the advice. It is a starting point: half a millimetre clearly changes the size of a garment, but the only judge is a new swatch. Make one with that hook before you start.',
          'The two conversions at the bottom are for once your swatch is right. With your tension, they tell you how many stitches to cast on for a chosen width, or what width a given number of stitches will give.',
        ],
      },
      {
        h2: 'When the swatch does not match',
        paragraphs: [
          'Changing hook is the first reflex, and the simplest. If the stitches are right but the rows are not, changing hook would throw the stitches off again: adjust the pattern’s number of rows to your own height instead. If you cannot reach the right gauge without a fabric that is too stiff or too floppy, change yarn: a yarn of the same weight but a different fibre behaves differently.',
          'Finally, do not skip this step because the piece is small. A hat or a shawl needs a swatch as much as a sweater does; only an amigurumi or a decorative object forgives a difference. A quarter of an hour of crochet at the start beats a piece to unpick.',
        ],
      },
    ],
    toHooks: 'The crochet hook size chart',
    toConverter: 'Convert a whole pattern',
    toImageGrid: 'Turn a picture into a crochet chart',
    toReader: 'The pattern reader',
  },
};

/** Lit un nombre tapé à la française ou à l'anglaise ; vide ou illisible : `NaN`. */
function parseNumber(text: string): number {
  const cleaned = text.trim().replace(',', '.');
  return cleaned ? Number(cleaned) : Number.NaN;
}

/**
 * Page-outil « calculateur d'échantillon » (fiche 28) : compare l'échantillon
 * du patron et celui de la lectrice, puis convertit mailles et largeur. Le
 * résultat est vide dans le HTML pré-rendu ; le formulaire, lui, y est.
 */
@Component({
  selector: 'fil-gauge-calculator-page',
  imports: [Button, InputField, RouterLink, Segmented],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
    </section>

    <section class="stack">
      <fil-segmented
        name="gauge-unit"
        [label]="c.unitLabel"
        [options]="unitOptions"
        [(selected)]="unitIndex"
      />
    </section>

    <section class="card stack">
      <h2 class="card-title">{{ c.patternTitle }} {{ overLabel() }}</h2>
      <div class="field">
        <label for="gauge-pattern-stitches">{{ c.stitches }}</label>
        <input
          filInput
          type="text"
          inputmode="decimal"
          id="gauge-pattern-stitches"
          autocomplete="off"
          [value]="patternStitches()"
          (input)="patternStitches.set($any($event.target).value)"
        />
      </div>
      <div class="field">
        <label for="gauge-pattern-rows">{{ c.rows }}</label>
        <input
          filInput
          type="text"
          inputmode="decimal"
          id="gauge-pattern-rows"
          autocomplete="off"
          [value]="patternRows()"
          (input)="patternRows.set($any($event.target).value)"
        />
      </div>
    </section>

    <section class="card stack">
      <h2 class="card-title">{{ c.mineTitle }} {{ overLabel() }}</h2>
      <div class="field">
        <label for="gauge-mine-stitches">{{ c.stitches }}</label>
        <input
          filInput
          type="text"
          inputmode="decimal"
          id="gauge-mine-stitches"
          autocomplete="off"
          [value]="mineStitches()"
          (input)="mineStitches.set($any($event.target).value)"
        />
      </div>
      <div class="field">
        <label for="gauge-mine-rows">{{ c.rows }}</label>
        <input
          filInput
          type="text"
          inputmode="decimal"
          id="gauge-mine-rows"
          autocomplete="off"
          [value]="mineRows()"
          (input)="mineRows.set($any($event.target).value)"
        />
      </div>
      <div class="field">
        <label for="gauge-hook">{{ c.hookLabel }}</label>
        <input
          filInput
          type="text"
          id="gauge-hook"
          autocomplete="off"
          [placeholder]="c.hookPlaceholder"
          [value]="hookText()"
          (input)="hookText.set($any($event.target).value)"
        />
      </div>
    </section>

    <section class="card stack">
      <h2 class="card-title">{{ c.resultTitle }}</h2>
      <div class="gauge-result" aria-live="polite">
        @if (filled() && !comparison()) {
          <p>{{ c.invalid }}</p>
        }
        @if (comparison(); as cmp) {
          <p class="step-body gauge-advice">{{ c.advice[cmp.advice] }}</p>
          <p>{{ ratioText() }}</p>
          @if (hookHint(); as hint) {
            <p>{{ hint }}</p>
          }
        }
      </div>

      <div class="field">
        <label for="gauge-width">{{ unit() === 'cm' ? c.widthLabelCm : c.widthLabelIn }}</label>
        <input
          filInput
          type="text"
          inputmode="decimal"
          id="gauge-width"
          autocomplete="off"
          [value]="widthText()"
          (input)="widthText.set($any($event.target).value)"
        />
      </div>
      <div class="field">
        <label for="gauge-count">{{ c.countLabel }}</label>
        <input
          filInput
          type="text"
          inputmode="numeric"
          id="gauge-count"
          autocomplete="off"
          [value]="countText()"
          (input)="countText.set($any($event.target).value)"
        />
      </div>
      <div class="gauge-conversions" aria-live="polite">
        @if (mineValid()) {
          @if (castOn() !== null) {
            <p class="gauge-cast-on">{{ castOn() }} {{ c.widthToStitches }}</p>
          }
          @if (widthResult() !== null) {
            <p class="gauge-width">
              {{ widthResult() }} {{ unitSymbol() }} {{ c.stitchesToWidth }}
            </p>
          }
          @if (convertFilled() && castOn() === null && widthResult() === null) {
            <p>{{ c.convertInvalid }}</p>
          }
        }
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
      <a filButton="primary" [routerLink]="i18n.link('hookSizes')">{{ c.toHooks }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('converter')">{{ c.toConverter }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('imageGrid')">{{ c.toImageGrid }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('reader')">{{ c.toReader }}</a>
    </div>
  `,
})
// Export par défaut : `loadComponent` l'accepte sans `.then`, quelques octets de moins au bundle initial.
export default class GaugeCalculatorPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);
  private readonly analytics = inject(AnalyticsService);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];

  protected readonly unitOptions: readonly SegmentedOption[] = [
    { value: 0, label: this.c.unitCm },
    { value: 1, label: this.c.unitIn },
  ];
  protected readonly unitIndex = signal(0);
  protected readonly unit = computed<Unit>(() => (this.unitIndex() === 0 ? 'cm' : 'in'));
  protected readonly unitSymbol = computed(() => (this.unit() === 'cm' ? 'cm' : 'in'));
  protected readonly overLabel = computed(() =>
    this.unit() === 'cm' ? this.c.overCm : this.c.overIn,
  );

  protected readonly patternStitches = signal('');
  protected readonly patternRows = signal('');
  protected readonly mineStitches = signal('');
  protected readonly mineRows = signal('');
  protected readonly hookText = signal('');
  protected readonly widthText = signal('');
  protected readonly countText = signal('');

  private readonly pattern = computed(() => ({
    stitches: parseNumber(this.patternStitches()),
    rows: parseNumber(this.patternRows()),
  }));
  private readonly mine = computed(() => ({
    stitches: parseNumber(this.mineStitches()),
    rows: parseNumber(this.mineRows()),
  }));

  protected readonly filled = computed(
    () =>
      !!(
        this.patternStitches().trim() ||
        this.patternRows().trim() ||
        this.mineStitches().trim() ||
        this.mineRows().trim()
      ),
  );
  protected readonly comparison = computed(() => compareGauges(this.pattern(), this.mine()));

  protected readonly ratioText = computed(() => {
    const cmp = this.comparison();
    if (!cmp) return '';
    return this.c.ratios
      .replace('{s}', String(Math.round(cmp.stitchRatio * 100)))
      .replace('{r}', String(Math.round(cmp.rowRatio * 100)));
  });

  /** Taille voisine du tableau ; rien quand le conseil est « ok » ou que le crochet n'est pas saisi. */
  protected readonly hookHint = computed(() => {
    const cmp = this.comparison();
    const text = this.hookText().trim();
    if (!cmp || cmp.advice === 'ok' || !text) return '';
    const used = findHookSize(text);
    if (!used) return this.c.hookUnknown;
    const up = cmp.advice === 'go-up';
    const next = nextHook(used.mm, up ? 'up' : 'down');
    if (!next) return this.c.hookEdge;
    return `${up ? this.c.hookUp : this.c.hookDown}${this.locale === 'fr' ? NBSP : ''}: ${this.format(next.mm)} mm (${next.us})`;
  });

  protected readonly mineValid = computed(() => stitchesFor(10, this.mine(), this.unit()) !== null);
  protected readonly convertFilled = computed(
    () => !!(this.widthText().trim() || this.countText().trim()),
  );
  protected readonly castOn = computed(() => {
    const width = stitchesFor(parseNumber(this.widthText()), this.mine(), this.unit());
    return width === null ? null : this.format(width);
  });
  protected readonly widthResult = computed(() => {
    const width = widthFor(parseNumber(this.countText()), this.mine(), this.unit());
    return width === null ? null : this.format(width);
  });

  private lastTracked = '';

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.gaugeCalculator;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': `${this.origin}${localePrefix(this.locale)}${path[this.locale]}`,
        name: this.c.h1,
        description: this.c.seoDescription,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        inLanguage: this.locale,
      },
    });

    // Une fois par combinaison unité + conseil : chaque frappe recalcule, un compte par frappe fausserait la mesure.
    effect(() => {
      const cmp = this.comparison();
      if (!cmp) return;
      const key = `${this.unit()}:${cmp.advice}`;
      if (key === this.lastTracked) return;
      this.lastTracked = key;
      this.analytics.track('gauge_calculated', { unit: this.unit(), advice: cmp.advice });
    });
  }

  private format(value: number): string {
    return value.toLocaleString(this.locale);
  }
}
