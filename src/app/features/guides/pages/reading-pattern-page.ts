import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';

const NBSP = ' ';

interface Faq {
  readonly q: string;
  readonly a: string;
}

interface GuideCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly h2Abbrev: string;
  readonly bodyAbbrev: string;
  readonly h2Row: string;
  readonly bodyRowIntro: string;
  readonly exampleRow: string;
  readonly bodyRowBreakdown: readonly string[];
  readonly h2Count: string;
  readonly bodyCount: string;
  readonly h2Region: string;
  readonly bodyRegion: string;
  readonly h2Start: string;
  readonly bodyStart: string;
  readonly faqTitle: string;
  readonly faq: readonly Faq[];
  readonly seeAlso: string;
  readonly linkChart: string;
  readonly linkCraft: string;
  readonly backToReader: string;
  readonly backToGlossary: string;
}

const COPY: Record<Locale, GuideCopy> = {
  fr: {
    seoTitle: `Comment lire un patron de crochet ou de tricot — ${SITE_NAME}`,
    seoDescription:
      'Abréviations, rangs, nombre de mailles entre parenthèses, notation US ou UK : la méthode pour décoder un patron de crochet ou de tricot ligne par ligne.',
    h1: 'Comment lire un patron de crochet ou de tricot, pas à pas',
    lead: `Un patron ne se lit pas comme un texte ordinaire${NBSP}: chaque ligne condense une information précise, avec ses propres abréviations et sa propre ponctuation. Une fois la logique comprise, n'importe quel patron devient lisible — même écrit par une autre designer, dans une autre langue.`,
    h2Abbrev: `Que veut dire chaque abréviation${NBSP}?`,
    bodyAbbrev: `Un patron abrège presque tout pour tenir sur une page${NBSP}: «${NBSP}ms${NBSP}» pour maille serrée, «${NBSP}br${NBSP}» pour bride, «${NBSP}aug${NBSP}» pour augmentation, «${NBSP}dim${NBSP}» pour diminution. L'anglais a les siennes — «${NBSP}sc${NBSP}», «${NBSP}dc${NBSP}», «${NBSP}inc${NBSP}», «${NBSP}dec${NBSP}» — et elles ne désignent pas toujours la même maille selon que le patron vient des États-Unis ou du Royaume-Uni. Le glossaire de ce site réunit ces abréviations en français et en anglais, avec leur signification exacte${NBSP}; dans le lecteur, elles sont soulignées et leur traduction apparaît au survol, ce qui évite d'aller les chercher une à une.`,
    h2Row: `Comment lire un rang, ligne par ligne${NBSP}?`,
    bodyRowIntro: `Chaque rang suit à peu près la même structure${NBSP}: un numéro, une instruction, parfois une répétition entre crochets, et un compte de mailles entre parenthèses. Prenons un rang réel${NBSP}:`,
    exampleRow: 'Rang 3 : [ms, aug] x 6 (18)',
    bodyRowBreakdown: [
      `«${NBSP}Rang 3${NBSP}» situe la ligne dans l'ouvrage — le troisième tour depuis le départ, ici en rond puisqu'il n'y a pas de mailles en l'air de tournage.`,
      `«${NBSP}[ms, aug]${NBSP}» est le motif à répéter${NBSP}: une maille serrée, suivie d'une augmentation, dans deux mailles consécutives du rang précédent.`,
      `«${NBSP}x 6${NBSP}» indique le nombre de fois où répéter ce motif sur le tour entier.`,
      `«${NBSP}(18)${NBSP}» est le total de mailles attendu une fois le rang terminé — le repère qui dit si tout s'est bien passé.`,
    ],
    h2Count: `Que veut dire le nombre entre parenthèses${NBSP}?`,
    bodyCount: `C'est le nombre de mailles que le rang doit compter à la fin, pas le nombre de fois où répéter quoi que ce soit. Il sert de vérification${NBSP}: comptez vos mailles à la fin du rang et comparez au chiffre du patron. Un écart signale presque toujours une maille sautée ou une augmentation oubliée quelques rangs plus tôt — mieux vaut le repérer tout de suite qu'à la fin de la pièce, quand il faut tout défaire.`,
    h2Region: `Patron américain ou britannique${NBSP}: comment le repérer${NBSP}?`,
    bodyRegion: `Les mêmes lettres ne désignent pas la même maille des deux côtés de l'Atlantique${NBSP}: un «${NBSP}dc${NBSP}» américain (bride) devient une «${NBSP}tr${NBSP}» britannique, et le «${NBSP}dc${NBSP}» britannique désigne alors une maille serrée. Un patron qui emploie «${NBSP}sc${NBSP}» est presque toujours américain — cette abréviation n'existe pas en notation britannique. À l'inverse, «${NBSP}htr${NBSP}» ou «${NBSP}trtr${NBSP}» trahissent un patron britannique. Le convertisseur US ↔ UK de ce site fait la correspondance terme à terme, dans les deux sens.`,
    h2Start: `Par où commencer quand on débute${NBSP}?`,
    bodyStart: `Choisissez un patron court, en rond, avec peu de tailles et peu de changements de maille — un dessous de verre ou une petite peluche s'y prêtent bien. Lisez le patron en entier avant de commencer${NBSP}: repérez le matériel, l'échantillon, et si les rangs sont numérotés en continu ou recommencent à chaque pièce. Puis collez le texte dans le lecteur de ce site${NBSP}: il découpe le patron en étapes, affiche un rang à la fois en grand, et compte les mailles à votre place.`,
    faqTitle: 'Questions fréquentes',
    faq: [
      {
        q: 'Quelle est la différence entre un rang et un tour ?',
        a: `Un rang se travaille à plat, en tournant l'ouvrage à chaque fin de ligne${NBSP}; un tour (ou «${NBSP}rond${NBSP}») se travaille en spirale ou en cercle fermé, sans tourner, ce qui donne une pièce tubulaire ou plate sans couture. Le patron précise lequel des deux il attend${NBSP}: la mention change souvent d'un tour à l'autre dans une même pièce.`,
      },
      {
        q: "Que faire si le patron ne donne pas le nombre de mailles attendu ?",
        a: `Remontez au dernier rang où le compte correspondait, et reprenez le tricot ou le crochet à partir de là. Défaire deux rangs coûte moins cher que de continuer sur un décompte faux, qui s'aggrave à chaque rang suivant.`,
      },
      {
        q: "Faut-il suivre l'échantillon à la lettre ?",
        a: `Pour un vêtement porté, oui${NBSP}: un échantillon plus serré ou plus lâche que celui du patron change la taille finale de plusieurs centimètres. Pour un objet sans contrainte de taille — sac, plaid, peluche — un échantillon approximatif ne pose pas de problème.`,
      },
      {
        q: 'Pourquoi certains patrons ne comptent pas les mailles en l’air de début de rang ?',
        a: `Ça dépend de la hauteur de la maille et de l'habitude de la designer${NBSP}: les mailles en l'air de tournage remplacent parfois la première maille du rang, et se comptent alors comme telle${NBSP}; d'autres fois elles ne servent qu'à hausser l'ouvrage, et restent hors compte. Le patron le précise en général une fois, en tête de section.`,
      },
    ],
    seeAlso: 'À lire aussi',
    linkChart: 'Comment lire un diagramme de crochet',
    linkCraft: 'Crochet ou tricot : par lequel commencer',
    backToReader: 'Essayer avec votre propre patron',
    backToGlossary: 'Toutes les abréviations',
  },
  en: {
    seoTitle: `How to read a crochet or knitting pattern — ${SITE_NAME}`,
    seoDescription:
      'Abbreviations, rows, the stitch count in parentheses, US or UK notation: the method for decoding a crochet or knitting pattern line by line.',
    h1: 'How to read a crochet or knitting pattern, step by step',
    lead: `A pattern doesn't read like ordinary text: every line packs a precise instruction, with its own abbreviations and its own punctuation. Once the logic clicks, any pattern becomes readable — even one written by a different designer, in a different language.`,
    h2Abbrev: 'What does each abbreviation mean?',
    bodyAbbrev: `A pattern abbreviates almost everything to fit on a page: “sc” for single crochet, “dc” for double crochet, “inc” for increase, “dec” for decrease. And the same letters don't always mean the same stitch — it depends on whether the pattern comes from the US or the UK. The glossary on this site collects these abbreviations in English and French, with their exact meaning; in the reader, they're underlined and their translation shows on hover, so you don't have to look each one up by hand.`,
    h2Row: 'How do you read a row, line by line?',
    bodyRowIntro:
      'Every row follows roughly the same structure: a number, an instruction, sometimes a repeat in brackets, and a stitch count in parentheses. Take a real row:',
    exampleRow: 'Round 3: [sc, inc] x 6 (18)',
    bodyRowBreakdown: [
      '“Round 3” places the line in the piece — the third round from the start, worked in the round since there is no turning chain.',
      '“[sc, inc]” is the pattern to repeat: one single crochet, followed by one increase, worked into two consecutive stitches from the previous round.',
      '“x 6” tells you how many times to repeat that pattern across the whole round.',
      '“(18)” is the total stitch count expected once the row is finished — the checkpoint that tells you whether everything went right.',
    ],
    h2Count: 'What does the number in parentheses mean?',
    bodyCount:
      "It's the number of stitches the row should count at the end, not how many times to repeat anything. It works as a check: count your stitches at the end of the row and compare against the pattern's figure. A mismatch almost always means a skipped stitch or a missed increase a few rows back — better to catch it right away than at the end of the piece, when everything has to come undone.",
    h2Region: 'US or UK pattern: how do you tell?',
    bodyRegion:
      'The same letters do not stand for the same stitch on both sides of the Atlantic: a US “dc” (double crochet) becomes a UK “tr” (treble), and UK “dc” then means single crochet. A pattern that uses “sc” is almost always American — that abbreviation does not exist in British notation. Conversely, “htr” or “trtr” give away a British pattern. The US ↔ UK converter on this site maps every term, in both directions.',
    h2Start: 'Where should a beginner start?',
    bodyStart:
      "Pick a short pattern, worked in the round, with few sizes and few stitch changes — a coaster or a small amigurumi works well. Read the whole pattern before starting: check the materials, the gauge, and whether rows are numbered continuously or restart with every piece. Then paste the text into the reader on this site: it splits the pattern into steps, shows one row at a time in large type, and counts stitches for you.",
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'What is the difference between a row and a round?',
        a: 'A row is worked flat, turning the piece at the end of each line; a round is worked in a spiral or a closed circle, without turning, which produces a tubular or flat piece with no seam. The pattern states which one it expects — and the two often alternate within the same piece.',
      },
      {
        q: "What if the pattern's stitch count doesn't match?",
        a: 'Go back to the last row where the count matched, and rework from there. Undoing two rows costs less than continuing on a wrong count, which only gets worse with every following row.',
      },
      {
        q: 'Do you have to match the gauge exactly?',
        a: "For a worn garment, yes: a gauge tighter or looser than the pattern's changes the finished size by several centimetres. For anything without a size constraint — a bag, a blanket, an amigurumi — an approximate gauge is not a problem.",
      },
      {
        q: "Why do some patterns not count the starting turning chain as a stitch?",
        a: 'It depends on the stitch height and the designer\'s habit: a turning chain sometimes stands in for the row\'s first stitch, and is counted as one; other times it only raises the work and stays uncounted. Patterns usually clarify this once, at the top of a section.',
      },
    ],
    seeAlso: 'Read next',
    linkChart: 'How to read a crochet chart',
    linkCraft: 'Crochet or knitting: which to start with',
    backToReader: 'Try it with your own pattern',
    backToGlossary: 'All abbreviations',
  },
};

@Component({
  selector: 'fil-reading-pattern-page',
  imports: [Button, RouterLink],
  host: { class: 'wrap' },
  template: `
    <article class="prose">
      <h1>{{ c.h1 }}</h1>
      <p class="lead">{{ c.lead }}</p>

      <h2>{{ c.h2Abbrev }}</h2>
      <p>{{ c.bodyAbbrev }}</p>

      <h2>{{ c.h2Row }}</h2>
      <p>{{ c.bodyRowIntro }}</p>
      <p><code>{{ c.exampleRow }}</code></p>
      <ul>
        @for (line of c.bodyRowBreakdown; track line) {
          <li>{{ line }}</li>
        }
      </ul>

      <h2>{{ c.h2Count }}</h2>
      <p>{{ c.bodyCount }}</p>

      <h2>{{ c.h2Region }}</h2>
      <p>{{ c.bodyRegion }}</p>

      <h2>{{ c.h2Start }}</h2>
      <p>{{ c.bodyStart }}</p>

      <h2>{{ c.faqTitle }}</h2>
      @for (item of c.faq; track item.q) {
        <h3>{{ item.q }}</h3>
        <p>{{ item.a }}</p>
      }

      <h2>{{ c.seeAlso }}</h2>
      <ul>
        <li><a [routerLink]="hrefOf('guideReadingChart')">{{ c.linkChart }}</a></li>
        <li><a [routerLink]="hrefOf('guideCrochetOrKnitting')">{{ c.linkCraft }}</a></li>
      </ul>

      <div class="navrow">
        <a filButton="primary" [routerLink]="i18n.link('reader')">{{ c.backToReader }}</a>
        <a filButton="ghost" [routerLink]="i18n.link('glossary')">{{ c.backToGlossary }}</a>
      </div>
    </article>
  `,
})
export class ReadingPatternPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];

  protected hrefOf(route: 'guideReadingChart' | 'guideCrochetOrKnitting'): string {
    return `${localePrefix(this.locale)}${ROUTE_PATHS[route][this.locale]}`;
  }

  constructor() {
    this.i18n.setLocale(this.locale);
    const url = `${this.origin}${localePrefix(this.locale)}${ROUTE_PATHS.guideReadingPattern[this.locale]}`;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path: ROUTE_PATHS.guideReadingPattern,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            '@id': url,
            headline: this.c.h1,
            description: this.c.seoDescription,
            inLanguage: this.locale,
            author: { '@type': 'Organization', name: SITE_NAME },
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
  }
}
