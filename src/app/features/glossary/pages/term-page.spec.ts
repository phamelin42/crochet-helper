import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { Locale } from '../../../core/i18n/locale';
import { GLOSSARY, GlossaryEntry } from '../../reader/data/glossary';
import { TERM_ARTICLES } from '../data/term-articles';
import { headOf } from '../data/term-neighbors';
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
      'Que veut dire \u00AB\u00A0inc\u00A0\u00BB au crochet et au tricot\u00A0? Traduction\u00A0: augmentation \u2014 Pattern Reader',
    );
  });

  it('dit « Traduction » quand l’abréviation vient de l’autre langue', () => {
    // La requête type : « blo crochet traduction ».
    expect(titleOf(entry('blo'), 'fr')).toBe(
      'Que veut dire \u00AB\u00A0blo\u00A0\u00BB au crochet\u00A0? Traduction\u00A0: dans le brin arri\u00E8re uniquement \u2014 Pattern Reader',
    );
    for (const e of GLOSSARY) {
      for (const locale of ['fr', 'en'] as const) {
        const label = locale === 'fr' ? 'Traduction\u00A0:' : 'Translation:';
        if (e.lang === locale) expect(titleOf(e, locale)).not.toContain(label);
        else expect(titleOf(e, locale)).toContain(`${label} ${headOf(e[locale])}`);
      }
    }
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

describe('GlossaryTermPage — retour au glossaire', () => {
  it('ramène sur la ligne du terme, pas en haut de la liste', () => {
    const host = render('blo', 'fr');
    const back = [...host.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Toutes les abréviations'),
    );
    expect(back?.getAttribute('href')).toBe('/fr/glossaire#blo');
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
    for (const slug of Object.keys(TERM_ARTICLES)) {
      for (const locale of ['fr', 'en'] as const) {
        TestBed.resetTestingModule();
        const host = render(slug, locale);
        const article = TERM_ARTICLES[slug][locale];

        expect(host.textContent, `${slug} ${locale}`).toContain(article.tip);
        expect(host.querySelectorAll('h2').length, `${slug} ${locale}`).toBeGreaterThanOrEqual(7);
        expect(host.querySelectorAll('.abbr').length, `${slug} ${locale}`).toBeGreaterThan(0);
      }
    }
  });
});
