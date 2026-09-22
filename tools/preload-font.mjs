import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Précharge le seul fichier de police utilisé au premier rendu.
 *
 * Pourquoi. `font-display: swap` (déjà actif par défaut chez Fontsource)
 * affiche du texte avec la police de secours du système, puis le fait passer
 * à Inter une fois le fichier téléchargé. Sur mobile avec un réseau lent, ce
 * remplacement arrive bien après le premier rendu et déplace les liens de
 * navigation d'une ligne à l'autre (leur largeur en texte change), ce que la
 * seule réservation de hauteur ne corrige pas : c'est chaque lien qui se
 * déplace, pas seulement la hauteur du bloc. Mesuré : CLS ≈ 0,33 sur mobile.
 * Précharger le fichier déplace son téléchargement avant celui du script
 * principal, de sorte que la police correcte est déjà prête au premier
 * rendu — plus de remplacement visible, donc plus de décalage.
 *
 * Un seul fichier suffit : le sous-ensemble « latin » couvre déjà les
 * caractères latins de base et les lettres accentuées du français (é, è, à,
 * ç…), utilisées par les deux langues du site.
 */

const ROOT = 'dist/fil-patterns/browser';
const MEDIA_DIR = join(ROOT, 'media');

const file = readdirSync(MEDIA_DIR).find((name) =>
  /^inter-latin-wght-normal-.*\.woff2$/.test(name),
);

if (!file) {
  console.error(`Aucun fichier "inter-latin-wght-normal-*.woff2" trouvé dans ${MEDIA_DIR}.`);
  process.exit(1);
}

const LINK = `<link rel="preload" as="font" type="font/woff2" href="/media/${file}" crossorigin>`;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith('.html') ? [path] : [];
  });
}

let touched = 0;

for (const path of htmlFiles(ROOT)) {
  const before = readFileSync(path, 'utf8');
  if (before.includes(LINK)) continue;
  const after = before.replace(/(<meta name="viewport"[^>]*>)/, `$1\n    ${LINK}`);
  if (after === before) {
    console.error(
      `Balise <meta name="viewport"> introuvable dans ${path}, préchargement non inséré.`,
    );
    process.exit(1);
  }
  writeFileSync(path, after);
  touched++;
}

console.log(`Préchargement de police : ${file} ajouté à ${touched} page(s).`);
