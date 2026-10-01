import assert from 'node:assert/strict';
import { test } from 'node:test';
import { A_REDIGER, aRediger, motsAccueil, phrases, verifier } from './contenu.mjs';

function contenu(textes = {}) {
  return {
    accueil: {
      titre: textes.titre ?? `${A_REDIGER} : titre`,
      chapo: textes.chapo ?? `${A_REDIGER} : chapo`,
      explication: [{ titre: 'Comment faire', texte: textes.explication ?? `${A_REDIGER}` }],
      exemples: [],
    },
    aide: {
      titre: 'Aide',
      description: `${A_REDIGER}`,
      intro: `${A_REDIGER}`,
      sections: [],
      faq: [{ question: textes.question ?? `${A_REDIGER}`, reponse: `${A_REDIGER}` }],
    },
    offre: { titre: `${A_REDIGER}`, texte: `${A_REDIGER}` },
  };
}

const devis =
  'Un devis doit mentionner la date, la durée de validité et le détail de chaque prestation. ' +
  'Le plombier en franchise de TVA indique la mention prévue par le code général des impôts.';
const garde =
  'Le rythme deux-deux-trois alterne les jours de semaine et garde les week-ends entiers. ' +
  'Les vacances scolaires se partagent souvent par moitié, première partie les années paires.';

test('deux produits aux textes propres : aucun problème', () => {
  const p = verifier([
    { nom: 'devis', contenu: contenu({ chapo: devis }) },
    { nom: 'garde', contenu: contenu({ chapo: garde }) },
  ]);
  assert.deepEqual(p, []);
});

test('une phrase recopiée d’un produit à l’autre est signalée, accents et casse ignorés', () => {
  const copie = 'Votre travail est enregistré sur cet appareil, rien ne part vers un serveur.';
  const p = verifier([
    { nom: 'devis', contenu: contenu({ chapo: `${devis} ${copie}` }) },
    { nom: 'garde', contenu: contenu({ explication: `${garde}\n\n${copie.toUpperCase()}` }) },
  ]);
  assert.equal(p.length >= 1, true);
  assert.match(p[0], /devis \(accueil\.chapo\) et garde \(accueil\.explication\.0\.texte\)/);
});

test('les textes à rédiger, communs à tous, ne comptent pas comme des doublons', () => {
  assert.deepEqual(
    verifier([
      { nom: 'a', contenu: contenu() },
      { nom: 'b', contenu: contenu() },
    ]),
    [],
  );
});

test('un texte réécrit à la marge reste trop similaire', () => {
  const variante = devis.replace('Un devis', 'Tout devis').replace('Le plombier', "L'artisan");
  const p = verifier([
    { nom: 'a', contenu: contenu({ chapo: devis }) },
    { nom: 'b', contenu: contenu({ chapo: variante }) },
  ]);
  assert.ok(p.some((x) => /similaires/.test(x)));
});

test('les phrases courtes (titres, libellés) ne sont pas comparées', () => {
  assert.deepEqual(phrases('Comment faire ? Questions fréquentes.'), []);
});

test('chemins à rédiger et mots de l’accueil', () => {
  const c = contenu({ titre: 'Modèle de devis', chapo: devis });
  assert.ok(aRediger(c).includes('accueil.explication.0.texte'));
  assert.ok(!aRediger(c).includes('accueil.titre'));
  // Titre (3) + chapo (32) + titre de bloc (2) ; le texte à rédiger ne compte pas.
  assert.equal(motsAccueil(c), 37);
});
