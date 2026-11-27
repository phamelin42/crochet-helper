# 63 — Fixtures de test sans droits d'auteur

**Étape d'entonnoir servie : activation (fiabilité du découpage : les patrons
d'essai qui protègent le parseur sont des textes écrits pour le dépôt, que
personne ne peut nous réclamer).**

## Pourquoi

Les fixtures `01` à `05` de `src/app/features/reader/data/fixtures/` étaient des
patrons publiés sur le web, copiés tels quels, sans licence libre : l'une
portait un avis de droits d'auteur d'un site, une autre le copyright de son
autrice et son adresse e-mail (donnée personnelle dans un dépôt). Décision de
Phil : les remplacer par des textes écrits pour le dépôt, comme `06` à `12`.

## Objectif

Chaque fixture garde son nom et la **difficulté de découpage** qu'elle exerçait,
avec un autre patron (autre objet, autres nombres, autres phrases).

## Décisions déjà prises (à appliquer sans les rediscuter)

- Aucun nom de personne, de marque, de site, d'adresse ou de contact ; le bruit
  web de `01` est fait de libellés génériques.
- Même langue que l'original. Mêmes noms de fichier (corpus et tests inchangés).
- Les textes d'origine restent dans l'historique git ; le réécrire serait
  destructif et reste une décision de Phil.

## Fichiers à lire

- `src/app/features/reader/data/fixtures/SOURCES.md`, `corpus.ts`
- `pattern-parser.spec.ts`, `pattern-placement.spec.ts`, `pattern-fidelity.spec.ts`
- `e2e/pattern-link.spec.ts` (lit `04` pour fabriquer un vrai PDF)

## À faire

1. `01` : page de blog (menus, commentaires, partage, pied de page), aucun rang
   numéroté : cas « à passer par l'IA », aucun patron découpé.
2. `02` : puces et sous-puces, lignes coupées, remarque entre crochets, pièce
   unique, ligne sous le titre.
3. `03` : titre sur deux lignes, matériel et abréviations coupés, pied de page de
   PDF recollé à un rang, plages « Rows 4-9 », trois pièces.
4. `04` : numérotation nue « 1. », plages « 5-14. », répétition `*…*repeat 8x`,
   deux conseils.
5. `05` : abréviations en tête avec coquilles réelles (« rnd(s' », « stich »),
   cases `[_]`, pièce sans rang, assemblage.
6. Attendus recalculés **à la main** sur les nouveaux textes, jamais d'après la
   sortie du code ; un résultat faux pour la lectrice est un défaut du parseur,
   signalé (et corrigé s'il est simple), pas figé.
7. `SOURCES.md` : 01 à 12 écrits pour ce dépôt, tableau des structures couvertes.

## Tests

Les trois specs du parseur (effectifs, placements, « rien ne se perd »).
Mutation : casser la numérotation nue puis la plage « 5-14. » fait échouer les
nouvelles fixtures. `grep -rniE` des noms et adresses d'origine : vide hors
historique git.

## Hors périmètre

Réécrire l'historique git ; modifier le comportement du parseur au-delà d'un
défaut simple révélé par les nouveaux textes.
