// Ce qui manque avant la mise en ligne d'un produit (docs/lancement.md).
// Lancé à la main, pas au build : un produit en construction a le droit
// d'être incomplet, pas d'être publié incomplet.
//   npm run lancement -- <app>
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { application } from './apps.mjs';
import { aRediger, lireContenu, motsAccueil } from './contenu.mjs';

const app = application(process.argv[2]);
const produit = JSON.parse(await readFile(join(app.racine, 'produit.json'), 'utf8'));
const manques = [];

for (const [cle, valeur] of Object.entries(produit.editeur)) {
  if (/À COMPLÉTER/.test(valeur)) manques.push(`produit.json → editeur.${cle}`);
}
if (!produit.mesure.siteId) manques.push('produit.json → mesure.siteId (site créé dans Umami)');
if (!produit.mesure.googleVerification) {
  manques.push('produit.json → mesure.googleVerification (propriété Search Console)');
}
const csp = JSON.stringify(JSON.parse(await readFile(join(app.racine, 'vercel.json'), 'utf8')));
if (produit.mesure.origine && !csp.includes(produit.mesure.origine)) {
  manques.push(`vercel.json → CSP sans ${produit.mesure.origine}`);
}
for (const icone of ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png']) {
  try {
    await stat(join(app.racine, 'public', 'icons', icone));
  } catch {
    manques.push(`public/icons/${icone} (npm run icones -- ${app.nom})`);
  }
}

// Contenu éditorial : rédigé en entier, et assez long pour répondre à la requête.
const contenu = await lireContenu(app.racine);
for (const chemin of aRediger(contenu)) manques.push(`contenu.json → ${chemin} à rédiger`);
const mots = motsAccueil(contenu);
if (mots < 300) manques.push(`contenu.json → accueil : ${mots} mots, 300 au moins`);
if (contenu.aide.faq.length < 4) manques.push('contenu.json → aide.faq : 4 questions au moins');

if (manques.length) {
  console.error(`${app.nom} n'est pas prêt pour la mise en ligne :\n- ${manques.join('\n- ')}`);
  process.exit(1);
}
console.log(`${app.nom} est prêt. Reste la liste manuelle de docs/lancement.md.`);
