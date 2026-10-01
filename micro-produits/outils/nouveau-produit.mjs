// Crée le dépôt d'un micro-produit à partir du socle commun.
//
//   node micro-produits/outils/nouveau-produit.mjs <slug> <dossier-cible>
//
// Copie `micro-produits/socle`, remplace les marqueurs `@@NOM@@`,
// `@@REQUETE@@`… par les valeurs de `produits.json` (échappées selon le type
// de fichier) et écrit `produit.json`, seule source d'identité lue par le
// code. Le code TypeScript ne contient aucun marqueur : il importe
// `produit.json`, ce qui évite tout problème d'échappement. Échoue si un
// marqueur reste, plutôt que de livrer un dépôt à moitié rempli.
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
export const SOCLE = join(ICI, '..', 'socle');
export const TABLE = join(ICI, '..', 'produits.json');

const MARQUEUR = /@@[A-Z_]+@@/g;
const TEXTE = new Set([
  '.md',
  '.json',
  '.webmanifest',
  '.html',
  '.svg',
  '.css',
  '.yml',
  '.ts',
  '.mjs',
  '.js',
  '',
]);
const SANS_MARQUEUR = new Set(['.ts', '.mjs', '.js']);

/** Valeurs des marqueurs pour un produit de la table. */
export function valeursDe(produit) {
  const formats = { pdf: 'PDF', ical: 'iCal', csv: 'CSV', impression: 'impression' };
  return {
    '@@SLUG@@': produit.slug,
    '@@NOM@@': produit.nom,
    '@@DOMAINE@@': produit.domaine,
    '@@REQUETE@@': produit.requete,
    '@@PUBLIC@@': produit.public,
    '@@PROMESSE@@': produit.promesse,
    '@@DESCRIPTION@@': produit.description,
    '@@FONCTION@@': produit.fonction,
    '@@EXPORTS@@': produit.exports.map((f) => formats[f] ?? f).join(', '),
    '@@OFFRE@@': produit.offre,
    '@@ACCENT@@': produit.accent,
    '@@ACCENT_FONCE@@': produit.accentFonce,
    '@@SEMAINE@@': String(produit.semaine),
  };
}

const ECHAPPER = {
  json: (v) => JSON.stringify(v).slice(1, -1),
  html: (v) =>
    v
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;'),
  brut: (v) => v,
};

/** Remplace les marqueurs d'un fichier texte ; refuse un marqueur inconnu ou dans du code. */
export function substituer(texte, valeurs, fichier) {
  const ext = extname(fichier);
  const trouves = texte.match(MARQUEUR) ?? [];
  if (!trouves.length) return texte;
  if (SANS_MARQUEUR.has(ext)) {
    throw new Error(
      `${fichier} : marqueur dans du code (${trouves[0]}) — lire produit.json à la place`,
    );
  }
  if (ext === '.css') {
    // CSS : la valeur du socle est suivie de son marqueur en commentaire
    // (`--x: #e07a8f; /* @@ACCENT@@ */`) — Prettier coupe un marqueur nu.
    texte = texte.replace(/:\s*[^;]+;\s*\/\*\s*(@@[A-Z_]+@@)\s*\*\//g, (_, m) => {
      if (!(m in valeurs)) throw new Error(`${fichier} : marqueur inconnu ${m}`);
      return `: ${valeurs[m]};`;
    });
  }
  const echapper =
    ext === '.json' || ext === '.webmanifest'
      ? ECHAPPER.json
      : ext === '.html' || ext === '.svg'
        ? ECHAPPER.html
        : ECHAPPER.brut;
  return texte.replace(MARQUEUR, (m) => {
    if (!(m in valeurs)) throw new Error(`${fichier} : marqueur inconnu ${m}`);
    return echapper(valeurs[m]);
  });
}

async function* parcourir(dir) {
  for (const entree of await readdir(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name);
    if (entree.isDirectory()) {
      if (['node_modules', 'dist', '.angular'].includes(entree.name)) continue;
      yield* parcourir(chemin);
    } else yield chemin;
  }
}

/** Fiche `produit.json` du dépôt : l'entrée de la table, plus l'éditeur et la mesure communs. */
export function ficheProduit(table, slug) {
  const produit = table.produits.find((p) => p.slug === slug);
  if (!produit) {
    throw new Error(
      `Produit inconnu : ${slug} (connus : ${table.produits.map((p) => p.slug).join(', ')})`,
    );
  }
  return { ...produit, editeur: table.editeur, mesure: table.mesure };
}

/**
 * Les valeurs substituées changent la largeur des tableaux Markdown : sans
 * repasse, `format:check` du nouveau dépôt serait rouge dès le premier commit.
 * Prettier est celui de Pattern Reader (même version que le socle).
 */
async function formater(fichiers) {
  let prettier;
  try {
    prettier = await import('prettier');
  } catch {
    console.warn('Prettier introuvable : lancer « npx prettier --write . » dans le nouveau dépôt.');
    return;
  }
  for (const fichier of fichiers) {
    const info = await prettier.getFileInfo(fichier, { ignorePath: [] });
    if (info.ignored || !info.inferredParser) continue;
    const options = { ...(await prettier.resolveConfig(fichier)), filepath: fichier };
    await writeFile(fichier, await prettier.format(await readFile(fichier, 'utf8'), options));
  }
}

export async function genererProduit({ slug, cible, table, socle = SOCLE }) {
  const fiche = ficheProduit(table, slug);
  try {
    if ((await readdir(cible)).length) throw new Error(`${cible} existe et n'est pas vide`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const valeurs = valeursDe(fiche);
  const ecrits = [join(cible, 'produit.json')];
  for await (const source of parcourir(socle)) {
    const rel = relative(socle, source);
    const dest = join(cible, rel);
    await mkdir(dirname(dest), { recursive: true });
    if (rel === 'produit.json') continue;
    if (TEXTE.has(extname(source))) {
      await writeFile(dest, substituer(await readFile(source, 'utf8'), valeurs, rel));
      ecrits.push(dest);
    } else {
      await copyFile(source, dest);
    }
  }
  await writeFile(join(cible, 'produit.json'), `${JSON.stringify(fiche, null, 2)}\n`);
  await formater(ecrits);
  return fiche;
}

async function principal() {
  const [slug, cible] = process.argv.slice(2);
  if (!slug || !cible) {
    console.error('Usage : node micro-produits/outils/nouveau-produit.mjs <slug> <dossier-cible>');
    process.exit(1);
  }
  const table = JSON.parse(await readFile(TABLE, 'utf8'));
  const fiche = await genererProduit({ slug, cible, table });
  console.log(`${fiche.nom} créé dans ${cible}.

Ensuite :
  cd ${cible}
  git init -b main && npm install && npm run icones
  npm run verify:ci
  git add -A && git commit -m "Crée le socle de ${fiche.nom}"
Puis docs/lancement.md, et la fiche prompts/01-fonction-principale.md.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await principal();
