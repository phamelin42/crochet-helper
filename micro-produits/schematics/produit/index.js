// Schematic « produit » : crée projects/<slug> (application, configuration,
// routes, contenu à rédiger, instrumentation déjà branchée), ses fiches dans
// prompts/<slug>/, et son entrée dans angular.json. Seuls restent à écrire le
// module métier et le contenu éditorial.
//   npm run nouveau-produit -- <slug>
'use strict';

const { SchematicsException } = require('@angular-devkit/schematics');
const { fichiersDuProduit, projetAngular } = require('./generer');

exports.produit = (options) => (tree) => {
  const slug = options.slug;
  const table = JSON.parse(tree.readText('produits.json'));
  const espace = JSON.parse(tree.readText('angular.json'));
  if (espace.projects[slug] || tree.exists(`projects/${slug}/produit.json`)) {
    throw new SchematicsException(`Le produit ${slug} existe déjà.`);
  }
  let fichiers;
  try {
    fichiers = fichiersDuProduit(table, slug);
  } catch (e) {
    throw new SchematicsException(e.message);
  }
  for (const [chemin, contenu] of fichiers) tree.create(chemin, contenu);
  espace.projects[slug] = projetAngular(slug);
  tree.overwrite('angular.json', `${JSON.stringify(espace, null, 2)}\n`);
  return tree;
};
