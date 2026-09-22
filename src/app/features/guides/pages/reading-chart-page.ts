import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { Button } from '../../../shared/ui/button/button';

const NBSP = ' ';

interface GuideCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly h2Symbols: string;
  readonly bodySymbols: string;
  readonly h2Direction: string;
  readonly bodyDirection: string;
  readonly h2FlatRound: string;
  readonly bodyFlatRound: string;
  readonly h2Knit: string;
  readonly bodyKnit: string;
  readonly h2Mismatch: string;
  readonly bodyMismatch: string;
  readonly h2Why: string;
  readonly bodyWhy: string;
  readonly seeAlso: string;
  readonly linkPattern: string;
  readonly linkCraft: string;
  readonly backToReader: string;
  readonly backToGlossary: string;
}

const COPY: Record<Locale, GuideCopy> = {
  fr: {
    seoTitle: `Comment lire un diagramme de crochet ou une grille de tricot — ${SITE_NAME}`,
    seoDescription:
      'Symboles, sens de lecture, diagramme en rang ou en rond, grille de jacquard : la méthode pour lire un diagramme de crochet ou de tricot sans se perdre.',
    h1: 'Comment lire un diagramme de crochet, ou une grille de tricot',
    lead: `Un diagramme remplace le texte par des symboles${NBSP}: une fois leur légende connue, on voit d'un coup d'œil la forme de l'ouvrage, ce qu'aucune suite de rangs écrits ne montre aussi vite. Encore faut-il savoir où commencer et dans quel sens avancer.`,
    h2Symbols: `Que représentent les symboles d'un diagramme de crochet${NBSP}?`,
    bodySymbols: `Chaque symbole dessine la maille qu'il représente, en plus petit${NBSP}: un ovale ou une croix pour la maille serrée, un «${NBSP}T${NBSP}» court pour la demi-bride, un «${NBSP}T${NBSP}» barré d'un ou deux traits pour la bride ou la bride double — le nombre de traits comptant la hauteur de la maille. Les mailles en l'air sont un petit ovale ou un point isolé, les diminutions et augmentations regroupent ou séparent plusieurs symboles à leur base. La légende figure toujours en marge du diagramme${NBSP}; elle change légèrement d'un livre à l'autre, donc à vérifier avant de commencer même pour quelqu'un qui a déjà lu des diagrammes.`,
    h2Direction: `Dans quel sens lire un diagramme${NBSP}?`,
    bodyDirection: `Le premier rang se lit à partir du point de départ indiqué par la designer, en général en bas du diagramme. Pour un ouvrage travaillé à plat, chaque rang change de sens${NBSP}: le rang 1 se lit de droite à gauche, le rang 2 de gauche à droite, comme le fait la main qui tourne l'ouvrage entre deux rangs. Un numéro placé au début de chaque ligne indique où elle commence, ce qui évite de deviner le sens à chaque fois.`,
    h2FlatRound: `Diagramme en rang ou en rond${NBSP}: quelle différence${NBSP}?`,
    bodyFlatRound: `Un diagramme en rond part du centre et s'en éloigne, tour après tour, comme les cercles concentriques d'une cible${NBSP}; il se lit toujours dans le même sens, celui des aiguilles d'une montre en général, sans jamais changer de direction d'un tour à l'autre puisque l'ouvrage n'est pas tourné. Un diagramme en rang, lui, s'empile de bas en haut comme un texte, avec l'alternance de sens décrite plus haut. Le type de diagramme se devine au premier coup d'œil${NBSP}: une spirale ou des cercles signalent un travail en rond, des lignes empilées un travail à plat.`,
    h2Knit: `Comment lire une grille de tricot (jacquard, torsades)${NBSP}?`,
    bodyKnit: `Une grille de tricot fonctionne sur le même principe qu'un diagramme de crochet, mais chaque case représente une maille et non un symbole dessiné${NBSP}: une case vide ou un point pour l'endroit, un trait horizontal pour l'envers, des flèches ou des cases croisées pour une torsade. Pour un jacquard, chaque couleur de case correspond à une couleur de fil, et la grille entière forme le motif fini${NBSP}: pas besoin de lire une légende ligne par ligne, l'image suffit. La lecture suit la même règle d'alternance${NBSP}: à l'endroit de droite à gauche, à l'envers de gauche à droite, sauf mention contraire en tête de grille.`,
    h2Mismatch: `Le diagramme et le texte ne correspondent pas${NBSP}: lequel suivre${NBSP}?`,
    bodyMismatch: `Le texte fait autorité en cas de désaccord${NBSP}: une erreur d'impression touche plus facilement un symbole isolé sur une grille dense qu'une ligne de texte, et les errata publiés par les designers corrigent presque toujours le texte en premier. Le diagramme reste malgré tout la meilleure vue d'ensemble${NBSP}: utile pour vérifier la forme générale de l'ouvrage et repérer une erreur de comptage avant qu'elle ne s'accumule sur plusieurs rangs.`,
    h2Why: `Faut-il un diagramme si le patron donne déjà le texte${NBSP}?`,
    bodyWhy: `Les deux se complètent plus qu'ils ne se remplacent${NBSP}: le texte donne l'instruction précise maille par maille, le diagramme donne la forme d'ensemble et permet de repérer en un regard où se situe le rang en cours dans la pièce entière. Pour un motif qui se répète (un point d'ajour, un empiècement de torsades), le diagramme montre en une seule image ce que le texte décrit sur plusieurs lignes de répétitions imbriquées — beaucoup de tricoteuses le trouvent alors plus rapide à suivre que le texte une fois le principe compris. Un diagramme traverse aussi les langues sans traduction${NBSP}: un symbole de bride se lit pareil dans un magazine japonais, allemand ou français, ce qui explique sa popularité dans les patrons publiés à l'international.`,
    seeAlso: 'À lire aussi',
    linkPattern: 'Comment lire un patron de crochet',
    linkCraft: 'Crochet ou tricot : par lequel commencer',
    backToReader: 'Lire un patron pas à pas',
    backToGlossary: 'Toutes les abréviations',
  },
  en: {
    seoTitle: `How to read a crochet chart or a knitting grid — ${SITE_NAME}`,
    seoDescription:
      'Symbols, reading direction, flat versus in-the-round charts, colourwork grids: the method for reading a crochet or knitting chart without getting lost.',
    h1: 'How to read a crochet chart, or a knitting grid',
    lead: `A chart replaces text with symbols: once you know the key, you see the shape of the piece at a glance, something no list of written rows shows as quickly. You still need to know where to start and which way to go.`,
    h2Symbols: 'What do the symbols in a crochet chart mean?',
    bodySymbols:
      'Every symbol sketches the stitch it stands for, at a smaller scale: an oval or a cross for single crochet, a short “T” for half double crochet, a “T” crossed by one or two bars for double or treble crochet — the number of bars tracking the stitch height. Chain stitches appear as a small oval or a dot, and increases and decreases group or split several symbols at their base. The key always sits alongside the chart; it varies slightly from one publisher to another, so it is worth checking even for someone who has read charts before.',
    h2Direction: 'Which way do you read a chart?',
    bodyDirection:
      'The first row starts at the point the designer marks, usually at the bottom of the chart. For a flat piece, every row switches direction: row 1 reads right to left, row 2 left to right, matching how the hand turns the work between rows. A number at the start of each line marks where it begins, so there is no need to guess the direction each time.',
    h2FlatRound: 'Flat chart or in-the-round chart: what is the difference?',
    bodyFlatRound:
      'An in-the-round chart starts at the centre and moves outward, round after round, like the concentric circles of a target; it always reads the same way, usually clockwise, and never switches direction between rounds since the work is not turned. A flat chart, on the other hand, stacks from bottom to top like text, with the direction alternating as described above. The type of chart is usually obvious at a glance: a spiral or concentric circles signal work in the round, stacked lines signal flat work.',
    h2Knit: 'How do you read a knitting grid (colourwork, cables)?',
    bodyKnit:
      'A knitting grid works on the same principle as a crochet chart, but each square stands for a stitch rather than a drawn symbol: a blank square or a dot for knit, a horizontal dash for purl, arrows or crossed squares for a cable. For colourwork, each square colour matches a yarn colour, and the whole grid forms the finished motif — no need to read a key line by line, the picture speaks for itself. Reading follows the same alternating rule: knit rows right to left, purl rows left to right, unless the grid states otherwise at the top.',
    h2Mismatch: 'The chart and the text disagree: which do you follow?',
    bodyMismatch:
      'The text takes precedence when the two disagree: a printing error is more likely to hit an isolated symbol on a dense grid than a line of text, and errata published by designers almost always correct the text first. The chart still gives the best overview: useful for checking the overall shape of the piece and catching a counting mistake before it builds up over several rows.',
    h2Why: 'Do you need a chart if the pattern already gives the text?',
    bodyWhy:
      'The two complement each other more than they replace one another: the text gives the precise stitch-by-stitch instruction, the chart gives the overall shape and lets you spot at a glance where the current row sits in the whole piece. For a repeating motif (a lace pattern, a cable panel), the chart shows in a single image what the text describes across several nested repeat lines — many knitters find it faster to follow than the text once the principle clicks. A chart also crosses languages without translation: a treble crochet symbol reads the same in a Japanese, German or French magazine, which explains its popularity in patterns published internationally.',
    seeAlso: 'Read next',
    linkPattern: 'How to read a crochet pattern',
    linkCraft: 'Crochet or knitting: which to start with',
    backToReader: 'Read a pattern step by step',
    backToGlossary: 'All abbreviations',
  },
};

@Component({
  selector: 'fil-reading-chart-page',
  imports: [Button, RouterLink],
  host: { class: 'wrap' },
  template: `
    <article class="prose">
      <h1>{{ c.h1 }}</h1>
      <p class="lead">{{ c.lead }}</p>

      <h2>{{ c.h2Symbols }}</h2>
      <p>{{ c.bodySymbols }}</p>

      <h2>{{ c.h2Direction }}</h2>
      <p>{{ c.bodyDirection }}</p>

      <h2>{{ c.h2FlatRound }}</h2>
      <p>{{ c.bodyFlatRound }}</p>

      <h2>{{ c.h2Knit }}</h2>
      <p>{{ c.bodyKnit }}</p>

      <h2>{{ c.h2Mismatch }}</h2>
      <p>{{ c.bodyMismatch }}</p>

      <h2>{{ c.h2Why }}</h2>
      <p>{{ c.bodyWhy }}</p>

      <h2>{{ c.seeAlso }}</h2>
      <ul>
        <li>
          <a [routerLink]="hrefOf('guideReadingPattern')">{{ c.linkPattern }}</a>
        </li>
        <li>
          <a [routerLink]="hrefOf('guideCrochetOrKnitting')">{{ c.linkCraft }}</a>
        </li>
      </ul>

      <div class="navrow">
        <a filButton="primary" [routerLink]="i18n.link('reader')">{{ c.backToReader }}</a>
        <a filButton="ghost" [routerLink]="i18n.link('glossary')">{{ c.backToGlossary }}</a>
      </div>
    </article>
  `,
})
export class ReadingChartPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];

  protected hrefOf(route: 'guideReadingPattern' | 'guideCrochetOrKnitting'): string {
    return `${localePrefix(this.locale)}${ROUTE_PATHS[route][this.locale]}`;
  }

  constructor() {
    this.i18n.setLocale(this.locale);
    const url = `${this.origin}${localePrefix(this.locale)}${ROUTE_PATHS.guideReadingChart[this.locale]}`;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path: ROUTE_PATHS.guideReadingChart,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': url,
        headline: this.c.h1,
        description: this.c.seoDescription,
        inLanguage: this.locale,
        author: { '@type': 'Organization', name: SITE_NAME },
      },
    });
  }
}
