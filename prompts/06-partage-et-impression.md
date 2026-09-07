# 06 — Partager un patron et l'imprimer

## Pourquoi

Deux besoins que le produit ne couvre pas : envoyer un patron découpé à une amie,
et emporter une version papier. Les deux se font sans serveur.

## Objectif

1. Un permalien qui contient le patron, à partager par message.
2. Une feuille de style d'impression qui produit un livret lisible.

## Fichiers à lire

- `src/app/features/reader/state/reader-store.ts`
- `src/app/features/reader/pages/reader-page.ts`
- `src/app/features/reader/components/pattern-import.ts`
- `src/styles/lecteur.css`

## À faire

### Partie A — permalien

1. `src/app/features/reader/data/pattern-link.ts`, deux fonctions pures :

   ```ts
   export function encodePattern(source: string): Promise<string>;
   export function decodePattern(encoded: string): Promise<string | null>;
   ```

   Compression avec `CompressionStream('deflate-raw')` puis encodage en
   base64url. `decodePattern` renvoie `null` sur toute entrée invalide — jamais
   d'exception : le lien vient d'un tiers.
   Si `CompressionStream` est absent, retomber sur du base64url non compressé.

2. Lecture : `ReaderPage` lit le fragment `#p=…` au démarrage — un **fragment**,
   pas un paramètre de requête, pour que le patron ne parte ni dans les journaux
   du serveur ni dans le `Referer`. S'il est présent et décodable, charger ce
   patron. Ne jamais écraser un patron déjà en cours sans confirmation.

3. Écriture : bouton « Copier le lien » dans `PatternImport`, qui construit
   l'URL et la met dans le presse-papiers. Au-delà de 8000 caractères d'URL,
   désactiver le bouton et l'expliquer — un lien tronqué est pire que pas de lien.

4. Tests : aller-retour `encode`/`decode` sur le patron de démonstration ;
   `decodePattern('n'importe quoi')` renvoie `null`.

### Partie B — impression

`src/styles/print.css`, importé par `styles.css`, sous `@media print` :

- masquer l'en-tête, les commandes, le panneau d'import, les compteurs ;
- imprimer **toutes** les étapes de toutes les pièces, pas seulement l'étape
  courante — il faut donc rendre la liste complète dans le DOM, masquée à
  l'écran (`.print-only`), pas la fabriquer au moment d'imprimer ;
- une pièce par page (`break-before: page`), les étapes numérotées, le matériel
  en tête, le titre et le nombre total d'étapes en pied ;
- noir sur blanc, pas d'ombres, pas de fonds pleins.

## Critères d'acceptation

- Un lien généré sur un poste rouvre le même patron sur un autre, sans réseau
  autre que le chargement du site.
- Un lien corrompu à la main n'affiche pas d'erreur technique : l'application
  s'ouvre vide.
- L'aperçu avant impression du patron de démonstration donne trois pages, une
  par pièce, avec toutes les étapes.
- `npm run verify` vert.

## Hors périmètre

Les liens courts (il faudrait un serveur), l'export PDF côté client,
l'enregistrement de plusieurs patrons — c'est une autre fonctionnalité.
