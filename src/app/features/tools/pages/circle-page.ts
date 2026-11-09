import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';
import { InputField } from '../../../shared/ui/field/input';
import { ReaderStore } from '../../reader/state/reader-store';
import {
  CIRCLE_STITCHES,
  CircleStitch,
  MAX_CIRCLE_ROUNDS,
  MIN_CIRCLE_ROUNDS,
  circlePattern,
  circleRounds,
  increasesPerRound,
} from '../data/circle';

const NBSP = ' ';

interface Section {
  readonly h2: string;
  readonly paragraphs: readonly string[];
}

interface CircleCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly stitchLabel: string;
  readonly roundsLabel: string;
  readonly roundsHint: string;
  readonly invalid: string;
  readonly stitches: Record<CircleStitch, string>;
  readonly resultTitle: string;
  /** `{n}` : nombre de mailles du dernier rang. */
  readonly summary: string;
  readonly open: string;
  readonly sections: readonly Section[];
  readonly faqTitle: string;
  readonly faq: readonly { readonly q: string; readonly a: string }[];
  readonly toGauge: string;
  readonly toHooks: string;
  readonly toForeign: string;
}

// Les textes vivent dans la page, pas dans `translations.ts` : ils n'ont rien à faire dans le bundle initial.
const COPY: Record<Locale, CircleCopy> = {
  fr: {
    seoTitle: `Cercle au crochet${NBSP}: augmentations rang par rang`,
    seoDescription:
      'Choisissez la maille et le nombre de rangs : chaque rang d’un disque au crochet s’écrit avec son total de mailles, puis s’ouvre dans le lecteur. Gratuit.',
    h1: `Un disque au crochet, rang par rang`,
    lead: `Choisissez la maille et le nombre de rangs${NBSP}: la page écrit chaque rang de votre disque, avec le nombre de mailles à la fin, puis l’ouvre dans le lecteur pour le suivre une étape à la fois.`,
    stitchLabel: 'Maille',
    roundsLabel: 'Nombre de rangs',
    roundsHint: `De ${MIN_CIRCLE_ROUNDS} à ${MAX_CIRCLE_ROUNDS}.`,
    invalid: `Saisissez un nombre entier de rangs, de ${MIN_CIRCLE_ROUNDS} à ${MAX_CIRCLE_ROUNDS}.`,
    stitches: {
      sc: 'Maille serrée (6 augmentations par rang)',
      hdc: 'Demi-bride (8 augmentations par rang)',
      dc: 'Bride (12 augmentations par rang)',
    },
    resultTitle: 'Les rangs',
    summary: `Le dernier rang compte {n}${NBSP}mailles.`,
    open: 'Lire dans le lecteur',
    sections: [
      {
        h2: 'La règle des augmentations',
        paragraphs: [
          `Un disque au crochet se travaille en spirale ou en rangs fermés, à partir d’un cercle magique. À chaque rang, le tour du disque s’allonge, et il faut ajouter des mailles pour que le tissu reste plat. Le nombre à ajouter ne change pas d’un rang à l’autre${NBSP}: 6 mailles de plus en maille serrée, 8 en demi-bride, 12 en bride. Le rang n compte donc 6${NBSP}×${NBSP}n mailles en maille serrée, 8${NBSP}×${NBSP}n en demi-bride et 12${NBSP}×${NBSP}n en bride.`,
          `La raison est géométrique. Le tour d’un cercle vaut environ six fois et quart son rayon, et chaque rang ajoute à ce rayon la hauteur d’une maille. Plus la maille est haute, plus le tour grandit vite, et plus il faut d’augmentations. Six en maille serrée et douze en bride sont les valeurs établies. Pour la demi-bride, on rencontre huit ou neuf selon les patrons${NBSP}; cette page retient huit, le choix le plus courant, et vous pouvez en ajouter une de plus si votre disque se creuse.`,
        ],
      },
      {
        h2: 'Lire les rangs',
        paragraphs: [
          `Le premier rang pose les mailles de départ dans le cercle magique. Le deuxième double chaque maille${NBSP}: une augmentation, c’est-à-dire deux mailles dans la même maille, dans chacune. À partir du troisième rang, on répète un motif${NBSP}: quelques mailles simples, puis une augmentation. Au rang 3, une maille simple sépare deux augmentations${NBSP}; au rang 4, deux${NBSP}; au rang 5, trois, et ainsi de suite. C’est pourquoi le motif s’écrit «${NBSP}[2 ms, aug] x 6${NBSP}» et non plus «${NBSP}aug dans chaque m${NBSP}».`,
          `Le nombre entre parenthèses, à la fin de la ligne, est le total de mailles du rang. Comptez-le à la fin de chaque rang${NBSP}: c’est la meilleure façon de repérer tout de suite une augmentation oubliée, avant qu’elle ne déforme le disque. Les augmentations d’un rang ne se placent pas au-dessus de celles du rang précédent${NBSP}; décalez-les d’une maille pour obtenir un cercle plutôt qu’un hexagone.`,
        ],
      },
      {
        h2: 'Un disque qui gondole, un disque qui se creuse',
        paragraphs: [
          `Si le bord ondule comme une collerette, il y a trop de mailles${NBSP}: le tissu est plus long que le cercle qu’il doit remplir. Vérifiez d’abord le compte de chaque rang. Si les comptes sont justes, c’est que vous serrez moins que l’ouvrage ne l’exige${NBSP}: passez à un crochet plus petit, ou serrez davantage le fil. Le calculateur d’échantillon aide à vérifier que le tissu a la tension attendue.`,
          `Si le disque se creuse et forme une soucoupe, c’est l’inverse${NBSP}: il manque des mailles, le bord est trop court pour la surface. Reprenez le dernier rang correct, comptez, et rajoutez l’augmentation oubliée. Un disque qui se creuse légèrement est aussi un signe que vous serrez beaucoup${NBSP}; un crochet d’une taille au-dessus le détend.`,
        ],
      },
      {
        h2: 'Disque plat ou légèrement bombé',
        paragraphs: [
          `La règle de cette page donne un disque plat, celui d’un tapis, d’un dessous de plat ou du fond d’un panier. Pour un dessus de bonnet ou une tête d’amigurumi, on veut au contraire une calotte légèrement bombée${NBSP}: on arrête alors les augmentations plus tôt, ou on en omet une partie, et l’on travaille ensuite quelques rangs sans augmenter pour que les côtés montent. C’est une variante, non la règle${NBSP}: le nombre exact dépend de la maille, de la tension et de la forme voulue, et la page n’en invente aucun.`,
        ],
      },
      {
        h2: 'Le fond d’un bonnet, d’un panier ou d’un amigurumi',
        paragraphs: [
          `Tout ce qui se crochète en rond commence par un disque. Le fond d’un panier est un disque plat, puis on cesse d’augmenter pour monter les parois. Un bonnet commence par un disque dont on arrête la croissance quand son diamètre atteint celui du haut de la tête, puis on le travaille tout droit. Une pièce d’amigurumi suit la même logique, avec une calotte qui se referme quand on diminue à l’inverse de ce que vous lisez ici.`,
          `Pour savoir combien de rangs il faut, mesurez le diamètre voulu et comparez-le à votre échantillon${NBSP}: chaque rang ajoute à peu près la hauteur d’une maille au rayon. Les tailles de crochet donnent l’outil qui va avec le fil, et si vous suivez un patron écrit dans l’autre langue, la page qui explique comment le lire vous évitera les faux sens.`,
        ],
      },
    ],
    faqTitle: 'Questions fréquentes',
    faq: [
      {
        q: 'Combien de mailles au rang 5 en maille serrée ?',
        a: `Trente${NBSP}: le rang n compte 6${NBSP}×${NBSP}n mailles, soit 6${NBSP}×${NBSP}5.`,
      },
      {
        q: 'Pourquoi 12 augmentations en bride ?',
        a: 'Une bride est environ deux fois plus haute qu’une maille serrée : le tour du disque grandit deux fois plus vite à chaque rang, il faut donc deux fois plus de mailles pour le remplir.',
      },
      {
        q: 'Le disque est-il fermé en spirale ou en rangs ?',
        a: 'Les deux conviennent. La page écrit les rangs sans la chaînette de fermeture : votre patron ou votre habitude dit comment les terminer.',
      },
    ],
    toGauge: 'Le calculateur d’échantillon',
    toHooks: 'Les tailles de crochet',
    toForeign: 'Lire un patron anglais',
  },
  en: {
    seoTitle: `Crochet circle: increases round by round — ${SITE_NAME}`,
    seoDescription:
      'Pick the stitch and the number of rounds: the page writes every round of a crochet circle, with the stitch count, and opens it in the reader. Free, no account.',
    h1: 'A crochet circle, round by round',
    lead: 'Pick the stitch and the number of rounds: the page writes every round of your circle, with the stitch count at the end, then opens it in the reader so you can follow it one step at a time.',
    stitchLabel: 'Stitch',
    roundsLabel: 'Number of rounds',
    roundsHint: `From ${MIN_CIRCLE_ROUNDS} to ${MAX_CIRCLE_ROUNDS}.`,
    invalid: `Enter a whole number of rounds, from ${MIN_CIRCLE_ROUNDS} to ${MAX_CIRCLE_ROUNDS}.`,
    stitches: {
      sc: 'Single crochet (6 increases per round)',
      hdc: 'Half double crochet (8 increases per round)',
      dc: 'Double crochet (12 increases per round)',
    },
    resultTitle: 'The rounds',
    summary: 'The last round has {n} stitches.',
    open: 'Read it in the reader',
    sections: [
      {
        h2: 'The increase rule',
        paragraphs: [
          'A crochet circle is worked in a spiral or in joined rounds, from a magic ring. Every round makes the edge of the disc longer, and you add stitches so the fabric stays flat. The number to add does not change from one round to the next: 6 more stitches in single crochet, 8 in half double crochet, 12 in double crochet. Round n therefore has 6 × n stitches in single crochet, 8 × n in half double and 12 × n in double.',
          'The reason is geometry. The edge of a circle is about six and a quarter times its radius, and each round adds the height of one stitch to that radius. The taller the stitch, the faster the edge grows, and the more increases you need. Six in single crochet and twelve in double crochet are the established values. For half double crochet you will meet eight or nine depending on the pattern; this page uses eight, the most common choice, and you can add one more if your disc turns into a bowl.',
        ],
      },
      {
        h2: 'Reading the rounds',
        paragraphs: [
          'The first round places the starting stitches in the magic ring. The second doubles every stitch: an increase, meaning two stitches in the same stitch, in each one. From the third round on, you repeat a pattern: a few plain stitches, then an increase. In round 3 one plain stitch separates two increases; in round 4, two; in round 5, three, and so on. That is why the pattern is written "[2 sc, inc] x 6" and no longer "inc in each st".',
          'The number in brackets at the end of the line is the stitch total for the round. Count it at the end of every round: it is the best way to catch a forgotten increase straight away, before it distorts the disc. The increases of one round do not go directly above those of the previous round; shift them by a stitch to get a circle rather than a hexagon.',
        ],
      },
      {
        h2: 'A disc that ruffles, a disc that cups',
        paragraphs: [
          'If the edge ripples like a frill, there are too many stitches: the fabric is longer than the circle it has to fill. Check the count of each round first. If the counts are right, you are working more loosely than the piece needs: go down a hook size, or pull the yarn tighter. The gauge calculator helps you check that the fabric has the tension you expect.',
          'If the disc cups into a saucer, it is the opposite: stitches are missing, and the edge is too short for the surface. Go back to the last correct round, count, and add the forgotten increase. A slightly cupping disc can also mean you are working very tightly; a hook one size up relaxes it.',
        ],
      },
      {
        h2: 'A flat disc or a slightly domed one',
        paragraphs: [
          'The rule on this page gives a flat disc, the kind you want for a rug, a trivet or the base of a basket. For the top of a hat or the head of an amigurumi you want the opposite, a slightly domed cap: you stop increasing sooner, or skip some of the increases, then work a few rounds without increasing so the sides rise. That is a variant, not the rule: the exact number depends on the stitch, your tension and the shape you want, and the page does not make one up.',
        ],
      },
      {
        h2: 'The base of a hat, a basket or an amigurumi',
        paragraphs: [
          'Anything crocheted in the round starts with a disc. The base of a basket is a flat disc, then you stop increasing to build the walls. A hat starts with a disc that you stop growing when its diameter reaches that of the top of the head, then you work straight. An amigurumi piece follows the same logic, with a cap that closes again when you decrease, the reverse of what you read here.',
          'To know how many rounds you need, measure the diameter you want and compare it with your gauge: each round adds about the height of one stitch to the radius. The hook size chart gives the tool that goes with your yarn, and if you follow a pattern written in the other language, the page that explains how to read it will spare you false friends.',
        ],
      },
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'How many stitches in round 5 of single crochet?',
        a: 'Thirty: round n has 6 × n stitches, so 6 × 5.',
      },
      {
        q: 'Why 12 increases in double crochet?',
        a: 'A double crochet is about twice as tall as a single crochet: the edge of the disc grows twice as fast every round, so it takes twice as many stitches to fill it.',
      },
      {
        q: 'Is the circle closed in a spiral or in rounds?',
        a: 'Both work. The page writes the rounds without the closing chain or slip stitch: your pattern or your habit says how to end them.',
      },
    ],
    toGauge: 'The gauge calculator',
    toHooks: 'Crochet hook sizes',
    toForeign: 'Reading a French pattern',
  },
};

/** Lit un entier tapé ; vide ou illisible : `NaN`. */
function parseRounds(text: string): number {
  const cleaned = text.trim();
  return /^\d{1,3}$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/**
 * Page-outil « disque au crochet » (fiche 56) : les rangs d'un cercle, pré-rendus
 * avec la valeur par défaut, et un bouton qui les ouvre dans le lecteur.
 */
@Component({
  selector: 'fil-circle-page',
  imports: [Button, InputField, RouterLink],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
    </section>

    <section class="card stack">
      <div class="field">
        <label for="circle-stitch">{{ c.stitchLabel }}</label>
        <select filInput id="circle-stitch" (change)="stitch.set($any($event.target).value)">
          @for (option of stitchOptions; track option.value) {
            <option [value]="option.value" [selected]="option.value === stitch()">
              {{ option.label }}
            </option>
          }
        </select>
      </div>
      <div class="field">
        <label for="circle-rounds">{{ c.roundsLabel }}</label>
        <input
          filInput
          type="text"
          inputmode="numeric"
          id="circle-rounds"
          autocomplete="off"
          [value]="roundsText()"
          (input)="roundsText.set($any($event.target).value)"
        />
        <p class="hint">{{ c.roundsHint }}</p>
      </div>
    </section>

    <section class="card stack">
      <h2 class="card-title">{{ c.resultTitle }}</h2>
      <div aria-live="polite">
        @if (rounds(); as list) {
          <ol class="circle-rounds" data-testid="circle-rounds">
            @for (round of list; track round.round) {
              <li>{{ round.text }}</li>
            }
          </ol>
          <p>{{ summary() }}</p>
        } @else {
          <p role="alert">{{ c.invalid }}</p>
        }
      </div>
      <p>
        <button
          type="button"
          filButton="primary"
          data-testid="circle-open"
          [disabled]="!rounds() || !store.restored()"
          (click)="openInReader()"
        >
          {{ c.open }}
        </button>
      </p>
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
      <a filButton="ghost" [routerLink]="i18n.link('gaugeCalculator')">{{ c.toGauge }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('hookSizes')">{{ c.toHooks }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('readForeignPattern')">{{ c.toForeign }}</a>
    </div>
  `,
})
export default class CirclePage {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(ReaderStore);
  private readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];

  protected readonly stitchOptions = CIRCLE_STITCHES.map((value) => ({
    value,
    label: this.c.stitches[value],
  }));
  protected readonly stitch = signal<CircleStitch>('sc');
  protected readonly roundsText = signal('6');

  private readonly count = computed(() => parseRounds(this.roundsText()));
  protected readonly rounds = computed(() =>
    circleRounds(this.stitch(), this.count(), this.locale),
  );
  protected readonly summary = computed(() => {
    const list = this.rounds();
    const last = list?.[list.length - 1];
    return last ? this.c.summary.replace('{n}', String(last.total)) : '';
  });

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.circleCalculator;
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

  /** Un nouveau projet : le projet actif reste intact dans « Mes projets ». */
  protected openInReader(): void {
    const stitch = this.stitch();
    const count = this.count();
    const text = circlePattern(stitch, count, this.locale);
    if (!text) return;
    this.store.openFromTool(text);
    this.analytics.track('circle_opened_in_reader', {
      stitch,
      rounds: count,
      increases: increasesPerRound(stitch),
    });
    void this.router.navigateByUrl(this.i18n.link('reader'));
  }
}
