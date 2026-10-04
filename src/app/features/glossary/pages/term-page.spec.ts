import { DOCUMENT } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Locale } from '../../../core/i18n/locale';
import { GLOSSARY, GlossaryEntry } from '../../reader/data/glossary';
import { TERM_ARTICLES, TermArticle } from '../data/term-articles';
import GlossaryTermPage, { regionNoteOf, titleOf } from './term-page';

function render(slug: string, locale: Locale): HTMLElement {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { data: { locale } },
          paramMap: of(convertToParamMap({ slug })),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(GlossaryTermPage);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const headings = (host: HTMLElement): string[] =>
  [...host.querySelectorAll('h2')].map((h) => h.textContent?.trim() ?? '');

const entry = (term: string): GlossaryEntry => GLOSSARY.find((e) => e.term === term)!;

describe('titleOf', () => {
  it('annonce le même métier que la question de la page', () => {
    expect(titleOf(entry('sc'), 'en')).toBe(
      'What does \u201Csc\u201D mean in crochet? Single crochet \u2014 Pattern Reader',
    );
    expect(titleOf(entry('k2tog'), 'en')).toBe(
      'What does \u201Ck2tog\u201D mean in knitting? Knit 2 together \u2014 Pattern Reader',
    );
    // Le piège : un terme des deux métiers ne doit pas se dire « crochet » seul.
    expect(titleOf(entry('inc'), 'en')).toBe(
      'What does \u201Cinc\u201D mean in crochet and knitting? Increase \u2014 Pattern Reader',
    );
    expect(titleOf(entry('inc'), 'fr')).toBe(
      'Que veut dire \u00AB\u00A0inc\u00A0\u00BB au crochet et au tricot\u00A0? Augmentation \u2014 Pattern Reader',
    );
  });

  it('ne garde que la tête de la définition, glose exclue', () => {
    expect(titleOf(entry('dim'), 'fr')).toContain('Diminution \u2014 Pattern Reader');
  });
});

describe('regionNoteOf', () => {
  it('prévient que le britannique emploie ces lettres pour une autre maille', () => {
    expect(regionNoteOf(entry('dc'), 'en')).toEqual({
      note: 'In a British pattern, \u201Cdc\u201D means single crochet.',
      other: entry('sc'),
    });
    expect(regionNoteOf(entry('dc'), 'fr')?.note).toBe(
      'Dans un patron britannique, \u00AB\u00A0dc\u00A0\u00BB d\u00E9signe la maille serr\u00E9e.',
    );
    expect(regionNoteOf(entry('dtr'), 'en')?.other.term).toBe('tr');
  });

  it('donne l’équivalent britannique d’un terme américain', () => {
    expect(regionNoteOf(entry('hdc'), 'en')?.note).toBe(
      'A British pattern writes \u201Chtr\u201D for this stitch.',
    );
  });

  it('présente un terme britannique par son équivalent américain', () => {
    expect(regionNoteOf(entry('trtr'), 'en')).toEqual({
      note: '\u201Ctrtr\u201D only exists in British notation. A US pattern writes \u201Cdtr\u201D for this stitch.',
      other: entry('dtr'),
    });
  });

  it('ne dit rien d’un terme hors du décalage US/UK', () => {
    expect(regionNoteOf(entry('ch'), 'en')).toBeUndefined();
  });
});

describe('GlossaryTermPage — article', () => {
  const ARTICLE_TITLES = [
    'How to work it',
    'In a pattern',
    'US or UK?',
    'Common mistakes',
    'A tip',
  ];

  it('ajoute cinq sections, dans l’ordre, quand l’abréviation a un article', () => {
    const shown = headings(render('sc', 'en'));

    expect(shown.slice(0, 5)).toEqual(ARTICLE_TITLES);
    expect(shown).toContain('Try it with a row from your pattern');
    expect(shown).toContain('See also');
  });

  it('laisse une page sans article inchangée', () => {
    const shown = headings(render('flo', 'en'));

    for (const title of ARTICLE_TITLES) expect(shown).not.toContain(title);
    expect(shown).toContain('Try it with a row from your pattern');
    expect(shown).toContain('See also');
  });

  it('rend chaque article dans sa langue, rang souligné compris', () => {
    for (const [slug, byLocale] of Object.entries(TERM_ARTICLES)) {
      for (const [locale, article] of Object.entries(byLocale) as [Locale, TermArticle][]) {
        TestBed.resetTestingModule();
        const host = render(slug, locale);

        expect(host.textContent, `${slug} ${locale}`).toContain(article.tip);
        expect(host.querySelectorAll('h2').length, `${slug} ${locale}`).toBeGreaterThanOrEqual(7);
        expect(host.querySelectorAll('.abbr').length, `${slug} ${locale}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('GlossaryTermPage — une page par concept', () => {
  const links = () => {
    const head = TestBed.inject(DOCUMENT).head;
    const href = (selector: string) => head.querySelector(selector)?.getAttribute('href');
    return {
      canonical: href('link[rel="canonical"]'),
      en: href('link[rel="alternate"][hreflang="en"]'),
      fr: href('link[rel="alternate"][hreflang="fr"]'),
    };
  };

  it('relie la page anglaise du cercle magique à sa page française, sous deux slugs', () => {
    render('magic-ring', 'en');
    expect(links()).toEqual({
      canonical: 'https://patternreader.com/glossary/magic-ring',
      en: 'https://patternreader.com/glossary/magic-ring',
      fr: 'https://patternreader.com/fr/glossaire/cercle-magique',
    });

    TestBed.resetTestingModule();
    render('cercle-magique', 'fr');
    expect(links()).toEqual({
      canonical: 'https://patternreader.com/fr/glossaire/cercle-magique',
      en: 'https://patternreader.com/glossary/magic-ring',
      fr: 'https://patternreader.com/fr/glossaire/cercle-magique',
    });
  });

  it('une graphie sans page affiche la page qui la sert, et y mène', () => {
    const navigate = vi.spyOn(Router.prototype, 'navigateByUrl').mockResolvedValue(true);
    const host = render('slst', 'en');
    expect(host.querySelector('h1')?.textContent).toContain('sl st');
    expect(links().canonical).toBe('https://patternreader.com/glossary/sl-st');
    expect(navigate).toHaveBeenCalledWith('/glossary/sl-st', { replaceUrl: true });
    navigate.mockRestore();
    // La graphie est nommée sans lien, l'autre notation (mc, ss) a le sien.
    const items = [...host.querySelectorAll('.term-links li')].map((li) => ({
      text: li.textContent?.trim(),
      linked: !!li.querySelector('a'),
    }));
    expect(items).toContainEqual({ text: 'slst — English abbreviation', linked: false });
    for (const a of host.querySelectorAll<HTMLAnchorElement>('.term-links a')) {
      expect(a.getAttribute('href')).not.toMatch(
        /\/(slst|rnds|sts|crab-st|mr|magic-loop|cercle-magique)$/,
      );
    }
  });
});

describe('GlossaryTermPage — indexation', () => {
  const robots = () => TestBed.inject(Meta).getTag('name="robots"')?.content;

  it('une page à article est indexée, une page de gabarit ne l’est pas mais reste suivie', () => {
    render('sc', 'en');
    expect(robots()).toBe('index, follow, max-image-preview:large');

    TestBed.resetTestingModule();
    render('flo', 'en');
    expect(robots()).toBe('noindex, follow');
  });

  it('affiche la FAQ d’une abréviation ambiguë, et le guide qui convient', () => {
    const host = render('mc', 'en');
    expect(headings(host)).toContain('Frequently asked questions');
    expect(host.textContent).toContain('What does MC mean in an English pattern?');
    // `mc` est française : lue en anglais, elle mène au guide du patron étranger.
    const guide = [...host.querySelectorAll<HTMLAnchorElement>('.term-links a')].find((a) =>
      a.textContent?.startsWith('Guide'),
    );
    expect(guide?.getAttribute('href')).toBe('/read-a-french-pattern');
  });
});
