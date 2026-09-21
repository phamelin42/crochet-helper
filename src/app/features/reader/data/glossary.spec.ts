import { describe, expect, it } from 'vitest';
import { GLOSSARY, annotate, definitionOf } from './glossary';

describe('glossaire', () => {
  it('fige les slugs des abréviations existantes : une URL indexée ne doit jamais bouger', () => {
    expect(GLOSSARY.map((entry) => `${entry.term} -> ${entry.slug}`)).toEqual([
      'crab st -> crab-st',
      'rsc -> rsc',
      'fpdc -> fpdc',
      'bpdc -> bpdc',
      'slst -> slst',
      'rnd -> rnd',
      'rnds -> rnds',
      'puff -> puff',
      'bobble -> bobble',
      'v-st -> v-st',
      'sp -> sp',
      'beg -> beg',
      'rem -> rem',
      'tbl -> tbl',
      'ms -> ms',
      'sc -> sc',
      'dc -> dc',
      'db -> db',
      'hdc -> hdc',
      'tr -> tr',
      'dtr -> dtr',
      'mc -> mc',
      'sl st -> sl-st',
      'ss -> ss',
      'ml -> ml',
      'ch -> ch',
      'aug -> aug',
      'inc -> inc',
      'dim -> dim',
      'dec -> dec',
      'sts -> sts',
      'st -> st',
      'magic ring -> magic-ring',
      'cercle magique -> cercle-magique',
      'mr -> mr',
      'blo -> blo',
      'flo -> flo',
      'yo -> yo',
      'tog -> tog',
      'rep -> rep',
      'sk -> sk',
      'fo -> fo',
      'rs -> rs',
      'ws -> ws',
      'k2tog -> k2tog',
      'ssk -> ssk',
      'm1 -> m1',
      'co -> co',
      'bo -> bo',
    ]);
  });

  it('ne produit jamais deux fois le même slug', () => {
    const slugs = GLOSSARY.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

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
