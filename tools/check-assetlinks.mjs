/**
 * Échoue si `dist/` ne contient pas un `/.well-known/assetlinks.json` valide
 * (fiche 41). Sans lui, la TWA n'est pas reconnue comme propriétaire du site.
 * Tourne après `assetlinks.mjs`, qui l'a posé : le contrôle relit le fichier
 * tel que l'hébergement le servira.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { controler } from './assetlinks.mjs';

const racine = process.argv[2] ?? 'dist/fil-patterns/browser';
const brut = await readFile(join(racine, '.well-known', 'assetlinks.json'), 'utf8').catch(
  () => null,
);
const erreur = controler(brut);
if (erreur) {
  console.error(`/.well-known/assetlinks.json : ${erreur}.`);
  process.exit(1);
}
console.log('/.well-known/assetlinks.json : valide.');
