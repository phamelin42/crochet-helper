# 13 — Ouvrir un PDF de patron

## Pourquoi

La majorité des patrons vendus circulent en PDF. Aujourd'hui Fil demande de
coller du texte : une visiteuse qui arrive avec un PDF n'a rien à coller et
repart. C'est le plus gros trou du produit.

`pdf.js` extrait le texte **entièrement dans le navigateur**. La règle 1 est
préservée : pas de serveur, et le patron ne quitte jamais l'appareil.

## Décisions déjà prises — ne pas les rediscuter

Un essai a été fait le 21 septembre 2026 sur ce dépôt. Ce qui suit est vérifié :
applique-le tel quel, sans refaire d'exploration.

- **Dépendance :** `pdfjs-dist@^6.3.289`, en dépendance runtime. C'est la seule
  autorisée.
- **Worker :** servi depuis la même origine. Ajouter dans `angular.json`, aux
  `assets` de la cible `build` :

  ```json
  { "glob": "pdf.worker.min.mjs", "input": "node_modules/pdfjs-dist/build", "output": "/" }
  ```

  puis `GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'`.

- **CSP : aucune modification.** `worker-src` retombe sur `script-src 'self'`.
  Vérifié dans Chromium avec la CSP exacte de `vercel.json` : worker chargé,
  aucune violation. Si tu crois devoir toucher à la CSP, c'est que tu t'es
  écarté de ces décisions.
- **Chargement paresseux :** `await import('pdfjs-dist')` à l'intérieur de
  l'adaptateur, lui-même importé dynamiquement par le composant. Résultat
  mesuré : bundle initial inchangé (313,79 kB), pdf.js dans un chunk à part
  (432 kB brut, 108 kB transférés), pré-rendu intact.
- **Appel :** `getDocument({ data })`. N'ajoute pas `isEvalSupported` : l'option
  n'existe plus dans la v6 et casse la compilation.

## Architecture — deux fichiers, un seul testé

1. `src/app/features/reader/data/pdf-extract.ts` — **adaptateur mince**, seul à
   importer pdf.js, jamais importé par un test :

   ```ts
   /** Une chaîne par page : chaque item de texte, suivi de « \n » si hasEOL. */
   export async function extractPdfPages(file: File): Promise<string[]>;
   ```

2. `src/app/features/reader/data/pdf-normalize.ts` — **fonction pure**, sans
   Angular ni pdf.js, entièrement testée :

   ```ts
   export class PdfEmptyTextError extends Error {}
   /** Lève PdfEmptyTextError si aucune page ne contient de texte (PDF scanné). */
   export function normalizePdfPages(pages: readonly string[]): string;
   ```

Les tests ne manipulent **aucun PDF binaire** et ne chargent **jamais** pdf.js :
ils partent de tableaux de chaînes comme celui ci-dessous.

## La normalisation, et son cas de référence

Voici la sortie réelle de l'extraction sur un patron de deux pages, capturée
pendant l'essai. Chaque élément du tableau est une page :

```ts
const pages = [
  'Little Bee Amigurumi — Pattern Reader test\n1\nLittle Bee Amigurumi\nMaterials: 4 mm hook, yellow and black yarn\nRound 1: 6 sc in magic ring (6)\nRound 2: inc in each st around (12)\nRound 3: [sc, inc] x 6 (18) — work in the back loop for a smoo-\nther finish',
  'Little Bee Amigurumi — Pattern Reader test\n2\nRound 4: [2 sc, inc] x 6 (24)\nRounds 5-8: sc around (24)\nFasten off and weave in ends.',
];
```

`normalizePdfPages(pages)` doit rendre **exactement** :

```text
Little Bee Amigurumi
Materials: 4 mm hook, yellow and black yarn
Round 1: 6 sc in magic ring (6)
Round 2: inc in each st around (12)
Round 3: [sc, inc] x 6 (18) — work in the back loop for a smoother finish
Round 4: [2 sc, inc] x 6 (24)
Rounds 5-8: sc around (24)
Fasten off and weave in ends.
```

Ce texte, passé à `parsePattern`, donne 5 étapes (vérifié). Les règles qui y
mènent, chacune avec son propre test :

1. **Saut de ligne entre les pages.** pdf.js n'en met pas : sans lui, « ther
   finish » se colle à l'en-tête de la page suivante.
2. **En-têtes et pieds répétés.** Une ligne qui figure parmi les 3 premières ou
   les 3 dernières lignes d'au moins 2 pages est retirée partout.
3. **Numéros de page.** Une ligne composée uniquement de 1 à 3 chiffres, parmi
   les 2 premières ou les 2 dernières lignes d'une page, est retirée.
4. **Césures.** Une ligne qui se termine par une lettre suivie de `-`, suivie
   d'une ligne qui commence par une minuscule, est recollée sans le tiret.
   `Rounds 5-8`, `2-3 sc` ou une ligne qui finit par un chiffre suivi de `-`
   restent intacts : les chiffres ne déclenchent jamais la règle.
5. **Espaces.** Espaces insécables convertis, espaces multiples réduits, lignes
   vides en début et fin supprimées.

Écris d'abord les tests de ces cinq règles et du cas de référence, puis
l'implémentation. Ne touche pas à `parsePattern`.

## Interface

- Dans `pattern-import.ts` : un bouton « Open a PDF » / « Ouvrir un PDF »
  (directive `filButton`, variante `secondary`), qui déclenche un
  `<input type="file" accept="application/pdf,.pdf">` masqué.
- Dans `reader-page.ts` : un PDF **collé** (déjà écouté par `onPaste`) ou
  **déposé** sur la page (`(document:dragover)` et `(document:drop)` dans
  `host`) suit le même chemin. Les images gardent leur comportement actuel.
- Un seul chemin de code pour les trois entrées : lire le fichier, extraire,
  normaliser, puis `store.load(texte)`.
- Pendant l'extraction, le bouton affiche un état de chargement et est
  désactivé.
- Sur `PdfEmptyTextError` : message clair, dans les deux langues, qui explique
  que ce PDF est une image et propose de coller le texte à la main. Aucun
  terme technique.
- Libellés dans `translations.ts`, dans les deux langues. Aucun style local.
- Instrumenter `pdf_imported` (avec `pages`) et `pdf_failed` (avec `raison`) :
  ajoute-les à l'union `AnalyticsEvent`.

## Critères d'acceptation

- `npm run verify` vert.
- Les tests de `pdf-normalize.spec.ts` couvrent le cas de référence, les cinq
  règles, et `PdfEmptyTextError`.
- `pdfjs-dist` n'apparaît que dans un chunk paresseux : le bundle initial reste
  sous 320 kB.
- `dist/fil-patterns/browser/pdf.worker.min.mjs` existe après le build.
- `vercel.json` et `netlify.toml` sont inchangés.

## Hors périmètre

L'OCR des PDF scannés, qui demanderait un serveur. Le rendu visuel des pages.
Toute modification de `parsePattern`, y compris la reconnaissance de la section
« Materials » en anglais : c'est la fiche 03. Le glisser-déposer d'images.
