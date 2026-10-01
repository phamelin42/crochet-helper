// Ce qui manque avant la mise en ligne (docs/lancement.md). Lancé à la main
// (`npm run lancement`), pas au build : un produit en construction a le droit
// d'être incomplet, pas d'être publié incomplet.
import { readFile, stat } from 'node:fs/promises';

const produit = JSON.parse(await readFile('produit.json', 'utf8'));
const manques = [];

for (const [cle, valeur] of Object.entries(produit.editeur)) {
  if (/À COMPLÉTER/.test(valeur)) manques.push(`produit.json → editeur.${cle}`);
}
if (!produit.mesure.siteId) manques.push('produit.json → mesure.siteId (site créé dans Umami)');
if (!produit.mesure.googleVerification) {
  manques.push('produit.json → mesure.googleVerification (propriété Search Console)');
}
const csp = JSON.stringify(JSON.parse(await readFile('vercel.json', 'utf8')));
if (produit.mesure.origine && !csp.includes(produit.mesure.origine)) {
  manques.push(`vercel.json → CSP sans ${produit.mesure.origine}`);
}
for (const icone of ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png']) {
  try {
    await stat(`public/icons/${icone}`);
  } catch {
    manques.push(`public/icons/${icone} (npm run icones)`);
  }
}

if (manques.length) {
  console.error(`Pas prêt pour la mise en ligne :\n- ${manques.join('\n- ')}`);
  process.exit(1);
}
console.log('Prêt pour la mise en ligne. Reste la liste manuelle de docs/lancement.md.');
