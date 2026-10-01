import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import * as prettier from 'prettier';
import { SOCLE, TABLE, genererProduit, substituer, valeursDe } from './nouveau-produit.mjs';

const table = JSON.parse(await readFile(TABLE, 'utf8'));

async function* fichiers(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const chemin = join(dir, e.name);
    if (e.isDirectory()) yield* fichiers(chemin);
    else yield chemin;
  }
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

test('dix produits, semaines 1 à 10, slugs et domaines uniques', () => {
  assert.equal(table.produits.length, 10);
  assert.deepEqual(
    table.produits.map((p) => p.semaine),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(new Set(table.produits.map((p) => p.slug)).size, 10);
  assert.equal(new Set(table.produits.map((p) => p.domaine)).size, 10);
});

for (const produit of table.produits) {
  test(`${produit.slug} : couleurs lisibles (texte blanc sur le bouton, liens sur le fond)`, () => {
    assert.ok(contraste(produit.accentFonce, '#ffffff') >= 4.5, 'bouton principal');
    assert.ok(contraste(produit.accentFonce, '#fbf8f3') >= 4.5, 'liens sur le fond');
  });

  test(`${produit.slug} : description entre 70 et 170 caractères`, () => {
    assert.ok(
      produit.description.length >= 70 && produit.description.length <= 170,
      produit.description.length,
    );
  });

  test(`${produit.slug} : dépôt généré sans marqueur restant, JSON valides`, async () => {
    const cible = await mkdtemp(join(tmpdir(), `${produit.slug}-`));
    await rm(cible, { recursive: true });
    try {
      const fiche = await genererProduit({ slug: produit.slug, cible, table });
      for await (const f of fichiers(cible)) {
        const rel = relative(cible, f);
        if (f.endsWith('.png')) continue;
        const texte = await readFile(f, 'utf8');
        assert.doesNotMatch(texte, /@@/, rel);
        if (/\.(json|webmanifest)$/.test(f)) assert.doesNotThrow(() => JSON.parse(texte), rel);
        // Le nouveau dépôt passe `format:check` dès son premier commit.
        const info = await prettier.getFileInfo(f, { ignorePath: [] });
        if (info.inferredParser && !rel.startsWith('.prettierignore')) {
          const options = { ...(await prettier.resolveConfig(f)), filepath: f };
          assert.ok(await prettier.check(texte, options), `${rel} : non formaté`);
        }
      }
      const ecrit = JSON.parse(await readFile(join(cible, 'produit.json'), 'utf8'));
      assert.deepEqual(ecrit, fiche);
      assert.equal(ecrit.editeur.nom, table.editeur.nom);
      const manifeste = JSON.parse(
        await readFile(join(cible, 'public/manifest.webmanifest'), 'utf8'),
      );
      assert.equal(manifeste.name, produit.nom);
      assert.match(await readFile(join(cible, 'CLAUDE.md'), 'utf8'), new RegExp(produit.requete));
    } finally {
      await rm(cible, { recursive: true, force: true });
    }
  });
}

test('un dossier cible non vide est refusé', async () => {
  await assert.rejects(
    genererProduit({ slug: table.produits[0].slug, cible: SOCLE, table }),
    /n'est pas vide/,
  );
});

test('échappement selon le type de fichier', () => {
  const v = { '@@NOM@@': `L'outil "pro" <b>` };
  assert.equal(substituer('{"n":"@@NOM@@"}', v, 'a.json'), String.raw`{"n":"L'outil \"pro\" <b>"}`);
  assert.equal(
    substituer('<t>@@NOM@@</t>', v, 'a.html'),
    "<t>L'outil &quot;pro&quot; &lt;b&gt;</t>",
  );
  assert.equal(substituer('# @@NOM@@', v, 'a.md'), `# L'outil "pro" <b>`);
  assert.throws(() => substituer("const n = '@@NOM@@';", v, 'a.ts'), /marqueur dans du code/);
  assert.throws(() => substituer('@@INCONNU@@', v, 'a.md'), /marqueur inconnu/);
  const css = substituer('a {\n  --c: #000; /* @@NOM@@ */\n}', { '@@NOM@@': '#123456' }, 'a.css');
  assert.equal(css, 'a {\n  --c: #123456;\n}');
});

test('chaque marqueur du socle a une valeur', async () => {
  const connus = Object.keys(valeursDe(table.produits[0]));
  for await (const f of fichiers(SOCLE)) {
    if (f.endsWith('.png')) continue;
    const texte = await readFile(f, 'utf8');
    // Un `@@` hors marqueur complet = marqueur abîmé (par Prettier, par exemple).
    assert.equal(
      (texte.match(/@@/g) ?? []).length,
      2 * (texte.match(/@@[A-Z_]+@@/g) ?? []).length,
      relative(SOCLE, f),
    );
    for (const m of texte.match(/@@[A-Z_]+@@/g) ?? []) {
      assert.ok(connus.includes(m), `${relative(SOCLE, f)} : ${m}`);
    }
  }
});
