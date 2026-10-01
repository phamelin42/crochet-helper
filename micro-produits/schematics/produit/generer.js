// Fichiers propres à un produit, calculés depuis sa ligne de produits.json.
// Module pur (aucune écriture) : la règle du schematic (index.js) l'applique
// à l'arbre Angular, les tests (produit.test.mjs) le vérifient directement.
//
// Les textes passent par JSON.stringify ou par un échappement HTML : jamais
// d'interpolation brute dans du code. Le code TypeScript du produit lit
// produit.json et contenu.json ; les fichiers statiques de `fichiers/` ne
// portent que `__SLUG__`, déjà validé.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FICHIERS = path.join(__dirname, 'fichiers');
const PROJET = path.join(__dirname, 'projet.json');
const A_REDIGER = 'À RÉDIGER';
const TYPOS = ['humaniste', 'geometrique', 'serif', 'arrondie'];
const FORMATS = { pdf: 'PDF', ical: 'iCal', csv: 'CSV', impression: 'impression' };

function json(valeur) {
  return `${JSON.stringify(valeur, null, 2)}\n`;
}

function html(texte) {
  return texte
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Refuse une ligne de table incomplète ou dangereuse avant d'écrire quoi que ce soit. */
function valider(p) {
  const erreurs = [];
  if (!/^[a-z][a-z0-9-]*$/.test(p.slug ?? '')) erreurs.push('slug invalide');
  for (const champ of ['nom', 'domaine', 'requete', 'promesse', 'description', 'fonction']) {
    if (typeof p[champ] !== 'string' || !p[champ].trim()) erreurs.push(`${champ} manquant`);
  }
  if (p.description && (p.description.length < 70 || p.description.length > 170)) {
    erreurs.push(`description de ${p.description.length} caractères (70 à 170)`);
  }
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(p.domaine ?? '')) erreurs.push('domaine invalide');
  for (const c of ['accent', 'accentFonce']) {
    if (!/^#[0-9a-f]{6}$/i.test(p.theme?.[c] ?? ''))
      erreurs.push(`theme.${c} : couleur #rrggbb attendue`);
  }
  if (!TYPOS.includes(p.theme?.typographie))
    erreurs.push(`theme.typographie : ${TYPOS.join(', ')}`);
  if (!/^[a-z0-9-]+\.svg$/.test(p.logo ?? '')) erreurs.push('logo : fichier .svg attendu');
  if (erreurs.length) throw new Error(`${p.slug ?? '?'} : ${erreurs.join(' ; ')}`);
}

function ligne(table, slug) {
  const p = table.produits.find((x) => x.slug === slug);
  if (!p) {
    throw new Error(
      `Produit inconnu : ${slug} (connus : ${table.produits.map((x) => x.slug).join(', ')})`,
    );
  }
  valider(p);
  return p;
}

/** Configuration du produit : tout ce que le code lit, rien des notes internes. */
function config(table, p) {
  return {
    slug: p.slug,
    nom: p.nom,
    domaine: p.domaine,
    requete: p.requete,
    description: p.description,
    promesse: p.promesse,
    exports: p.exports,
    logo: p.logo,
    theme: p.theme,
    offre: p.offre,
    editeur: table.editeur,
    mesure: table.mesure,
  };
}

function aRediger(consigne) {
  return `${A_REDIGER} : ${consigne}`;
}

/**
 * Contenu de départ : seuls le titre (la requête visée) et le chapo (la
 * promesse) sont déjà propres au produit ; tout le reste est à rédiger pour
 * lui seul (docs/contenu-unique.md).
 */
function contenu(p) {
  const bloc = (n, consigne) => ({ titre: aRediger(`intertitre ${n}`), texte: aRediger(consigne) });
  const requete = p.requete.charAt(0).toUpperCase() + p.requete.slice(1);
  return {
    accueil: {
      titre: requete,
      chapo: p.promesse,
      explication: [1, 2, 3].map((n) =>
        bloc(n, `étape ${n} de l'utilisation, avec les mots de « ${p.requete} »`),
      ),
      exemples: [1, 2].map((n) => bloc(n + 3, `exemple concret ${n}, chiffré, tiré du métier`)),
    },
    aide: {
      titre: `Aide de ${p.nom}`,
      description: aRediger(
        "description de la page d'aide, 140 à 160 caractères, propre à ce produit",
      ),
      intro: aRediger("à qui s'adresse l'aide et ce qu'on y trouve"),
      sections: [1, 2].map((n) => bloc(n + 5, `question pratique ${n} traitée pas à pas`)),
      faq: [1, 2, 3, 4].map((n) => ({
        question: aRediger(`question fréquente ${n}, telle que les gens la tapent`),
        reponse: aRediger('réponse précise, deux à quatre phrases'),
      })),
    },
    offre: {
      titre: aRediger("nom de l'offre complète"),
      texte: aRediger(
        `ce que la version complète apportera (piste : ${p.offreEnvisagee ?? 'à définir'})`,
      ),
    },
  };
}

function manifeste(p) {
  return {
    id: '/',
    name: p.nom,
    short_name: p.nom.length > 12 ? p.nom.split(' ')[0] : p.nom,
    description: p.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbf8f3',
    theme_color: '#fbf8f3',
    lang: 'fr',
    icons: [
      { src: p.logo, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

function logo(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${p.theme.accentFonce}"/>
  <circle cx="32" cy="32" r="16" fill="${p.theme.accent}"/>
  <circle cx="32" cy="32" r="7" fill="#ffffff"/>
</svg>
`;
}

function indexHtml(p) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${html(p.nom)}</title>
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#fbf8f3" />
    <link rel="icon" type="image/svg+xml" href="/${p.logo}" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <link rel="manifest" href="manifest.webmanifest" />
    <link rel="stylesheet" href="print.css" media="print" />
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
`;
}

function fiche(p) {
  const exports = p.exports.map((f) => FORMATS[f] ?? f).join(', ');
  return `# ${p.nom}

Semaine ${p.semaine} du programme. Contexte commun : \`CLAUDE.md\` à la racine du
workspace. Ce fichier ne contient que ce qui est propre à ce produit.

- **Requête visée** : « ${p.requete} »
- **Domaine** : \`${p.domaine}\` (provisoire tant qu'il n'est pas acheté)
- **Public** : ${p.public}
- **Promesse** : ${p.promesse}
- **Module métier** : ${p.fonction}
- **Exports** : ${exports}
- **Offre envisagée** (pas construite) : ${p.offreEnvisagee}

## Ce qui est propre à ce produit

| Chemin                     | Rôle                                                       |
| -------------------------- | ---------------------------------------------------------- |
| \`produit.json\`             | configuration : nom, domaine, thème, logo, offre, mesure   |
| \`contenu.json\`             | contenu éditorial, rédigé pour ce produit seul             |
| \`src/app/metier/\`          | le module métier                                           |
| \`public/${p.logo}\`         | logo, d'où \`npm run icones -- ${p.slug}\` tire les icônes |

Le reste (coquille, pages légales, mesure, SEO, stockage, PWA) vient de
\`@mp/core\` et \`@mp/ui\` : on ne le duplique pas ici.

## Fiches

- \`prompts/${p.slug}/01-module-metier.md\`
- \`prompts/${p.slug}/02-contenu-editorial.md\`
`;
}

function ficheMetier(p) {
  const exports = p.exports.map((f) => FORMATS[f] ?? f).join(', ');
  return `# ${p.nom} — fiche 01 : le module métier

**Étape servie : activation.** Sans lui, la visite venue de « ${p.requete} »
repart sans rien.

## À livrer

Remplacer \`projects/${p.slug}/src/app/metier/\` par le module métier :
${p.fonction}.

Exports attendus : ${exports}.

## Exigences

- Tout dans le navigateur. Calculs et mises en forme dans
  \`src/app/metier/data/\`, fonctions pures testées sans Angular.
- Le travail en cours est enregistré au fil de la saisie (\`KvStoreService\`
  de \`@mp/core\`) et retrouvé à la visite suivante (\`donnees_reprises\`).
- Événements : \`outil_commence\` à la première saisie, \`outil_termine\` quand
  le résultat est complet, \`export_fait\` avec \`format\` à chaque export.
  Aucune saisie dans les propriétés.
- Formulaire en Signal Forms, étiquettes visibles, erreurs annoncées, cibles
  de 48 px, utilisable à 320 px de large. Aucun style propre : les classes de
  \`libs/ui/styles/base.css\` ; une classe qui manque s'ajoute là.
- Un composant qui servirait à un autre produit va dans \`libs/ui\`, pas ici.
- PDF : impression du navigateur sur une mise en page dédiée
  (\`libs/ui/styles/print.css\`) avant toute bibliothèque ; une bibliothèque se
  charge par \`import()\` et se justifie dans la PR. iCal : RFC 5545 à la main,
  testé.

## Fichiers à lire

\`CLAUDE.md\`, \`projects/${p.slug}/PRODUIT.md\`, \`projects/${p.slug}/src/app/metier/\`,
\`libs/core/src/index.ts\`, \`libs/ui/styles/base.css\`.

## Vérification

Tests des fonctions de \`data/\` (chaque format d'export et chaque variante
énumérée, en boucle), un test e2e saisir → recharger → retrouver → exporter,
\`npm run verify:ci\` vert.
`;
}

function ficheContenu(p) {
  return `# ${p.nom} — fiche 02 : le contenu éditorial

**Étape servie : acquisition.** Le référencement est le seul canal ; dix
sites aux textes génériques seraient traités comme du contenu dupliqué.

## À livrer

Remplacer chaque « ${A_REDIGER} » de \`projects/${p.slug}/contenu.json\` par
un texte écrit pour ce produit seul, pour ${p.public}.

- **Accueil** : au moins 300 mots utiles à « ${p.requete} » — comment ça
  marche en trois étapes, deux exemples concrets et chiffrés du métier.
- **Aide** : description de 140 à 160 caractères, deux sections pas à pas,
  au moins quatre questions fréquentes formulées comme on les tape.
- **Offre** : ce que la version complète apportera, sans promesse de date.
- Aucune phrase reprise d'un autre produit, ni d'un modèle :
  \`tools/check-contenu.mjs\` fait échouer le build sinon.
- Français soigné : espaces insécables avant \`: ; ? !\` et dans « ».
- Exactitude : un point juridique ou fiscal se vérifie à la source officielle
  (service-public.fr, legifrance.gouv.fr), citée dans la PR.

## Vérification

\`npm run lancement -- ${p.slug}\` ne signale plus aucun texte à rédiger ;
\`npm run verify:ci\` vert. Relecture de Phil obligatoire (texte visible).
`;
}

/** Tous les fichiers du produit : chemin relatif au workspace → contenu. */
function fichiersDuProduit(table, slug) {
  const p = ligne(table, slug);
  const racine = `projects/${slug}`;
  const sortie = new Map();
  (function copier(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const chemin = path.join(dir, e.name);
      if (e.isDirectory()) copier(chemin);
      else {
        const rel = path.relative(FICHIERS, chemin).split(path.sep).join('/');
        sortie.set(
          `${racine}/${rel}`,
          fs.readFileSync(chemin, 'utf8').replaceAll('__SLUG__', slug),
        );
      }
    }
  })(FICHIERS);
  sortie.set(`${racine}/produit.json`, json(config(table, p)));
  sortie.set(`${racine}/contenu.json`, json(contenu(p)));
  sortie.set(`${racine}/public/manifest.webmanifest`, json(manifeste(p)));
  sortie.set(`${racine}/public/${p.logo}`, logo(p));
  sortie.set(`${racine}/src/index.html`, indexHtml(p));
  sortie.set(`${racine}/PRODUIT.md`, fiche(p));
  sortie.set(`prompts/${slug}/01-module-metier.md`, ficheMetier(p));
  sortie.set(`prompts/${slug}/02-contenu-editorial.md`, ficheContenu(p));
  return sortie;
}

/** Entrée d'angular.json du produit. */
function projetAngular(slug) {
  return JSON.parse(fs.readFileSync(PROJET, 'utf8').replaceAll('__SLUG__', slug));
}

module.exports = { A_REDIGER, fichiersDuProduit, projetAngular, valider };
