import { describe, expect, it } from 'vitest';
import { CRAFTS, reduireFiche, reduireListe, texteBrut, urlFiche, urlRecherche } from './ravelry';

// Réponses d'exemple écrites pour ces tests : aucune donnée réelle de Ravelry.
const LISTE = {
  patterns: [
    {
      id: 101,
      name: 'Petit sapin au crochet',
      permalink: 'petit-sapin',
      free: true,
      pattern_author: { name: 'Camille Exemple' },
      first_photo: { small_url: 'https://images4-g.ravelrycache.com/uploads/a/small.jpg' },
    },
    {
      id: 102,
      name: 'Sapin payant',
      permalink: 'sapin-payant',
      free: false,
      pattern_author: { name: 'Autre' },
      first_photo: { small_url: 'https://images4-g.ravelrycache.com/uploads/b/small.jpg' },
    },
    {
      id: 103,
      name: 'Sapin sans photo',
      permalink: 'sapin-sans-photo',
      free: true,
      pattern_author: { name: 'Sans Image' },
    },
  ],
  paginator: { page: 1, page_count: 4, page_size: 20, results: 80, last_page: 4 },
};

const FICHE = {
  pattern: {
    id: 101,
    name: 'Petit sapin au crochet',
    permalink: 'petit-sapin',
    free: true,
    pattern_author: { name: 'Camille Exemple' },
    notes_html:
      '<p>Un sapin &amp; ses <b>boules</b>.</p><script>alert(1)</script><p>Rang 1 :<br>6 ms</p>',
    photos: [
      { medium_url: 'https://images4-g.ravelrycache.com/uploads/a/medium.jpg' },
      { medium_url: 'http://images4-g.ravelrycache.com/uploads/a/http.jpg' },
      { medium_url: 'https://evil.example/pixel.jpg' },
      { medium_url: 'javascript:alert(1)' },
    ],
    craft: { name: 'Crochet' },
    yarn_weight: { name: 'DK' },
    difficulty_average: 2.46,
    download_location: { url: 'https://cdn.example.net/sapin.pdf' },
    url: 'https://camille.example.org/sapin',
  },
};

describe('urlRecherche', () => {
  it('construit la requête amont depuis la demande validée, patrons gratuits avec photo', () => {
    const u = new URL(urlRecherche({ q: 'christmas tree', craft: 'crochet', page: 3 }));
    expect(u.origin + u.pathname).toBe('https://api.ravelry.com/patterns/search.json');
    expect(u.searchParams.get('query')).toBe('christmas tree');
    expect(u.searchParams.get('craft')).toBe('crochet');
    expect(u.searchParams.get('page')).toBe('3');
    expect(u.searchParams.get('availability')).toBe('free');
    expect(u.searchParams.get('photo')).toBe('yes');
    expect(Number(u.searchParams.get('page_size'))).toBeLessThanOrEqual(24);
  });

  it('encode un terme qui voudrait ajouter un paramètre', () => {
    const u = new URL(urlRecherche({ q: 'a&availability=paid#x', craft: 'knitting', page: 1 }));
    expect(u.searchParams.get('query')).toBe('a&availability=paid#x');
    expect(u.searchParams.get('availability')).toBe('free');
  });

  it('liste blanche des métiers', () => {
    expect(CRAFTS).toEqual(['crochet', 'knitting']);
  });
});

describe('urlFiche', () => {
  it('vise le patron par son identifiant', () => {
    expect(urlFiche(101)).toBe('https://api.ravelry.com/patterns/101.json');
  });
});

describe('reduireListe', () => {
  it('ne garde que les patrons gratuits, avec nos seuls champs', () => {
    const r = reduireListe(LISTE);
    expect(r).toEqual({
      patrons: [
        {
          id: 101,
          nom: 'Petit sapin au crochet',
          designer: 'Camille Exemple',
          vignette: 'https://images4-g.ravelrycache.com/uploads/a/small.jpg',
          lien: 'https://www.ravelry.com/patterns/library/petit-sapin',
        },
        {
          id: 103,
          nom: 'Sapin sans photo',
          designer: 'Sans Image',
          vignette: null,
          lien: 'https://www.ravelry.com/patterns/library/sapin-sans-photo',
        },
      ],
      page: 1,
      pages: 4,
    });
  });

  it.each([null, 'texte', 42, {}, { patterns: 'x' }, { patterns: [], paginator: 3 }])(
    'refuse une forme inattendue : %j',
    (entree) => {
      expect(reduireListe(entree)).toBeNull();
    },
  );

  it('ignore les éléments mal formés au lieu de lever', () => {
    const r = reduireListe({
      patterns: [null, 5, { id: 'x', name: 'a', free: true }, { id: 7, free: true }],
      paginator: { page: 1, page_count: 1 },
    });
    expect(r?.patrons).toEqual([]);
  });

  it('borne la longueur des textes et le nombre de cartes', () => {
    const beaucoup = Array.from({ length: 80 }, (_, i) => ({
      id: i + 1,
      name: 'n'.repeat(500),
      permalink: `p-${i}`,
      free: true,
      pattern_author: { name: 'd'.repeat(500) },
    }));
    const r = reduireListe({ patterns: beaucoup, paginator: { page: 1, page_count: 1 } });
    expect(r?.patrons.length).toBeLessThanOrEqual(40);
    expect(r?.patrons[0].nom.length).toBeLessThanOrEqual(200);
    expect(r?.patrons[0].designer.length).toBeLessThanOrEqual(100);
  });
});

describe('texteBrut', () => {
  it.each([
    ['<p>Un &amp; deux</p>', 'Un & deux'],
    ['a<br>b<br/>c', 'a\nb\nc'],
    ['<p>x</p><p>y</p>', 'x\n\ny'],
    ['<script>alert(1)</script>ok', 'ok'],
    ['<style>p{}</style>ok', 'ok'],
    ['1 &lt; 2 &gt; 0', '1 < 2 > 0'],
    ['&quot;a&quot; &#39;b&#39;&nbsp;c', '"a" \'b\' c'],
    ['<img src=x onerror=alert(1)>texte', 'texte'],
  ])('%j devient du texte sans balise', (html, attendu) => {
    expect(texteBrut(html)).toBe(attendu);
  });

  it('un balisage échappé reste du texte : décoder ne ré-interprète rien', () => {
    expect(texteBrut('&lt;b&gt;gras&lt;/b&gt;')).toBe('<b>gras</b>');
  });
});

describe('reduireFiche', () => {
  it('réduit aux champs utiles, description en texte brut, liens et photos filtrés', () => {
    const f = reduireFiche(FICHE);
    expect(f).not.toBeNull();
    expect(f?.description).toBe('Un sapin & ses boules.\n\nRang 1 :\n6 ms');
    expect(f?.photos).toEqual(['https://images4-g.ravelrycache.com/uploads/a/medium.jpg']);
    expect(f).toMatchObject({
      id: 101,
      nom: 'Petit sapin au crochet',
      designer: 'Camille Exemple',
      craft: 'Crochet',
      poidsFil: 'DK',
      difficulte: 2.5,
      telechargement: 'https://cdn.example.net/sapin.pdf',
      source: 'https://camille.example.org/sapin',
      lien: 'https://www.ravelry.com/patterns/library/petit-sapin',
    });
    expect(Object.keys(f ?? {}).sort()).toEqual(
      [
        'craft',
        'description',
        'designer',
        'difficulte',
        'id',
        'lien',
        'nom',
        'photos',
        'poidsFil',
        'source',
        'telechargement',
      ].sort(),
    );
  });

  it('préfère le texte brut de `notes` à `notes_html` mais en retire les balises', () => {
    const f = reduireFiche({ pattern: { ...FICHE.pattern, notes: 'Simple <i>texte</i>' } });
    expect(f?.description).toBe('Simple texte');
  });

  it('refuse un patron payant', () => {
    expect(reduireFiche({ pattern: { ...FICHE.pattern, free: false } })).toBeNull();
  });

  it.each([null, 'x', {}, { pattern: null }, { pattern: { id: 'a' } }])(
    'refuse une forme inattendue : %j',
    (entree) => {
      expect(reduireFiche(entree)).toBeNull();
    },
  );

  it('borne photos (12), description et liens non https', () => {
    const photos = Array.from({ length: 30 }, (_, i) => ({
      medium_url: `https://images4-g.ravelrycache.com/uploads/${i}/m.jpg`,
    }));
    const f = reduireFiche({
      pattern: {
        ...FICHE.pattern,
        photos,
        notes: 'x'.repeat(50_000),
        download_location: { url: 'http://pas-https.example/x.pdf' },
        url: 'javascript:alert(1)',
      },
    });
    expect(f?.photos).toHaveLength(12);
    expect(f?.description.length).toBeLessThanOrEqual(8000);
    expect(f?.telechargement).toBeNull();
    expect(f?.source).toBeNull();
  });

  it('accepte des champs absents', () => {
    const f = reduireFiche({
      pattern: { id: 5, name: 'Nu', permalink: 'nu', free: true },
    });
    expect(f).toMatchObject({
      designer: '',
      description: '',
      photos: [],
      craft: null,
      poidsFil: null,
      difficulte: null,
      telechargement: null,
      source: null,
    });
  });
});
