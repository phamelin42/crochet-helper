import { describe, expect, it } from 'vitest';
import { GLOSSARY, annotate, definitionOf } from './glossary';

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
