# 50 — Page dédiée aux tailles d'aiguilles à tricoter

**Étape d'entonnoir servie : acquisition (« knitting needle sizes chart »,
« taille aiguilles à tricoter mm US » : la requête jumelle de celle des
crochets, sans page pour y répondre).**

## Pourquoi

La fiche 29 exclut explicitement les aiguilles à tricoter de son périmètre. Fil
lit déjà les patrons de tricot (`guideCrochetOrKnitting`, glossaire), mais
aucune page indexable ne répond à la question qui précède tout patron : « mon
patron dit US 8, quelle aiguille en millimètres ? ». Même public, même
gabarit que la fiche 29, donc un coût faible pour une surface indexable de plus.

## Objectif

`/knitting-needle-sizes` et `/fr/tailles-d-aiguilles`, pré-rendues : le tableau
mm ↔ US, un chercheur de taille (« 5 mm » → « US 8 », « US 8 » → « 5 mm ») et
au moins 500 mots qui expliquent la numérotation et le choix de l'aiguille.

## Fichiers à lire

- `prompts/29-page-tailles-de-crochet.md` et
  `src/app/features/tools/pages/hook-sizes-page.ts` (fiche 29, terminée) : le
  modèle à suivre point par point
- `src/app/features/converter/data/hook-sizes.ts` et son `.spec.ts` : forme des
  données et de `findHookSize`
- `src/app/core/i18n/route-paths.json`, `src/app/app.routes.ts` : déclarer par
  `page()` (charge `pages.css`, entre seule dans l'audit axe)
- `CLAUDE.md`, « Pièges » : textes d'une page paresseuse dans la page, CSS dans
  `pages.css`, une nouvelle page est reliée

## À faire

1. Données : `converter/data/needle-sizes.ts`, `NEEDLE_SIZES` (mm et numéro
   US, d'après le Craft Yarn Council, **source citée en commentaire**) et
   `findNeedleSize(input: string): NeedleSize | null` (accepte `5`, `5 mm`,
   `5,0`, `US 8`, `us8`, `8`). Aucune valeur sans source ; l'ancienne
   numérotation britannique est évoquée dans le texte, sans tableau.
2. Route `needleSizes` dans `route-paths.json`, page
   `features/tools/pages/needle-sizes-page.ts` déclarée par `page()`. SEO
   complet, JSON-LD `WebPage`.
3. Tableau : `<table>` avec `<caption>` et `<th scope="col">`, généré depuis
   `NEEDLE_SIZES`. Chercheur : un `InputField`, résultat en grand, entrée
   inconnue → message clair, jamais d'exception.
4. Contenu (≥ 500 mots par langue) : pourquoi deux numérotations ; lire
   « US 8 » dans un patron ; aiguilles droites, circulaires, double pointe (même
   taille, usages différents) ; choisir sa taille selon le fil et
   l'échantillon (lien vers `gaugeCalculator`) ; lien vers les tailles de
   crochet.
5. Relier : pied de page, carte de l'accueil, page des tailles de crochet (et
   inversement), guide « crochet ou tricot ».

## Mesure

Aucun nouvel événement : les pages vues de la nouvelle route suffisent.

## Tests

- `needle-sizes.spec.ts` : `findNeedleSize` parcourt **toutes** les lignes de
  `NEEDLE_SIZES` dans les deux sens et sous chaque écriture acceptée (boucle) ;
  entrée vide, « 1 mm », « Z » → `null`.
- e2e : le HTML brut des deux langues contient le tableau ; chercher « us8 »
  affiche « 5 mm » ; 320 px sans débordement.

## Critères d'acceptation

- `npm run verify:ci` vert, bundle initial inchangé.
- Chaque valeur du tableau a sa source en commentaire.
- Français soigné (espaces insécables avant `: ; ? !`).

## Hors périmètre

Aiguilles à crochet tunisien, tailles britanniques en tableau, longueurs de
câble, boutique ou liens affiliés.
