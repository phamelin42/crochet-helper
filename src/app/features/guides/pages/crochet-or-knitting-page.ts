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
  readonly h2Diff: string;
  readonly bodyDiff: string;
  readonly h2Easier: string;
  readonly bodyEasier: string;
  readonly h2Projects: string;
  readonly bodyProjects: string;
  readonly h2Yarn: string;
  readonly bodyYarn: string;
  readonly h2Both: string;
  readonly bodyBoth: string;
  readonly h2Tools: string;
  readonly h2First: string;
  readonly bodyFirst: string;
  readonly bodyTools: string;
  readonly seeAlso: string;
  readonly linkPattern: string;
  readonly linkChart: string;
  readonly backToReader: string;
  readonly backToGlossary: string;
}

const COPY: Record<Locale, GuideCopy> = {
  fr: {
    seoTitle: `Crochet ou tricot : quelle différence, et par lequel commencer — ${SITE_NAME}`,
    seoDescription:
      'Un crochet ou deux aiguilles, quelle technique est la plus facile pour débuter, quels projets chacune permet : les différences entre crochet et tricot expliquées simplement.',
    h1: 'Crochet ou tricot : quelle différence, et par lequel commencer ?',
    lead: `Les deux produisent du tissu à partir d'un seul fil, mais avec des outils et une logique différents. Ni l'un ni l'autre n'est strictement supérieur${NBSP}: le choix dépend surtout de ce qu'on a envie de fabriquer, et du temps qu'on a envie d'y passer.`,
    h2Diff: `Quelle est la différence entre crochet et tricot${NBSP}?`,
    bodyDiff: `Le crochet se travaille avec un seul crochet et une seule boucle active à la fois${NBSP}: chaque maille se termine avant de passer à la suivante, ce qui rend l'ouvrage facile à poser et reprendre sans repère. Le tricot se travaille avec deux aiguilles et garde toutes les mailles d'un rang actives en même temps, enfilées sur l'aiguille${NBSP}; un rang inachevé peut filer si une maille glisse. Le tissu obtenu diffère aussi${NBSP}: le crochet donne une matière plus dense et plus structurée, le tricot un tissu plus souple et plus extensible, proche de celui des vêtements du commerce.`,
    h2Easier: `Lequel est le plus facile pour débuter${NBSP}?`,
    bodyEasier: `Le crochet a une réputation méritée de démarrage plus rapide${NBSP}: une seule boucle active pardonne une erreur — il suffit de défaire la dernière maille — et les premiers objets ronds (dessous de verre, petite peluche) demandent peu de mailles différentes. Le tricot exige de maîtriser deux gestes de base (endroit et envers) avant qu'un ouvrage prenne forme, et une maille qui file peut redescendre plusieurs rangs avant d'être repérée. Aucun des deux n'est difficile en soi${NBSP}: le crochet a simplement une courbe d'apprentissage plus courte sur les dix premières heures.`,
    h2Projects: `Quels projets se prêtent mieux au crochet${NBSP}? Au tricot${NBSP}?`,
    bodyProjects: `Le crochet excelle sur les formes rondes et structurées travaillées en un seul morceau${NBSP}: peluches (amigurumi), paniers, napperons, sacs qui doivent garder leur forme. Le tricot convient mieux aux vêtements portés près du corps${NBSP}: pulls, chaussettes, bonnets, tout ce qui doit s'étirer avec le mouvement. Les deux techniques se combinent aussi dans un même ouvrage${NBSP}: une bordure au crochet finit souvent un vêtement tricoté, et certaines designers alternent les deux à l'intérieur d'une même pièce pour profiter de la texture de chacune.`,
    h2Yarn: `Peut-on utiliser la même laine${NBSP}?`,
    bodyYarn: `Oui, le même fil convient aux deux techniques, mais elles n'en consomment pas la même quantité${NBSP}: le crochet utilise en général 20 à 30${NBSP}% de fil en plus que le tricot pour une surface équivalente, parce que chaque maille serrée enroule plus de fil qu'une maille tricotée. Un patron précise toujours le métrage nécessaire${NBSP}; en cas de conversion d'un projet d'une technique à l'autre, mieux vaut prévoir large. Le grammage et la matière du fil comptent aussi${NBSP}: une laine qui tricote souple peut donner un crochet raide si le crochet choisi est trop petit pour son épaisseur.`,
    h2Both: 'Faut-il apprendre les deux ?',
    bodyBoth: `Pas pour commencer${NBSP}: apprendre une seule technique jusqu'à l'aisance donne de meilleurs résultats que jongler entre les deux dès le départ. Beaucoup de personnes qui pratiquent les deux ont commencé par l'une, s'y sont senties à l'aise, puis ont ajouté l'autre pour les projets où elle convient mieux — une bordure, une finition, un tissu plus extensible. Rien n'oblige à choisir définitivement${NBSP}: le crochet et le tricot se rejoignent d'ailleurs sur beaucoup de notions communes, à commencer par la lecture d'un patron.`,
    h2Tools: `Quel matériel faut-il pour commencer${NBSP}?`,
    bodyTools: `Le crochet demande le moins de matériel${NBSP}: un crochet à la bonne taille pour le fil choisi, une paire de ciseaux, et une aiguille à laine pour rentrer les fils en fin d'ouvrage — de quoi commencer pour moins de dix euros. Le tricot demande une paire d'aiguilles adaptée au fil (ou un jeu de plusieurs tailles, utile pour comparer l'échantillon), des marqueurs de maille pour repérer un repère dans le rang, et la même aiguille à laine pour les finitions. Dans les deux cas, mieux vaut un fil clair et de gros calibre pour les premiers essais${NBSP}: les mailles s'y voient bien, et les erreurs se repèrent avant de s'accumuler.`,
    h2First: `Combien de temps avant de terminer un premier ouvrage${NBSP}?`,
    bodyFirst: `Au crochet, une lingette ou un carré de couverture se termine souvent dans la même soirée que celle où l'on apprend la maille serrée${NBSP}: c'est ce retour rapide qui fait tenir la pratique. Un amigurumi simple demande deux à trois soirées, un bonnet une semaine à raison d'une heure par jour. Au tricot, le même carré prend plus longtemps parce qu'il faut d'abord apprivoiser deux aiguilles et rattraper les mailles qui s'échappent, mais le rythme s'accélère nettement une fois le geste acquis${NBSP}: comptez une à deux semaines pour une écharpe simple. Dans les deux cas, mieux vaut un petit objet fini qu'un grand projet abandonné au tiers — un ouvrage terminé apprend plus qu'un ouvrage parfait resté en chantier.`,
    seeAlso: 'À lire aussi',
    linkPattern: 'Comment lire un patron de crochet',
    linkChart: 'Comment lire un diagramme de crochet',
    backToReader: 'Essayer le lecteur de patrons',
    backToGlossary: 'Toutes les abréviations',
  },
  en: {
    seoTitle: `Crochet or knitting: what is the difference, and which to start with — ${SITE_NAME}`,
    seoDescription:
      'One hook or two needles, which is easier for a beginner, which projects suit which craft: the differences between crochet and knitting, explained simply.',
    h1: 'Crochet or knitting: what is the difference, and which should you start with?',
    lead: 'Both turn a single strand of yarn into fabric, but with different tools and a different logic. Neither is strictly better: the choice mostly comes down to what you want to make, and how much time you want to spend making it.',
    h2Diff: 'What is the difference between crochet and knitting?',
    bodyDiff:
      'Crochet works with a single hook and a single active loop at a time: each stitch finishes before the next one starts, which makes the work easy to set down and pick back up without a stitch marker. Knitting works with two needles and keeps every stitch of a row active at once, threaded on the needle; an unfinished row can unravel if a stitch slips off. The resulting fabric differs too: crochet produces a denser, more structured fabric, knitting a softer, stretchier one, closer to what off-the-shelf clothing is made from.',
    h2Easier: 'Which is easier to start with?',
    bodyEasier:
      'Crochet has a fair reputation for a faster start: a single active loop forgives a mistake — you just undo the last stitch — and early round projects (a coaster, a small amigurumi) need few different stitches. Knitting requires mastering two basic moves (knit and purl) before a piece takes shape, and a dropped stitch can run down several rows before it is caught. Neither craft is hard on its own: crochet just has a shorter learning curve over the first ten hours.',
    h2Projects: 'Which projects suit crochet better? Which suit knitting?',
    bodyProjects:
      'Crochet excels at round, structured shapes worked in a single piece: amigurumi, baskets, doilies, bags that need to hold their shape. Knitting suits garments worn close to the body better: sweaters, socks, hats, anything that needs to stretch with movement. The two techniques also combine within the same piece: a crochet edging often finishes a knitted garment, and some designers alternate between the two within a single piece to make use of each texture.',
    h2Yarn: 'Can you use the same yarn for both?',
    bodyYarn:
      'Yes, the same yarn works for both crafts, but they do not use it in the same quantity: crochet generally uses 20 to 30% more yarn than knitting for an equivalent area, because each single crochet wraps more yarn than a knit stitch. A pattern always states the yardage needed; when converting a project from one craft to the other, it is safer to buy extra. Weight and fibre matter too: a yarn that knits up soft can crochet stiff if the hook chosen is too small for its thickness.',
    h2Both: 'Do you need to learn both?',
    bodyBoth:
      'Not to get started: learning one craft to fluency gives better results than juggling both from day one. Many people who practise both started with one, grew comfortable with it, then added the other for the projects it suits better — an edging, a finish, a stretchier fabric. Nothing forces a permanent choice: crochet and knitting share plenty of common ground anyway, starting with how to read a pattern.',
    h2Tools: 'What gear do you need to get started?',
    bodyTools:
      'Crochet needs the least gear: a hook sized for the chosen yarn, a pair of scissors, and a yarn needle to weave in ends once the piece is done — enough to get started for under ten pounds. Knitting needs a pair of needles matched to the yarn (or a set of several sizes, useful for comparing gauge), stitch markers to flag a point in the row, and the same yarn needle for finishing. Either way, a light-coloured, chunky yarn works best for a first try: the stitches show up clearly, and mistakes get caught before they pile up.',
    h2First: 'How long before you finish a first piece?',
    bodyFirst: `With crochet, a dishcloth or a blanket square is often finished the same evening you learn single crochet: that quick result is what keeps beginners going. A simple amigurumi takes two or three evenings, a hat about a week at an hour a day. Knitting the same square takes longer at first, because two needles need taming and dropped stitches have to be caught, but the pace picks up sharply once the movement settles: count on one to two weeks for a plain scarf. Either way, a small finished object beats a large one abandoned a third of the way through — a piece you complete teaches you more than a perfect piece left on the hook.`,
    seeAlso: 'Read next',
    linkPattern: 'How to read a crochet pattern',
    linkChart: 'How to read a crochet chart',
    backToReader: 'Try the pattern reader',
    backToGlossary: 'All abbreviations',
  },
};

@Component({
  selector: 'fil-crochet-or-knitting-page',
  imports: [Button, RouterLink],
  host: { class: 'wrap' },
  template: `
    <article class="prose">
      <h1>{{ c.h1 }}</h1>
      <p class="lead">{{ c.lead }}</p>

      <h2>{{ c.h2Diff }}</h2>
      <p>{{ c.bodyDiff }}</p>

      <h2>{{ c.h2Easier }}</h2>
      <p>{{ c.bodyEasier }}</p>

      <h2>{{ c.h2Projects }}</h2>
      <p>{{ c.bodyProjects }}</p>

      <h2>{{ c.h2Yarn }}</h2>
      <p>{{ c.bodyYarn }}</p>

      <h2>{{ c.h2Both }}</h2>
      <p>{{ c.bodyBoth }}</p>

      <h2>{{ c.h2Tools }}</h2>
      <p>{{ c.bodyTools }}</p>

      <h2>{{ c.h2First }}</h2>
      <p>{{ c.bodyFirst }}</p>

      <h2>{{ c.seeAlso }}</h2>
      <ul>
        <li>
          <a [routerLink]="hrefOf('guideReadingPattern')">{{ c.linkPattern }}</a>
        </li>
        <li>
          <a [routerLink]="hrefOf('guideReadingChart')">{{ c.linkChart }}</a>
        </li>
      </ul>

      <div class="navrow">
        <a filButton="primary" [routerLink]="i18n.link('reader')">{{ c.backToReader }}</a>
        <a filButton="ghost" [routerLink]="i18n.link('glossary')">{{ c.backToGlossary }}</a>
      </div>
    </article>
  `,
})
export class CrochetOrKnittingPage {
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];

  protected hrefOf(route: 'guideReadingPattern' | 'guideReadingChart'): string {
    return `${localePrefix(this.locale)}${ROUTE_PATHS[route][this.locale]}`;
  }

  constructor() {
    this.i18n.setLocale(this.locale);
    const url = `${this.origin}${localePrefix(this.locale)}${ROUTE_PATHS.guideCrochetOrKnitting[this.locale]}`;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path: ROUTE_PATHS.guideCrochetOrKnitting,
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
