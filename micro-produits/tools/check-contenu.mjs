// Contenu éditorial unique par produit : le build échoue si deux produits
// partagent une phrase ou se ressemblent trop (docs/contenu-unique.md). Dix
// sites aux textes quasi identiques sont traités par Google comme du contenu
// dupliqué, et l'acquisition repose entièrement sur le référencement.
import { produits } from './apps.mjs';
import { aRediger, lireContenu, verifier } from './contenu.mjs';

const liste = [];
for (const app of produits()) {
  const contenu = await lireContenu(app.racine);
  liste.push({ nom: app.nom, contenu });
  const restants = aRediger(contenu).length;
  if (restants)
    console.log(`${app.nom} — contenu : ${restants} texte(s) à rédiger avant le lancement.`);
}

const problemes = verifier(liste);
if (problemes.length) {
  console.error(`Contenu dupliqué entre produits :\n- ${problemes.join('\n- ')}`);
  process.exit(1);
}
console.log(`Contenu : ${liste.length} produit(s), aucun texte partagé.`);
