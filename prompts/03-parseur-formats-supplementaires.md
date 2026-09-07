# 03 — Élargir le parseur aux formats de patrons réels

## Problème

`parsePattern` reconnaît « Rang 1 », « Round 3 », « Rangs 5-8 ». Les patrons
trouvés en ligne ont d'autres formes, aujourd'hui ignorées ou mal découpées :

| Forme rencontrée                         | Ce qui se passe aujourd'hui                                     |
| ---------------------------------------- | --------------------------------------------------------------- |
| `Row 1 (RS): k2, p2`                     | l'indication endroit/envers reste collée au corps               |
| `Rnd 12–16 (rep rnd 11)`                 | le tiret cadratin est géré, la parenthèse non                   |
| `1. 6 ms dans un cercle magique`         | numérotation seule : non reconnue comme étape                   |
| `Notes:` suivi d'un paragraphe           | traité comme une pièce ou comme du matériel                     |
| `Sizes: S (M, L)`                        | pris pour une pièce                                             |
| Ligne `Repeat rows 2–5 four more times.` | devient une étape sans libellé (correct), mais `reps` reste à 0 |

## Objectif

Couvrir ces formes **sans casser une seule des attentes existantes**.

## Fichiers à lire

- `src/app/features/reader/data/pattern-parser.ts`
- `src/app/features/reader/data/pattern-parser.spec.ts`
- `src/app/features/reader/data/pattern.model.ts`

## Méthode imposée

Travaille **test d'abord**, une forme à la fois :

1. Ajoute un test qui décrit la forme visée. Vérifie qu'il échoue.
2. Modifie le parseur au minimum pour le faire passer.
3. Relance **toute** la suite : aucune attente existante ne doit changer.
4. Commit. Puis forme suivante.

Si faire passer une forme casse une attente existante, **arrête-toi sur cette
forme**, laisse le test en `it.todo`, et explique le conflit dans le commit.
Deux règles qui s'excluent valent mieux signalées que tranchées au hasard.

## À faire

1. **Indication endroit/envers** : détacher un suffixe `(RS)`, `(WS)`,
   `(endroit)`, `(envers)` du libellé et l'exposer dans un nouveau champ
   optionnel `side?: 'rs' | 'ws'` de `PatternStep`. Ne l'affiche nulle part —
   une autre fiche s'en chargera.
2. **Numérotation nue** : `1.`, `2)`, `3 -` en début de ligne comptent comme des
   étapes **seulement si le document ne contient aucun libellé de rang
   reconnu** ; sinon ce sont des listes de matériel ou d'instructions. Ce choix
   est délibéré : documente-le en commentaire.
3. **Sections à ignorer** : `Notes`, `Abréviations`, `Abbreviations`, `Gauge`,
   `Échantillon`, `Sizes`, `Tailles` ouvrent une section dont le contenu va dans
   un nouveau champ `Pattern.notes: readonly string[]`, et non dans les pièces.
4. **Répétitions explicites** : `Repeat rows 2-5 four more times`,
   `Répéter les rangs 2 à 5 quatre fois` renseignent `reps`. Gérer les nombres
   en chiffres et les nombres écrits en lettres de deux à douze, dans les deux
   langues.

## Critères d'acceptation

- Chaque forme du tableau a au moins un test nommé d'après elle.
- Les treize tests existants passent **sans modification de leurs attentes**.
- `Pattern` gagne `notes`, `PatternStep` gagne `side` ; les deux sont
  optionnels et documentés.
- Le parseur reste une fonction pure : aucun accès au DOM, aucune dépendance
  Angular, aucun `import` en dehors de `./pattern.model`.
- `npm run verify` vert.

## Hors périmètre

L'affichage de ces nouvelles données, le glossaire, l'interface. Aucune
dépendance nouvelle : pas de bibliothèque de parsing.
