// Contenu éditorial unique par produit (docs/contenu-unique.md) : fonctions
// pures, testées dans contenu.test.mjs, utilisées par check-contenu.mjs (au
// build) et check-lancement.mjs (avant la mise en ligne).
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Marqueur d'un texte pas encore rédigé, posé par le schematic. */
export const A_REDIGER = 'À RÉDIGER';
/** Une phrase de 8 mots ou plus présente dans deux produits est du contenu dupliqué. */
export const MOTS_PHRASE = 8;
/** Part maximale de suites de 5 mots communes à deux produits (Jaccard). */
export const SEUIL_SIMILARITE = 0.1;
const TAILLE_MAX = 500_000;

export async function lireContenu(racine) {
  const texte = await readFile(join(racine, 'contenu.json'), 'utf8');
  if (texte.length > TAILLE_MAX) throw new Error(`${racine}/contenu.json : trop grand`);
  return JSON.parse(texte);
}

/** Toutes les chaînes du contenu, avec leur chemin (`aide.faq.2.reponse`). */
export function textes(valeur, chemin = '') {
  if (typeof valeur === 'string') return [{ chemin, texte: valeur }];
  if (Array.isArray(valeur)) return valeur.flatMap((v, i) => textes(v, `${chemin}.${i}`));
  if (valeur && typeof valeur === 'object') {
    return Object.entries(valeur).flatMap(([k, v]) => textes(v, chemin ? `${chemin}.${k}` : k));
  }
  return [];
}

export function aRediger(contenu) {
  return textes(contenu)
    .filter((t) => t.texte.trim().startsWith(A_REDIGER))
    .map((t) => t.chemin);
}

/** Textes rédigés seulement : un marqueur commun à tous n'est pas un doublon. */
function rediges(contenu) {
  return textes(contenu).filter((t) => !t.texte.trim().startsWith(A_REDIGER));
}

export function normaliser(texte) {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function phrases(texte) {
  return texte
    .split(/(?<=[.!?…])\s+|\n+/)
    .map(normaliser)
    .filter((p) => p.split(' ').length >= MOTS_PHRASE);
}

export function suites(texte, n = 5) {
  const mots = normaliser(texte).split(' ').filter(Boolean);
  const ensemble = new Set();
  for (let i = 0; i + n <= mots.length; i++) ensemble.add(mots.slice(i, i + n).join(' '));
  return ensemble;
}

export function similarite(a, b) {
  if (!a.size || !b.size) return 0;
  let communes = 0;
  for (const s of a) if (b.has(s)) communes++;
  return communes / (a.size + b.size - communes);
}

export function motsAccueil(contenu) {
  const { titre, chapo, explication, exemples } = contenu.accueil;
  const tout = [titre, chapo, ...[...explication, ...exemples].flatMap((b) => [b.titre, b.texte])];
  return tout
    .filter((t) => !t.trim().startsWith(A_REDIGER))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Compare les produits deux à deux. Renvoie les problèmes : phrase commune,
 * ou similarité d'ensemble au-dessus du seuil.
 */
export function verifier(produits) {
  const prepares = produits.map(({ nom, contenu }) => {
    const t = rediges(contenu);
    return {
      nom,
      phrases: new Map(t.flatMap(({ chemin, texte }) => phrases(texte).map((p) => [p, chemin]))),
      suites: suites(t.map((x) => x.texte).join(' ')),
    };
  });
  const problemes = [];
  for (let i = 0; i < prepares.length; i++) {
    for (let j = i + 1; j < prepares.length; j++) {
      const [a, b] = [prepares[i], prepares[j]];
      for (const [phrase, chemin] of a.phrases) {
        if (b.phrases.has(phrase)) {
          problemes.push(
            `${a.nom} (${chemin}) et ${b.nom} (${b.phrases.get(phrase)}) partagent : « ${phrase} »`,
          );
        }
      }
      const s = similarite(a.suites, b.suites);
      if (s > SEUIL_SIMILARITE) {
        problemes.push(`${a.nom} et ${b.nom} : textes similaires à ${Math.round(s * 100)} %`);
      }
    }
  }
  return problemes;
}
