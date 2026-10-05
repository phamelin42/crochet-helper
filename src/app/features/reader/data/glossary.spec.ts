import { describe, expect, it } from 'vitest';
import vercel from '../../../../../vercel.json';
import { LOCALES, Locale } from '../../../core/i18n/locale';
import { GLOSSARY, annotate, definitionOf, pageEntryOf, pageSlugsOf } from './glossary';

describe('glossaire', () => {
  // Slugs publiés, donc indexés : on peut en ajouter, jamais en modifier un.
  // Écrit en paires plutôt qu'en liste ordonnée pour qu'ajouter une entrée au
  // glossaire, à n'importe quelle place, n'oblige pas à réécrire ce test.
  const PUBLISHED_SLUGS: readonly (readonly [string, string])[] = [
    ['crab st', 'crab-st'],
    ['rsc', 'rsc'],
    ['fpdc', 'fpdc'],
    ['bpdc', 'bpdc'],
    ['slst', 'slst'],
    ['rnd', 'rnd'],
    ['rnds', 'rnds'],
    ['puff', 'puff'],
    ['bobble', 'bobble'],
    ['v-st', 'v-st'],
    ['sp', 'sp'],
    ['beg', 'beg'],
    ['rem', 'rem'],
    ['tbl', 'tbl'],
    ['ms', 'ms'],
    ['sc', 'sc'],
    ['dc', 'dc'],
    ['db', 'db'],
    ['hdc', 'hdc'],
    ['htr', 'htr'],
    ['tr', 'tr'],
    ['dtr', 'dtr'],
    ['trtr', 'trtr'],
    ['mc', 'mc'],
    ['sl st', 'sl-st'],
    ['ss', 'ss'],
    ['ml', 'ml'],
    ['ch', 'ch'],
    ['aug', 'aug'],
    ['inc', 'inc'],
    ['dim', 'dim'],
    ['dec', 'dec'],
    ['sts', 'sts'],
    ['st', 'st'],
    ['magic ring', 'magic-ring'],
    ['cercle magique', 'cercle-magique'],
    ['mr', 'mr'],
    ['blo', 'blo'],
    ['flo', 'flo'],
    ['yo', 'yo'],
    ['tog', 'tog'],
    ['rep', 'rep'],
    ['sk', 'sk'],
    ['fo', 'fo'],
    ['rs', 'rs'],
    ['ws', 'ws'],
    ['k2tog', 'k2tog'],
    ['ssk', 'ssk'],
    ['m1', 'm1'],
    ['co', 'co'],
    ['bo', 'bo'],
    ['magic loop', 'magic-loop'],
    ['br', 'br'],
    ['dbr', 'dbr'],
    ['tbr', 'tbr'],
    ['sc2tog', 'sc2tog'],
    ['sc3tog', 'sc3tog'],
    ['dc2tog', 'dc2tog'],
    ['dc3tog', 'dc3tog'],
    ['cl', 'cl'],
    ['pc', 'pc'],
    ['picot', 'picot'],
    ['shell', 'shell'],
    ['ch-sp', 'ch-sp'],
    ['fphdc', 'fphdc'],
    ['bphdc', 'bphdc'],
  ];

  it.each(PUBLISHED_SLUGS)('garde le slug publié de « %s » : %s', (term, slug) => {
    expect(GLOSSARY.find((entry) => entry.term === term)?.slug).toBe(slug);
  });

  it('ne produit jamais deux fois le même slug, et seulement des caractères d’URL sûrs', () => {
    const slugs = GLOSSARY.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(GLOSSARY.map((entry) => [entry.term, entry] as const))(
    'l’exemple de « %s » contient bien ce terme, reconnu comme tel',
    (term, entry) => {
      const found = annotate(entry.example, 'fr')
        .filter((segment) => segment.definition)
        .map((segment) => segment.text.toLowerCase().replace(/\s+/g, ' '));
      expect(found).toContain(term);
    },
  );

  it('traduit une abréviation dans la langue demandée', () => {
    expect(definitionOf('ms', 'fr')).toBe('maille serrée');
    expect(definitionOf('MS', 'en')).toBe('single crochet');
    expect(definitionOf('zzz', 'fr')).toBeUndefined();
  });

  it('préfère le terme le plus long', () => {
    const segments = annotate('sl st in next st', 'fr');
    expect(segments.find((s) => s.definition)?.text).toBe('sl st');
  });

  it("n'annote pas un fragment de mot", () => {
    const segments = annotate('poste', 'fr');
    expect(segments).toEqual([{ text: 'poste' }]);
  });

  it('conserve le texte intégral une fois recomposé', () => {
    const source = 'Round 2: inc in each st around (12)';
    expect(
      annotate(source, 'fr')
        .map((s) => s.text)
        .join(''),
    ).toBe(source);
  });
});

describe('glossaire — pages et redirections', () => {
  const PREFIX: Record<Locale, string> = { en: '/glossary', fr: '/fr/glossaire' };
  const redirects = new Map(
    (vercel.redirects as { source: string; destination: string; statusCode?: number }[]).map(
      (r) => [r.source, r],
    ),
  );

  for (const locale of LOCALES) {
    it(`une entrée sans page redirige en 301, sans chaîne, vers une vraie page (${locale})`, () => {
      for (const entry of GLOSSARY) {
        const page = pageEntryOf(entry, locale);
        const source = `${PREFIX[locale]}/${entry.slug}`;
        if (page === entry) {
          expect(redirects.has(source), source).toBe(false);
          continue;
        }
        // La cible a sa propre page : jamais une redirection vers une redirection.
        expect(pageEntryOf(page, locale), entry.term).toBe(page);
        expect(redirects.get(source), source).toEqual({
          source,
          destination: `${PREFIX[locale]}/${page.slug}`,
          statusCode: 301,
        });
      }
    });
  }

  it('le cercle magique a une page par langue, chacune la traduction de l’autre', () => {
    const ring = GLOSSARY.find((e) => e.term === 'magic ring')!;
    const cercle = GLOSSARY.find((e) => e.term === 'cercle magique')!;
    expect(pageSlugsOf(ring)).toEqual({ en: 'magic-ring', fr: 'cercle-magique' });
    expect(pageSlugsOf(cercle)).toEqual({ en: 'magic-ring', fr: 'cercle-magique' });
  });
});
