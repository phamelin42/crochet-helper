// Lancé par `npm run test:tools`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  familiesFrom,
  isShallowRepository,
  lastmodFor,
  linkProblems,
  linksOf,
  sourcesFor,
} from './sitemap.mjs';

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

const HEAD = `<html><head><title>T</title>
<link rel="canonical" href="https://patternreader.com/">
<link rel="alternate" hreflang="en" href="https://patternreader.com/">
<link rel="alternate" hreflang="fr" href="https://patternreader.com/fr">
<link rel="alternate" hreflang="x-default" href="https://patternreader.com/">
</head><body><link rel="alternate" hreflang="de" href="/hors-head"></body></html>`;

test('linksOf : lit la canonique et les hreflang du seul <head>', () => {
  const links = linksOf(HEAD);
  assert.equal(links.canonical, 'https://patternreader.com/');
  assert.deepEqual(
    links.alternates.map((a) => a.hreflang),
    ['en', 'fr', 'x-default'],
  );
});

test('linkProblems : une page cohérente ne signale rien', () => {
  assert.deepEqual(linkProblems('https://patternreader.com/', 'en', linksOf(HEAD)), []);
});

test('linkProblems : la racine sans barre dans la page diffère du <loc> avec barre', () => {
  const html = HEAD.replaceAll(
    'href="https://patternreader.com/"',
    'href="https://patternreader.com"',
  );
  const problems = linkProblems('https://patternreader.com/', 'en', linksOf(html));
  assert.equal(problems.length, 2);
  assert.match(problems[0], /canonique/);
  assert.match(problems[1], /hreflang en/);
});

test('linkProblems : x-default absent', () => {
  const html = HEAD.replace(/<link rel="alternate" hreflang="x-default"[^>]*>/, '');
  assert.deepEqual(linkProblems('https://patternreader.com/', 'en', linksOf(html)), [
    'x-default absent',
  ]);
});
