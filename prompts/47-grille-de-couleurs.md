# 47 — Grille de couleurs (tapisserie) : voir l'ouvrage, savoir où l'on est

**Étape d'entonnoir servie : rétention (un ouvrage en couleurs se suit sur
des semaines ; la position retenue fait revenir).**

## Pourquoi

Phil veut pour les ouvrages « où c'est toujours le même point, seule la
couleur change » (crochet tapisserie, C2C, graphgan) ce que fait Stitch
Fiddle, **gratuitement** : voir la grille entière, savoir combien de mailles
par rang et combien de rangs, **toucher une maille pour marquer où l'on en
est** (retenu), et savoir **quand changer de couleur**. Dans Fil, une grille
est un diagramme très simple : un rectangle de mailles serrées colorées.
L'image → grille est la fiche 48 ; ici, le modèle, l'affichage et la
progression.

## Objectif

Un projet peut porter une grille de couleurs. Son affichage diagramme est la
grille ; son affichage texte est la suite des rangs écrits (« Rang 3 : 4 ms
A, 2 ms B, 6 ms A (12) »), générée, donc lue par le lecteur actuel sans
changement. La maille touchée est la progression, partagée par les deux.

## Fichiers à lire

- `src/app/features/reader/data/project.model.ts` — `Project`
- `grep -n "putAll\|snapshot\|hydrate\|stitchIndex\|view" src/app/features/reader/state/reader-store.ts`
- `src/app/features/reader/components/chart-view.ts` et
  `data/chart-layout.ts` (fiche 45) — si la 45 n'est pas fusionnée,
  s'arrêter et le dire ; la grille est un **autre rendu** dans le même
  cadre, pas un second composant de zoom
- `src/app/core/storage/project-store.service.ts` — transactions
- `src/app/shared/ui/` : `Button`, `Segmented`, `TooltipService`
- `CLAUDE.md`, « Pièges » : données de la lectrice, aucune perte ; toute
  entrée tierce bornée ; aucune valeur brute de style

## Ce que fait Stitch Fiddle, et ce qu'on en prend

Pris : grille numérotée (rangs à gauche et à droite, mailles en haut), sens
de lecture alterné à plat, rang courant surligné, marqueur de progression,
décompte des mailles consécutives de même couleur par rang, légende des
couleurs avec un repère lettre. Laissé : compte, cloud, éditeur de dessin
complet, export payant. Ne reprendre ni leurs textes ni leurs visuels.

## À faire

1. **Modèle pur**, `data/color-grid.ts` :

   ```ts
   export interface ColorGrid {
     readonly width: number; // mailles par rang, 4 à 150
     readonly height: number; // rangs, 4 à 150
     readonly palette: readonly string[]; // '#rrggbb', 2 à 12 couleurs, lettre A, B… par indice
     readonly cells: Uint8Array; // width × height indices de palette, rang 1 en bas, ligne par ligne
     readonly worked: 'flat' | 'round'; // à plat : sens alterné ; en rond : toujours le même sens
   }
   export function validGrid(raw: unknown): ColorGrid | null; // bornes, sinon null, jamais d'exception
   export function rowRuns(grid: ColorGrid, row: number): { color: number; count: number }[]; // dans le sens de travail
   export function gridToText(grid: ColorGrid, locale: Locale): string; // « Rang 1 : 4 ms A, 2 ms B (6) »
   export function nextChange(grid: ColorGrid, row: number, stitch: number): number | null; // mailles avant le prochain changement
   ```

   Rang 1 en bas ; à plat, rang 1 de droite à gauche puis alternance
   (convention d'une droitière ; un réglage « gauchère » est hors périmètre).

2. **Projet** : `Project.grid?: ColorGrid`, écrit dans la même transaction
   que le projet. `source` est `gridToText(grid)` à la création : l'affichage
   texte, la liste des étapes, le compteur et l'impression marchent sans rien
   changer. Relecture d'une base existante passée par `validGrid`.
3. **Rendu** : quand le projet a une grille, l'affichage diagramme de la
   fiche 45 dessine la grille (un `<rect>` par maille, `[attr.fill]` lié à la
   palette — les couleurs du patron sont des **données de la lectrice**, pas
   des jetons de style : jamais d'attribut `style`, jamais de couleur dans le
   CSS). Lettre de couleur dans la maille au-delà de 24 px (daltonisme),
   numéros de rangs des deux côtés, flèche du sens de travail du rang
   courant, rang courant surligné (jeton), mailles faites atténuées.
4. **Progression** : toucher une maille → `stepIndex` = son rang,
   `stitchIndex` = sa position **dans le sens de travail**. Sous la grille,
   sur une seule ligne : « Rang 12 · maille 7 sur 40 · encore 3 en A, puis
   B ». Boutons « Maille suivante / précédente », « Rang suivant ».
5. **Survol** : « Rang 12, maille 7 — couleur B (#3a6ea5) » par
   `TooltipService`, filtré par `isStationaryHover`.
6. **Légende** : pastilles de la palette, lettre et nombre total de mailles
   de chaque couleur (utile pour acheter la laine).

## Mesure

- `grid_stitch_marked`, une fois par rang et par session ;

déclaré dans `AnalyticsEvent`, `EVENEMENTS` **et** `privacy-events.ts`.

## Tests

- `color-grid.spec.ts` : `rowRuns` sur une table de rangs, **à plat et en
  rond** (boucle), sens alterné vérifié ; `nextChange` en début, milieu, fin
  de série et au dernier changement ; `gridToText` FR et EN, puis
  `parsePattern` donne `height` étapes au bon compte ; `validGrid` refuse
  chaque borne dépassée (boucle sur largeur, hauteur, palette, longueur de
  `cells`, couleur mal formée).
- Store : un projet grille créé, une maille touchée, écriture attendue
  (`vi.waitFor`), relu par `ProjectStoreService.list()` : grille et
  position intactes.
- Composant : clic sur une maille du rang 2 (sens alterné) → `stitchIndex`
  juste ; la ligne d'aide annonce le bon changement de couleur.
- Pas d'e2e d'entrée dans cette fiche (la grille se crée par la 48) ; un e2e
  qui ouvre une sauvegarde contenant une grille est bienvenu si
  `project-backup.ts` le permet sans changement de format.

## Critères d'acceptation

- `npm run verify:ci` vert ; rendu de grille hors du bundle initial.
- Une grille 150 × 150 s'affiche et répond au toucher en moins de 200 ms sur
  le profil mobile bridé de `e2e/perf.spec.ts` (mesure notée dans la PR).
- Contraste : le surlignage du rang courant et le marqueur de maille restent
  visibles sur **chaque** couleur de la palette (contour double clair/foncé).

## Hors périmètre

Créer une grille depuis une image (fiche 48), dessiner ou repeindre une
grille à la main, C2C en diagonale, tricot jacquard, réglage gauchère,
export PDF de la grille.
