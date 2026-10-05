// Lancé par `npm run test:tools`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clickDepths, linksFrom, seoOf, seoProblems } from './seo.mjs';

const LOC = 'https://x.com/glossary';
const FR = 'https://x.com/fr/glossaire';
const words = Array.from({ length: 120 }, (_, i) => `mot${i}`).join(' ');
const html = ({
  title = 'Crochet and knitting abbreviations — Pattern Reader',
  h1 = '<h1>A</h1>',
} = {}) => `
<html><head><title>${title}</title>
<meta name="description" content="${'d'.repeat(150)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${LOC}">
<link rel="alternate" hreflang="en" href="${LOC}">
<link rel="alternate" hreflang="fr" href="${FR}">
<link rel="alternate" hreflang="x-default" href="${LOC}">
</head><body><main>${h1}<p>${words}</p></main></body></html>`;

const back = (url) => (url === FR ? [{ hreflang: 'en', href: LOC }] : undefined);

test('page conforme : aucun écart', () => {
  assert.deepEqual(seoProblems(LOC, seoOf(html()), back), []);
});

test('deux h1, titre trop long, hreflang sans retour', () => {
  const seo = seoOf(html({ title: 't'.repeat(61), h1: '<h1>A</h1><h1>B</h1>' }));
  assert.deepEqual(
    seoProblems(LOC, seo, () => [{ hreflang: 'en', href: 'https://x.com/autre' }]),
    [
      "2 h1 au lieu d'un",
      'titre de 61 caractères (> 60)',
      `hreflang fr → ${FR} ne renvoie pas ici`,
    ],
  );
});

test('contenu principal absent du HTML servi', () => {
  const seo = seoOf(html().replace(words, ''));
  assert.match(seoProblems(LOC, seo, back).at(-1), /mots dans <main>/);
});

test('linksFrom et clickDepths : profondeur en clics, pages orphelines absentes', () => {
  assert.deepEqual(
    linksFrom(
      '<a href="/glossary/">x</a><a class="a" href="/fr#top">y</a><a href="https://e.com">z</a>',
    ),
    ['/glossary', '/fr'],
  );
  const site = {
    '/': ['/glossary'],
    '/glossary': ['/glossary/sc', '/'],
    '/glossary/sc': [],
    '/orpheline': ['/'],
  };
  const depths = clickDepths('/', (path) => site[path] ?? null);
  assert.equal(depths.get('/glossary/sc'), 2);
  assert.equal(depths.has('/orpheline'), false);
});
