// Le schematic sur les dix produits de la table, dans un arbre en mémoire :
// chaque produit se crée, complet, sans marqueur restant, avec des couleurs
// lisibles et un contenu de départ qui ne duplique aucun autre produit.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing/index.js';
import { verifier } from '../../tools/contenu.mjs';

const require = createRequire(import.meta.url);
const { fichiersDuProduit } = require('./generer.js');
const COLLECTION = new URL('../collection.json', import.meta.url).pathname;
const table = JSON.parse(await readFile('produits.json', 'utf8'));
// Workspace sans aucun produit : bibliothèques et vitrine seulement.
const reel = JSON.parse(await readFile('angular.json', 'utf8'));
const espace = JSON.stringify({
  ...reel,
  projects: Object.fromEntries(
    Object.entries(reel.projects).filter(([nom]) => !table.produits.some((p) => p.slug === nom)),
  ),
});

async function arbre() {
  const tree = new HostTree();
  tree.create('produits.json', JSON.stringify(table));
  tree.create('angular.json', espace);
  return tree;
}

/** Contraste WCAG entre deux couleurs #rrggbb. */
function contraste(a, b) {
  const lum = (hex) => {
    const [r, g, v] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * v;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const runner = new SchematicTestRunner('micro-produits', COLLECTION);

test('dix produits, semaines 1 à 10, slugs et domaines uniques', () => {
  assert.deepEqual(
    table.produits.map((p) => p.semaine),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(new Set(table.produits.map((p) => p.slug)).size, 10);
  assert.equal(new Set(table.produits.map((p) => p.domaine)).size, 10);
});

for (const p of table.produits) {
  test(`${p.slug} : couleurs lisibles`, () => {
    // Texte blanc sur le bouton principal, liens sur le fond et sur une carte.
    for (const fond of ['#ffffff', '#fbf8f3']) {
      assert.ok(contraste(p.theme.accentFonce, fond) >= 4.5, `accentFonce sur ${fond}`);
    }
    // Thème sombre proposé : l'accent devient la couleur des liens (tokens.css).
    if (p.theme.sombre) {
      for (const fond of ['#1f1b24', '#2a2530']) {
        assert.ok(contraste(p.theme.accent, fond) >= 4.5, `accent sur ${fond}`);
      }
    }
  });

  test(`${p.slug} : le schematic crée l'application complète`, async () => {
    const tree = await runner.runSchematic('produit', { slug: p.slug }, await arbre());
    const attendus = fichiersDuProduit(table, p.slug);
    for (const chemin of attendus.keys()) assert.ok(tree.exists(chemin), chemin);
    for (const chemin of tree.files.filter((f) => f.startsWith(`/projects/${p.slug}/`))) {
      const texte = tree.readText(chemin);
      assert.doesNotMatch(texte, /__SLUG__/, chemin);
      if (/\.(json|webmanifest)$/.test(chemin))
        assert.doesNotThrow(() => JSON.parse(texte), chemin);
    }
    const projet = JSON.parse(tree.readText('angular.json')).projects[p.slug];
    assert.equal(projet.architect.build.options.outputPath, `dist/${p.slug}`);
    const config = JSON.parse(tree.readText(`projects/${p.slug}/produit.json`));
    assert.deepEqual(config.theme, p.theme);
    assert.equal(config.description, p.description);
    assert.equal('public' in config, false, 'les notes internes ne vont pas dans la configuration');
    const contenu = JSON.parse(tree.readText(`projects/${p.slug}/contenu.json`));
    assert.match(contenu.accueil.titre, new RegExp(p.requete.slice(1)));
    assert.match(tree.readText(`projects/${p.slug}/src/index.html`), /<title>[^<]+<\/title>/);
  });
}

test('un produit déjà créé n’est pas écrasé', async () => {
  const tree = await runner.runSchematic('produit', { slug: 'devis-artisan' }, await arbre());
  await assert.rejects(
    runner.runSchematic('produit', { slug: 'devis-artisan' }, tree),
    /existe déjà/,
  );
});

test('un produit inconnu ou une ligne invalide est refusé proprement', async () => {
  await assert.rejects(
    runner.runSchematic('produit', { slug: 'inconnu' }, await arbre()),
    /inconnu/,
  );
  const casse = structuredClone(table);
  casse.produits[0].theme.accent = 'red';
  casse.produits[0].description = 'trop courte';
  assert.throws(
    () => fichiersDuProduit(casse, casse.produits[0].slug),
    /accent.*description|description.*accent/,
  );
});

test('le contenu de départ des dix produits ne partage aucune phrase', () => {
  const produits = table.produits.map((p) => ({
    nom: p.slug,
    contenu: JSON.parse(fichiersDuProduit(table, p.slug).get(`projects/${p.slug}/contenu.json`)),
  }));
  assert.deepEqual(verifier(produits), []);
});

test('les textes du produit sont échappés (titre HTML, JSON)', () => {
  const t = structuredClone(table);
  t.produits[0].nom = 'L\'outil "<pro>" & co';
  const f = fichiersDuProduit(t, t.produits[0].slug);
  assert.match(
    f.get(`projects/${t.produits[0].slug}/src/index.html`),
    /L'outil &quot;&lt;pro&gt;&quot; &amp; co/,
  );
  assert.equal(
    JSON.parse(f.get(`projects/${t.produits[0].slug}/public/manifest.webmanifest`)).name,
    t.produits[0].nom,
  );
});
