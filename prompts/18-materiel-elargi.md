# 18 — Reconnaître plus d'en-têtes de matériel

**Étape d'entonnoir servie : activation.**

## Pourquoi

Quand l'en-tête de la liste de matériel n'est pas reconnu, rien n'est perdu,
mais tout est mal rangé : la liste part dans les notes de la **première étape**
(« 4 mm crochet hook » s'affiche sous « Round 1 »), et l'en-tête se colle au
titre (« Tiny Bear What you'll need »). C'est la première chose qu'une
nouvelle lectrice voit après avoir collé son patron. Mesuré sur le parseur
actuel, avec le même patron et seul l'en-tête qui change :

| En-tête                                                  | Aujourd'hui                       |
| -------------------------------------------------------- | --------------------------------- |
| `Materials:`, `Materials needed:`, `Supplies needed:`    | reconnu                           |
| `MATERIALS`, `Matériel :`, `Matériel nécessaire :`       | reconnu                           |
| `Fournitures nécessaires :`                              | reconnu                           |
| `What you'll need:`, `What You Need`, `Materials Needed` | collé au titre, liste à l'étape 1 |
| `Tools:`, `Tools and materials:`, `Yarn:`                | collé au titre, liste à l'étape 1 |
| `Liste du matériel`, `Ce dont vous aurez besoin :`       | collé au titre, liste à l'étape 1 |
| `**Materials**`, `# Materials`, `• Materials:`           | liste à l'étape 1                 |
| `Materials: 4 mm hook, 100 g DK yarn` (sur une ligne)    | la ligne entière à l'étape 1      |

## Objectif

Chaque forme du tableau ci-dessus range sa liste dans `Pattern.materials`, et
aucune ligne d'instruction n'y part par erreur.

## Fichiers à lire

- `src/app/features/reader/data/pattern-parser.ts` — `MAT`, `MAT_LOOSE`,
  `INSTR`, et la boucle de `parsePattern`
- `src/app/features/reader/data/pattern-parser.spec.ts` — `grep -n "it("` suffit
- `src/app/features/reader/data/fixtures/` — les patrons réels déjà testés
- `CLAUDE.md`, « Pièges déjà rencontrés » : un test ne fige jamais un
  comportement douteux ; une fiche qui énumère des formes est testée en boucle

## À faire

1. Élargir la reconnaissance, dans `pattern-parser.ts` seulement :
   - variantes anglaises : `what you('ll| will)? need`, `materials needed`,
     `tools( and materials)?`, `yarn`, `hooks?`, `notions` ;
   - variantes françaises : `liste du matériel`, `matériel (nécessaire|requis)`,
     `ce dont vous (aurez|avez) besoin` ;
   - décorations à ignorer avant l'en-tête : `**…**`, `#`, `##`, puce (`•`, `-`,
     `*`), et `:` final optionnel ;
   - en-tête suivi de contenu sur la même ligne (`Materials: 4 mm hook, …`) :
     le contenu après `:` devient le premier élément de `materials`, et la
     section reste ouverte pour les lignes suivantes.

2. Garde-fous, chacun avec un test :
   - `Yarn:` et `Hook:` ne sont des en-têtes que **seuls sur leur ligne** ou en
     tête d'une liste ; « Yarn over, pull through » est une instruction ;
   - une ligne de rang (`Round 1:`, `Rang 1 :`) referme toujours la section
     matériel, comme aujourd'hui ;
   - le titre n'absorbe plus un en-tête de matériel.

3. Tests : un `it.each` sur **toutes** les formes du tableau (pas un
   échantillon), chacune dans le même patron minimal (titre, en-tête, trois
   lignes de matériel, deux rangs), qui vérifie : `materials` contient les
   trois lignes (plus, pour la forme sur une ligne, le texte après `:`), `title` vaut le titre seul, la première étape n'a aucune note.
   Plus un test de non-régression sur chaque fixture de `fixtures/` : le
   nombre d'étapes ne change pas.

4. Aucune modification de l'affichage : `materials-list.ts` montre déjà
   `Pattern.materials`.

## Mesure

Pas de nouvel événement : ajouter à `pattern_parsed` la propriété `materials`
(nombre de lignes rangées dans `Pattern.materials`, jamais leur texte). La part
des découpages avec `materials > 0` se lit dans Umami, dans les propriétés de
l'événement ; le rapport quotidien ne lit pas les propriétés, il n'en dira
rien. Le taux « patron fourni → découpage réussi » de l'entonnoir ne bougera
pas : un patron mal rangé est déjà compté comme découpé.

## Critères d'acceptation

- `npm run verify` vert.
- Les dix-neuf formes du tableau passent le test en boucle.
- Aucune fixture existante ne change de nombre d'étapes ni de pièces.

## Hors périmètre

Découper la liste de matériel en objets (quantité, unité, marque) ; traduire
le matériel ; reconnaître une section « Abbreviations » (déjà traitée par
`ASIDE`) ; toute modification d'interface.
