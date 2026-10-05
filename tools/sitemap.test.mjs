// Lancé par `npm run test:tools`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffLocs, linkProblems, linksOf, locsOf } from './sitemap.mjs';

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

test('diffLocs : liste les URL en trop et en moins', () => {
  const published = locsOf(
    '<urlset><url><loc>https://x.com/</loc></url><url><loc>https://x.com/en</loc></url></urlset>',
  );
  assert.deepEqual(published, ['https://x.com/', 'https://x.com/en']);
  assert.deepEqual(diffLocs(published, ['https://x.com/', 'https://x.com/fr']), {
    onlyPublished: ['https://x.com/en'],
    onlyGenerated: ['https://x.com/fr'],
  });
});
