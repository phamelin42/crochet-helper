# 31 — Lire un patron anglais en français

**Étape d'entonnoir servie : acquisition (marché francophone sans concurrent).**

## Pourquoi

Audit A-3 (`docs/audit-ux-acquisition-2026-09.md`) : « traduire un patron de
crochet anglais », « abréviations crochet anglais français », « lire un patron
en anglais » n'ont pas de bonne réponse en français, et l'outil sait déjà
écrire un patron anglais en clair (« Développer les abréviations »). Aucune
page ne le dit. La page symétrique en anglais (lire un patron français) sert
le même mécanisme dans l'autre sens.

## Objectif

`/fr/lire-un-patron-anglais` (page principale, ≥ 700 mots) et
`/read-a-french-pattern` (même structure, ≥ 500 mots) : on colle un rang ou un
patron, on le voit avec chaque abréviation développée dans sa langue, et on
l'ouvre dans le lecteur d'un clic.

## Fichiers à lire

- `src/app/features/reader/data/glossary.ts` — la segmentation
  (`TextSegment`) et les définitions `fr` / `en`, par `grep -n "export"`
- `src/app/features/reader/components/glossary-text.ts` et `step-view.ts` —
  comment le lecteur développe les abréviations ; si la logique n'est pas déjà
  une fonction pure de `data/`, l'y extraire plutôt que la dupliquer
- `src/app/features/reader/data/pattern-link.ts` — `encodePattern` pour le
  lien `#p=`
- `src/app/features/guides/pages/reading-pattern-page.ts` — modèle de guide
- `src/app/core/i18n/route-paths.json`, `src/app/app.routes.ts`

## À faire

1. Route `readForeignPattern` :
   `{ "fr": "/lire-un-patron-anglais", "en": "/read-a-french-pattern" }`, page
   `features/guides/pages/foreign-pattern-page.ts`, textes locaux, SEO complet,
   JSON-LD `Article`.

2. Outil en haut de page : une zone de texte « Collez un rang ou un patron »,
   et dessous le même texte rendu en segments (`@for`), chaque abréviation
   reconnue affichée développée (« 6 sc » → « 6 mailles serrées (sc) »), par
   une fonction pure de `reader/data/` (`expandAbbreviations(text, locale)`).
   Puis un bouton « Ouvrir dans le lecteur » qui construit un lien `#p=`
   (`encodePattern`, chargé par `import()`) vers `/fr` (ou `/`) ; au-delà de
   8 000 caractères, le même message que dans le lecteur.

3. Contenu FR (≥ 700 mots) : pourquoi les patrons anglais font peur
   (abréviations, US ≠ UK, « ch 2 counts as ») ; un tableau des quinze
   abréviations anglaises les plus courantes et leur équivalent français,
   **généré depuis le glossaire**, pas recopié ; lire un rang type mot à mot ;
   les pièges (`dc` américain = bride, `dc` britannique = maille serrée ;
   « sk », « sp », « rep from \* ») ; convertir un patron entier (lien vers le
   convertisseur) ; puis le lecteur, qui fait tout cela en grand.

4. Contenu EN (≥ 500 mots), symétrique : « ms », « br », « ml », « aug »,
   « dim »…, le tableau FR → EN depuis les entrées `lang: 'fr'`, mêmes pièges.

5. Relier : depuis le guide « lire un patron », le convertisseur, le pied de
   page et la carte de l'accueil.

## Mesure

`foreign_pattern_tried` avec `locale` et `length` arrondi à la centaine (comme
`pattern_pasted`) ; déclaré dans `AnalyticsEvent` **et** `EVENEMENTS`.

## Tests

- Fonction pure : « Row 1: 6 sc in magic ring, inc in each st around »
  développé en français contient « maille serrée » et « augmentation » ; un
  texte sans abréviation ressort inchangé ; les quinze abréviations du tableau
  sont toutes développées (boucle) ; le texte de l'utilisatrice n'est jamais
  interprété comme du HTML (segments).
- e2e : coller un rang → développement visible ; « Ouvrir dans le lecteur »
  ouvre `/fr#p=…` avec la même première étape ; le HTML brut des deux pages
  contient le tableau ; 320 px sans débordement.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé (tout est paresseux).
- Aucune traduction inventée : chaque équivalent vient d'une entrée du
  glossaire ; une abréviation absente reste telle quelle, marquée inconnue.
- Français soigné.

## Hors périmètre

La traduction automatique du texte libre, d'autres langues, la modification du
glossaire au-delà d'ajouts ponctuels documentés, la vidéo.
