// Lancé par `npm run test:tools`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { familiesFrom, isShallowRepository, lastmodFor, pairFor, sourcesFor } from './sitemap.mjs';

const ROUTE_PATHS = {
  reader: { fr: '/', en: '/' },
  glossary: { fr: '/glossaire', en: '/glossary' },
  format: { fr: '/bien-formater-son-patron', en: '/format-your-pattern' },
};
const FAMILIES = familiesFrom(ROUTE_PATHS);
const SOURCE_PATHS = {
  reader: ['src/app/features/reader'],
  glossary: ['src/app/features/glossary/glossary-page.ts'],
  format: ['src/app/features/format'],
};
const GLOSSARY_TERM_SOURCES = ['src/app/features/reader/data/glossary.ts'];

test('pairFor : une sous-page hérite du suffixe de sa famille', () => {
  assert.deepEqual(pairFor(FAMILIES, '/glossary/sc'), ['/glossary/sc', '/fr/glossaire/sc']);
  assert.deepEqual(pairFor(FAMILIES, '/fr/glossaire/sc'), ['/glossary/sc', '/fr/glossaire/sc']);
  assert.deepEqual(pairFor(FAMILIES, '/'), ['/', '/fr']);
  assert.equal(pairFor(FAMILIES, '/design-system'), null);
});

test('sourcesFor : une page-abréviation vient du moteur partagé, pas de la page de liste', () => {
  assert.deepEqual(
    sourcesFor(FAMILIES, SOURCE_PATHS, GLOSSARY_TERM_SOURCES, '/glossary/sc'),
    GLOSSARY_TERM_SOURCES,
  );
  assert.deepEqual(sourcesFor(FAMILIES, SOURCE_PATHS, GLOSSARY_TERM_SOURCES, '/glossary'), [
    'src/app/features/glossary/glossary-page.ts',
  ]);
});

test('sourcesFor : une route hors de route-paths.json (page d’équipe) n’a pas de source', () => {
  assert.equal(sourcesFor(FAMILIES, SOURCE_PATHS, GLOSSARY_TERM_SOURCES, '/design-system'), null);
});

test('isShallowRepository : lit la sortie de git', () => {
  assert.equal(
    isShallowRepository(() => 'true\n'),
    true,
  );
  assert.equal(
    isShallowRepository(() => 'false\n'),
    false,
  );
});

test('isShallowRepository : git absent ou en échec compte comme superficiel', () => {
  assert.equal(
    isShallowRepository(() => {
      throw new Error('git introuvable');
    }),
    true,
  );
});

test('lastmodFor : renvoie la date du dernier commit sur un historique complet', () => {
  assert.equal(
    lastmodFor(['src/app/features/reader'], () => '2026-09-12\n'),
    '2026-09-12',
  );
});

test('lastmodFor : jamais une date par défaut — null si git échoue, l’historique est superficiel, ou la route n’a pas de source', () => {
  assert.equal(
    lastmodFor(['src/app/features/reader'], () => {
      throw new Error('dépôt superficiel');
    }),
    null,
  );
  assert.equal(
    lastmodFor(null, () => '2026-09-12\n'),
    null,
  );
});
