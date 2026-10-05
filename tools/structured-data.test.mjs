// Lancé par `npm run test:tools`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { structuredDataProblems, visibleText } from './structured-data.mjs';

const page = (jsonLd, body) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body>${body}</body></html>`;
const PAGES = new Set(['https://x.com/', 'https://x.com/glossary']);

test('visibleText : sans balises ni scripts, entités décodées, espaces normalisées', () => {
  assert.equal(
    visibleText('<body><p>Que veut dire&nbsp;?</p><script>x()</script><p>l&#x2019;air</p></body>'),
    'Que veut dire ? l’air',
  );
});

test('FAQPage : une question absente de la page est signalée', () => {
  const faq = {
    '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Question', name: 'Q ?', acceptedAnswer: { text: 'Réponse.' } }],
  };
  assert.deepEqual(structuredDataProblems(page(faq, '<h3>Q ?</h3><p>Réponse.</p>'), PAGES), []);
  assert.equal(structuredDataProblems(page(faq, '<p>Réponse.</p>'), PAGES).length, 1);
});

test('Article : dates ISO exigées', () => {
  const article = { '@type': 'Article', datePublished: '2026-09-22' };
  assert.deepEqual(structuredDataProblems(page(article, ''), PAGES), [
    'Article : dateModified absent ou non ISO',
  ]);
});

test('BreadcrumbList : niveaux visibles, URL du sitemap sauf la page elle-même', () => {
  const crumbs = (second) => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://x.com/' },
          { '@type': 'ListItem', position: 2, name: 'Glossary', item: second },
          { '@type': 'ListItem', position: 3, name: 'sc', item: 'https://x.com/glossary/sc' },
        ],
      },
    ],
  });
  const body = '<nav>Home › Glossary › sc</nav>';
  assert.deepEqual(structuredDataProblems(page(crumbs('https://x.com/glossary'), body), PAGES), []);
  assert.deepEqual(structuredDataProblems(page(crumbs('https://x.com/ailleurs'), body), PAGES), [
    'BreadcrumbList : https://x.com/ailleurs hors sitemap',
  ]);
});

test('JSON-LD illisible', () => {
  const html = '<script type="application/ld+json">{oops</script><body></body>';
  assert.deepEqual(structuredDataProblems(html, PAGES), ['JSON-LD illisible']);
});
