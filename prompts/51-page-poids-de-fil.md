# 51 — Page « poids de fil » : catégories, noms US/UK, crochet et aiguilles

**Étape d'entonnoir servie : acquisition (« yarn weight chart », « worsted
vs aran », « équivalence grosseur de laine » : des requêtes fréquentes, que
rencontre toute personne qui lit un patron étranger).**

## Pourquoi

Un patron anglais dit « worsted », un patron britannique « aran », un patron
français « laine n° 4 » : c'est la première cause de fil mal choisi, et la
question que cherche la lectrice avant d'acheter. La fiche 29 laisse la colonne
« poids de fil » conditionnelle à une source, et les pages 29 et 50 ont besoin
d'un point de chute commun. Cette page relie les trois : catégorie, noms
américains et britanniques, crochet et aiguille usuels.

## Objectif

`/yarn-weight-chart` et `/fr/poids-de-fil`, pré-rendues : un tableau des
catégories 0 à 7 du Craft Yarn Council (nom US, équivalent UK, plage de crochets
et d'aiguilles) et au moins 500 mots qui expliquent comment lire l'étiquette et
substituer un fil.

## Fichiers à lire

- `prompts/29-page-tailles-de-crochet.md` et
  `src/app/features/tools/pages/hook-sizes-page.ts` : le modèle de page
- `src/app/features/converter/data/hook-sizes.ts` : éventuelle colonne de poids
  déjà ajoutée par la fiche 29 (la réutiliser, ne pas la dupliquer)
- `src/app/core/i18n/route-paths.json`, `src/app/app.routes.ts`
- `CLAUDE.md`, « Pièges » : page paresseuse, CSS dans `pages.css`, page reliée

## À faire

1. Données : `converter/data/yarn-weights.ts`, `YARN_WEIGHTS`, d'après le Craft
   Yarn Council, **source citée en commentaire**. Si une équivalence UK ou
   française n'a pas de source vérifiable, la laisser vide et le dire dans le
   texte : aucune valeur approximative.
2. Route `yarnWeights`, page `features/tools/pages/yarn-weights-page.ts` par
   `page()`. SEO complet, JSON-LD `WebPage`.
3. Tableau accessible (`<caption>`, `<th scope="col">`) ; en dessous, une courte
   FAQ (« Worsted ou aran ? », « Puis-je remplacer un fil par un autre ? »).
4. Contenu (≥ 500 mots par langue) : lire l'étiquette (symbole, mètres aux 100 g,
   échantillon) ; substituer sans refaire le calcul ; lien vers `gaugeCalculator`,
   `hookSizes` et la page des aiguilles (fiche 50, si fusionnée, sinon omettre le
   lien).
5. Relier : pied de page, carte de l'accueil, pages des tailles.

## Mesure

Aucun nouvel événement : les pages vues de la nouvelle route suffisent.

## Tests

- Boucle sur **toutes** les lignes de `YARN_WEIGHTS` : chacune a un nom US, une
  catégorie unique et une source.
- e2e : tableau présent dans le HTML brut des deux langues ; 320 px sans
  débordement.

## Critères d'acceptation

- `npm run verify:ci` vert, bundle initial inchangé.
- Aucune donnée sans source citée.
- Français soigné.

## Hors périmètre

Calcul de métrage, fils par marque, boutique ou liens affiliés.
