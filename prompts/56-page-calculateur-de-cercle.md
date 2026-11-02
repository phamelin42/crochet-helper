# 56 — Page « disque au crochet » : augmentations d'un cercle, rang par rang

**Étape d'entonnoir servie : acquisition (« crochet circle pattern »,
« cercle au crochet augmentations », « amigurumi increase calculator » : la
question de la lectrice qui veut un fond rond de la taille de son choix, sans
page pour y répondre). Le résultat se colle dans le lecteur : passerelle vers
l'activation.**

## Pourquoi

Les pages-outils existantes (fiches 28, 29, 49, 50, 51, 54) couvrent le doute
d'avant le patron et d'avant l'achat. Aucune ne couvre le doute **pendant** un
ouvrage inventé par la lectrice : combien de mailles à chaque rang d'un disque
(fond de panier, tapis, bonnet, amigurumi). La règle est connue (6 augmentations
par rang en maille serrée, 12 en bride) et se calcule en une fonction pure : pas
de back-end, pas de donnée à sourcer. Sur 28 jours, 4 sessions viennent de
Google et 3 de Bing (63 visiteuses) : le canal à élargir est la recherche, et
il n'y a pas assez de données pour corriger un comportement (20 sessions sur
7 jours, sous le plancher de 100). Fiche d'acquisition uniquement.

## Objectif

`/crochet-circle-calculator` et `/fr/calculateur-de-cercle`, pré-rendues : on
choisit la maille (serrée, demi-bride, bride) et le nombre de rangs, la page
affiche chaque rang (« rang 3 : _1 ms, 2 ms dans la maille suivante_ ×6 —
18 mailles »), puis un bouton **« Lire dans le lecteur »** qui ouvre ce texte
comme un nouveau projet. Au moins 500 mots par langue expliquent la règle,
pourquoi un disque gondole ou se creuse, et comment corriger.

## Fichiers à lire

- `prompts/54-page-metrage-de-fil.md` et
  `src/app/features/tools/pages/yardage-page.ts` : modèle d'une page-outil à
  saisie, SEO, JSON-LD
- `src/app/features/tools/data/gauge.ts` : modèle de fonction pure testée
- `src/app/core/i18n/route-paths.json`, `src/app/app.routes.ts` : déclarer par
  `page()`
- `src/app/features/tools/pages/image-grid-page.ts` (`grep -n "projet"`) :
  comment une page-outil ouvre un projet dans le lecteur (fiche 49)
- `CLAUDE.md`, « Pièges » : page paresseuse, CSS dans `pages.css`, page reliée,
  « charger un autre patron ouvre un autre projet », énumération testée par
  boucle

## À faire

1. Fonction pure `features/tools/data/circle.ts`, `circleRounds(...)` : renvoie,
   pour chaque rang, le total de mailles et le motif en texte, dans le
   vocabulaire du glossaire (slugs réels : `grep -n` dans `glossary.ts`).
   `null` si la saisie est invalide (rangs hors 1 à 30, maille inconnue),
   jamais d'exception.
2. Route `circleCalculator`, page `features/tools/pages/circle-page.ts` par
   `page()`, SEO complet, JSON-LD `WebPage`.
3. Bouton « Lire dans le lecteur » : ouvre un **nouveau projet** (jamais
   l'écrasement du projet actif), par le même chemin que la page de la fiche 49.
4. Contenu (≥ 500 mots par langue) : la règle des 6 (ou 12) augmentations, le
   disque qui gondole (trop d'augmentations) ou se creuse (trop peu), pourquoi
   le fond d'un bonnet ou d'un amigurumi suit la même logique. Liens vers
   `gaugeCalculator`, `hookSizes` et `readForeignPattern`.
5. Relier : pied de page, carte de l'accueil, pages 28 et 29.

## Mesure

Un événement : `circle_opened_in_reader`, déclaré **deux fois**
(`AnalyticsEvent` dans `core/analytics` et `EVENEMENTS` dans `tools/umami.mjs`,
vérifié par `tools/evenements.test.mjs`). Pages vues de la route et provenance
`google.com` pour l'acquisition. Seuil de la vérification, huit semaines après
la mise en ligne : au moins 5 vues par mois, et au moins 1 ouverture dans le
lecteur.

## Tests

- Boucle sur **toutes** les mailles (serrée, demi-bride, bride) × tous les rangs
  de 1 à 30 : le total du rang n vaut celui du rang n − 1 plus le nombre
  d'augmentations, et le texte produit passe le parseur sans erreur.
- Saisie invalide → `null`.
- e2e : calculateur et texte dans le HTML brut des deux langues ; 320 px sans
  débordement ; le bouton crée un projet distinct de l'actif.

## Critères d'acceptation

- `npm run verify:ci` vert, bundle initial inchangé.
- Aucune valeur inventée : la règle est arithmétique, et les variantes (disque
  plat ou légèrement bombé) sont nommées comme telles.
- Français soigné.

## Hors périmètre

Formes autres que le cercle (ovale, carré), tailles en centimètres via
l'échantillon, diagrammes dessinés, toute monétisation (lot 8 gelé).
