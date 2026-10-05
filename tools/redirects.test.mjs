// Lancé par `npm run test:tools`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyRules, netlifyRules, redirectProblems, vercelRules } from './redirects.mjs';

const VERCEL = {
  redirects: [
    { source: '/(.*)', has: [{ type: 'host', value: 'old.example' }], destination: 'x' },
    { source: '/en/reader', destination: '/', statusCode: 301 },
    { source: '/en', destination: '/', statusCode: 301 },
    { source: '/en/:path*', destination: '/:path*', statusCode: 301 },
    { source: '/old', destination: '/en/reader', permanent: true },
  ],
};
const RULES = vercelRules(VERCEL);
const PAGES = new Set(['/', '/glossary', '/glossary/sc']);
const isPage = (path) => PAGES.has(path);

test('vercelRules : écarte la règle d’hôte, note les jokers comme Netlify', () => {
  assert.deepEqual(RULES.slice(0, 3), [
    { from: '/en/reader', to: '/', status: 301 },
    { from: '/en', to: '/', status: 301 },
    { from: '/en/*', to: '/:splat', status: 301 },
  ]);
  assert.equal(RULES[3].status, 308, 'permanent: true vaut 308 sur Vercel');
});

test('netlifyRules : écarte l’ancien domaine et le repli en 200', () => {
  const toml = `[[redirects]]
  from = "https://old.example/*"
  to = "https://new.example/:splat"
  status = 301

[[redirects]]
  from = "/en/*"
  to = "/:splat"
  status = 301

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
  assert.deepEqual(netlifyRules(toml), [{ from: '/en/*', to: '/:splat', status: 301 }]);
});

test('applyRules : la première règle qui correspond gagne', () => {
  assert.equal(applyRules(RULES, '/en/reader').to, '/');
  assert.equal(applyRules(RULES, '/en/glossary/sc').to, '/glossary/sc');
  assert.equal(applyRules(RULES, '/glossary'), null);
});

test('redirectProblems : 301 en une étape vers une page', () => {
  assert.deepEqual(redirectProblems(RULES, '/en/glossary', isPage), {
    to: '/glossary',
    problems: [],
  });
  assert.equal(redirectProblems(RULES, '/glossary', isPage), null);
});

test('redirectProblems : signale statut, chaîne et destination absente', () => {
  assert.deepEqual(redirectProblems(RULES, '/old', isPage).problems, [
    'statut 308 au lieu de 301',
    'chaîne : /en/reader redirige à son tour',
  ]);
  assert.deepEqual(redirectProblems(RULES, '/en/nulle-part', isPage).problems, [
    "/nulle-part n'est pas une page pré-rendue",
  ]);
});
