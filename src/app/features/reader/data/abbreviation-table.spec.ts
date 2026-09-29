import { describe, expect, it } from 'vitest';
import { COMMON_ENGLISH_TERMS, abbreviationTable } from './abbreviation-table';
import { ExpandedSegment, GLOSSARY, expandAbbreviations } from './glossary';

const joined = (segments: readonly ExpandedSegment[]) =>
  segments.map((s) => (s.abbr ? `${s.text} (${s.abbr})` : s.text)).join('');

describe('expandAbbreviations', () => {
  it('développe un rang anglais en français, sigle d’origine conservé', () => {
    const text = joined(
      expandAbbreviations('Row 1: 6 sc in magic ring, inc in each st around', 'fr'),
    );

    expect(text).toContain('6 maille serrée (sc)');
    expect(text).toContain('augmentation (inc)');
  });

  it('développe un rang français en anglais', () => {
    const text = joined(expandAbbreviations('Tour 1 : 6 ms dans un cercle magique, 2 aug', 'en'));

    expect(text).toContain('single crochet (ms)');
    expect(text).toContain('increase (aug)');
  });

  it('rend inchangé un texte sans abréviation', () => {
    const source = 'Bonjour, voici une phrase ordinaire.';

    expect(expandAbbreviations(source, 'fr')).toEqual([{ text: source }]);
  });

  it('ne laisse jamais une abréviation connue sans développement', () => {
    const segments = expandAbbreviations('ch 2, sc in 2nd ch from hook', 'fr');

    expect(segments.filter((s) => s.abbr).map((s) => s.abbr)).toEqual(['ch', 'sc', 'ch']);
  });

  it('marque inconnu un sigle absent du glossaire, sans le traduire', () => {
    const segments = expandAbbreviations('Rnd 2: 6 sc, 3xyz, QQQ', 'fr');

    expect(segments.filter((s) => s.unknown).map((s) => s.text)).toEqual(['xyz', 'QQQ']);
    expect(joined(segments)).toContain('QQQ');
  });

  it('ne marque pas inconnus les mots ordinaires ni les ordinaux', () => {
    const segments = expandAbbreviations('Work in the 2nd round, US terms, then turn.', 'fr');

    expect(segments.some((s) => s.unknown)).toBe(false);
  });

  it('sépare l’abréviation collée à un nombre', () => {
    expect(joined(expandAbbreviations('1sc, Ch3', 'fr'))).toBe(
      "1 maille serrée (sc), maille en l'air (Ch) 3",
    );
  });

  it('ne produit jamais de balisage : le texte collé reste du texte', () => {
    const hostile = '<img src=x onerror=alert(1)> 6 sc <script>alert(2)</script>';
    const segments = expandAbbreviations(hostile, 'fr');

    // Chaque segment est une chaîne brute : c'est `@for` qui l'affiche, échappée.
    expect(joined(segments)).toContain('<img src=x onerror=alert(1)>');
    expect(joined(segments)).toContain('<script>alert(2)</script>');
    expect(segments.every((s) => typeof s.text === 'string')).toBe(true);
  });
});

describe('abbreviationTable', () => {
  it('compte quinze abréviations anglaises, toutes au glossaire', () => {
    expect(COMMON_ENGLISH_TERMS).toHaveLength(15);
    for (const term of COMMON_ENGLISH_TERMS) {
      const entry = GLOSSARY.find((e) => e.term === term);
      expect(entry, `« ${term} » absent du glossaire`).toBeDefined();
      expect(entry?.lang).toBe('en');
    }
    expect(abbreviationTable('fr')).toHaveLength(15);
  });

  it('développe chacune des quinze en français, avec le sens du glossaire', () => {
    for (const row of abbreviationTable('fr')) {
      const segments = expandAbbreviations(`2 ${row.term} in next st`, 'fr');
      const expanded = segments.find((s) => s.abbr?.toLowerCase() === row.term);

      expect(expanded, `« ${row.term} » non développée`).toBeDefined();
      expect(expanded?.text).toBe(row.meaning);
    }
  });

  it('couvre toutes les entrées françaises pour la page anglaise', () => {
    const french = GLOSSARY.filter((e) => e.lang === 'fr');
    const rows = abbreviationTable('en');

    expect(rows.map((r) => r.term)).toEqual(french.map((e) => e.term));
    for (const row of rows) {
      const segments = expandAbbreviations(`2 ${row.term} dans la maille`, 'en');
      expect(segments.some((s) => s.abbr?.toLowerCase() === row.term)).toBe(true);
    }
  });
});
