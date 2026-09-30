/**
 * Digital Asset Links : lie le site à l'application Android (fiche 41).
 *
 * Pourquoi un script de build plutôt qu'un fichier dans `public/` : les
 * empreintes vivent à un seul endroit, `twa/fingerprints.json`, où Phil les
 * colle après avoir créé l'application dans la console Play. Le fichier servi
 * en est déduit, donc les deux ne peuvent pas diverger.
 *
 * Une liste vide est valide : la TWA s'ouvre alors avec une barre d'adresse
 * au lieu de plein écran, ce qui ne casse rien.
 *
 * Doit tourner avant `ngsw-config` (le fichier n'est pas dans le cache du
 * worker, mais l'ordre des post-traitements reste le même partout).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const PACKAGE_NAME = 'com.patternreader.app';
const SHA256 = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/** Le contenu de `assetlinks.json` pour ces empreintes, ou une erreur claire. */
export function construire(empreintes) {
  if (!Array.isArray(empreintes)) {
    throw new Error('twa/fingerprints.json doit être un tableau de chaînes.');
  }
  const mauvaises = empreintes.filter((e) => typeof e !== 'string' || !SHA256.test(e));
  if (mauvaises.length) {
    throw new Error(
      `Empreinte SHA-256 invalide (attendu 32 octets hexadécimaux en majuscules séparés par « : ») : ${mauvaises.join(', ')}`,
    );
  }
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: empreintes,
      },
    },
  ];
}

/** Erreur (texte) si le fichier servi est absent ou invalide, sinon `null`. */
export function controler(brut) {
  if (brut === null) return 'fichier absent';
  let json;
  try {
    json = JSON.parse(brut);
  } catch {
    return 'JSON invalide';
  }
  const cible = Array.isArray(json) ? json[0]?.target : undefined;
  if (cible?.namespace !== 'android_app' || cible.package_name !== PACKAGE_NAME) {
    return `aucune entrée android_app pour ${PACKAGE_NAME}`;
  }
  try {
    construire(cible.sha256_cert_fingerprints);
  } catch (e) {
    return e.message;
  }
  return null;
}

async function principal() {
  const racine = process.argv[2] ?? 'dist/fil-patterns/browser';
  const dossier = join(racine, '.well-known');
  const fichier = join(dossier, 'assetlinks.json');
  const empreintes = JSON.parse(await readFile('twa/fingerprints.json', 'utf8'));
  await mkdir(dossier, { recursive: true });
  await writeFile(fichier, JSON.stringify(construire(empreintes), null, 2) + '\n');
  const erreur = controler(await readFile(fichier, 'utf8'));
  if (erreur) {
    console.error(`assetlinks.json : ${erreur}`);
    process.exit(1);
  }
  console.log(`assetlinks.json : ${empreintes.length} empreinte(s) publiée(s).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await principal().catch((e) => {
    console.error(`assetlinks.json : ${e.message}`);
    process.exit(1);
  });
}
