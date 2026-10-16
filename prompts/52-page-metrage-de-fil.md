# 52 — Page « combien de fil me faut-il ? » : métrage estimé d'un ouvrage

**Étape d'entonnoir servie : acquisition (« how much yarn do I need »,
« combien de pelotes pour un plaid » : la question qui suit « quel poids de
fil » et précède l'achat, sans page pour y répondre).**

## Pourquoi

Les fiches 28 (échantillon), 29 (crochets), 50 (aiguilles) et 51 (poids de fil)
couvrent le doute d'avant le patron. Reste celui d'avant l'achat : « combien de
pelotes ? ». Le métrage est exclu de la fiche 28 et de la 51 « hors
périmètre » : il n'a donc pas de page. Même public, même gabarit, mêmes liens
internes que les pages-outils existantes ; coût faible pour une surface
indexable de plus. Sur 28 jours, 6 sessions viennent de Google (sur 81) :
l'acquisition par la recherche est le canal à élargir, et il n'y a pas assez de
données pour corriger un comportement (15 sessions sur 7 jours, sous le
plancher de 100).

## Objectif

`/yarn-yardage-calculator` et `/fr/calculateur-de-metrage`, pré-rendues : on
choisit un type d'ouvrage (bonnet, écharpe, plaid, châle, pull adulte…), une
taille et un poids de fil, la page donne une **fourchette** de mètres et de
pelotes (avec le métrage de la pelote saisi par la lectrice), et au moins
500 mots expliquent comment l'estimation est faite et pourquoi acheter une
pelote de plus.

## Fichiers à lire

- `prompts/28-calculateur-d-echantillon.md` et
  `src/app/features/tools/pages/gauge-calculator-page.ts` : modèle d'une
  page-outil à saisie
- `prompts/51-page-poids-de-fil.md` et `src/app/features/converter/data/yarn-weights.ts`
  (fiche 51, terminée) : catégories de poids à réutiliser, pas à dupliquer
- `src/app/core/i18n/route-paths.json`, `src/app/app.routes.ts` : déclarer par
  `page()`
- `CLAUDE.md`, « Pièges » : page paresseuse, CSS dans `pages.css`, page reliée,
  une fiche qui énumère des valeurs est testée par boucle

## À faire

1. Données : `converter/data/yardage.ts`, `YARDAGE_ESTIMATES` (type d'ouvrage ×
   taille × catégorie de poids → mètres min et max), **source citée en
   commentaire par ligne** (tableaux publics du Craft Yarn Council ou de
   fabricants). Une combinaison sans source vérifiable est absente de la table
   et la page le dit : aucune valeur approximative.
2. Fonction pure `estimateYardage(...)` : renvoie les mètres min et max et le
   nombre de pelotes (arrondi au supérieur) pour un métrage de pelote donné ;
   `null` si la combinaison est absente ou si la saisie est invalide.
3. Route `yardageCalculator`, page `features/tools/pages/yardage-page.ts` par
   `page()`. SEO complet, JSON-LD `WebPage`.
4. Contenu (≥ 500 mots par langue) : lire le métrage sur l'étiquette, pourquoi
   la fourchette, le point au crochet qui consomme plus que le tricot, acheter
   le même lot de teinte. Liens vers `yarnWeights`, `gaugeCalculator`,
   `hookSizes` et `needleSizes`.
5. Relier : pied de page, carte de l'accueil, pages 28, 50 et 51.

## Mesure

Aucun nouvel événement : les pages vues de la nouvelle route et la provenance
`google.com` suffisent. Seuil de la vérification : au moins 5 vues par mois
huit semaines après la mise en ligne, comme les fiches 50 et 51.

## Tests

- Boucle sur **toutes** les lignes de `YARDAGE_ESTIMATES` : chacune a une source,
  `min ≤ max`, une catégorie de poids existant dans `YARN_WEIGHTS`.
- `estimateYardage` : combinaison absente, saisie négative ou nulle, métrage de
  pelote nul → `null`, jamais d'exception.
- e2e : calculateur et texte présents dans le HTML brut des deux langues ;
  320 px sans débordement.

## Critères d'acceptation

- `npm run verify:ci` vert, bundle initial inchangé.
- Aucune donnée sans source citée ; l'estimation est annoncée comme telle.
- Français soigné.

## Hors périmètre

Fils par marque, boutique ou liens affiliés, enregistrement des ouvrages,
tailles de vêtement détaillées, toute monétisation (lot 8 gelé).
