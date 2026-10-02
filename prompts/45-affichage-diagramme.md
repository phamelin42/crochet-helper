# 45 — Affichage diagramme : suivre le patron en symboles, maille par maille

**Étape d'entonnoir servie : rétention (savoir exactement où l'on en est,
maille comprise, et le retrouver au retour).**

## Pourquoi

Phil veut deux affichages du même patron : **Texte** (l'étape en très grand,
ce qui existe) et **Diagramme** (les tours dessinés en symboles). Dans
l'affichage diagramme, on **touche une maille pour dire « j'en suis là »**,
c'est retenu, et **le survol d'une maille dit laquelle c'est**. La fiche 44
fournit les tours ; cette fiche les dessine et y attache la progression.

## Objectif

Dans le lecteur, un choix `Texte | Diagramme`. En diagramme : la pièce en
cours dessinée en SVG (tours en cercles concentriques, rangs en lignes du bas
vers le haut), le tour courant mis en avant, la maille courante marquée ;
toucher une maille y place la progression ; une seule progression partagée
par les deux affichages.

## Fichiers à lire

- `src/app/features/reader/data/text-to-chart.ts` (fiche 44) — si elle n'est
  pas fusionnée, s'arrêter et le dire
- `src/app/features/reader/data/chart-symbols.ts` — `symbolUrl`, `symbolName`
- `grep -n "stepIndex\|positionKey\|snapshot\|hydrate" src/app/features/reader/state/reader-store.ts`
  — la progression et sa persistance ; lire seulement ces plages
- `src/app/features/reader/data/project.model.ts` — `Project`
- `src/app/features/reader/components/step-view.ts` — où l'étape s'affiche
- `src/app/shared/ui/` : `Segmented`, `TooltipHost`, `TooltipService`
- `e2e/reading-mode.spec.ts` — la garde de hauteur sur tablette
- `CLAUDE.md`, « Pièges » : tout ajout au-dessus de l'étape se mesure sur
  tablette ; un survol peut venir de la page (`isStationaryHover`) ; bundle
  initial (`import()`, pas `@defer`) ; aucune valeur brute de style

## À faire

1. **Progression à la maille.** `ReaderStore` gagne `stitchIndex` (signal,
   0 par défaut), remis à 0 quand l'étape change, enregistré dans `Project`
   (`stitch?: number`, absent des anciens projets = 0) par le même effet de
   persistance que `stepIndex`. Le texte affiche « maille 5 sur 18 » sur la
   ligne du libellé quand `stitchIndex > 0`.
2. **Géométrie pure**, `data/chart-layout.ts` : `layoutPiece(chart: PieceChart)
→ { width, height, cells: { round, stitch, symbol, x, y, angle }[] }`.
   Tours : rayon croissant par tour, mailles réparties à angle égal à partir
   de midi dans le sens horaire, symbole tourné vers l'extérieur. Rangs : du
   bas vers le haut, rang 1 en bas ; sens de lecture alterné (rang impair de
   droite à gauche) — c'est ainsi qu'on lit un diagramme travaillé à plat.
   Une étape `null` occupe sa place, sans maille, avec son numéro.
3. **Composant** `components/chart-view.ts` : un `<svg>` rendu en `@for` sur
   `cells` (un `<image>` par maille, `href` = `symbolUrl`), chargé par
   `import()` depuis le lecteur au premier passage en diagramme. Tour courant
   en avant (opacité des autres réduite, jeton), maille courante entourée
   (jeton `--color-primary`), mailles déjà faites atténuées.
   - **Toucher / cliquer** une maille : `stepIndex` = son tour,
     `stitchIndex` = son rang dans le tour.
   - **Survol** (pointeur fin seulement) : infobulle « Tour 3 · maille 5 —
     ms, maille serrée » par `TooltipService`, filtrée par
     `isStationaryHover`.
   - **Clavier et lecteur d'écran** : le `<svg>` a `role="img"` et un
     `aria-label` qui résume (« Tour 3 sur 8, maille 5 sur 18 ») ; deux
     boutons « Maille précédente / suivante » (composant `Button`) sous le
     dessin, plus les flèches gauche/droite quand le dessin a le focus. Une
     région `aria-live="polite"` annonce la maille.
   - Zoom et défilement : réutiliser la logique de `chart-viewer.ts` (cadre
     défilable, `pinch-zoom`) plutôt qu'en écrire une autre.
4. **Choix d'affichage** : `Segmented` `Texte | Diagramme` sur la **ligne du
   libellé** de l'étape (pas une ligne de plus au-dessus de l'étape) ; le
   choix est enregistré par projet (`Project.view?: 'text' | 'chart'`,
   absent = texte). `Diagramme` est désactivé, avec une phrase qui dit
   pourquoi, quand la pièce n'a aucune étape dessinable.
5. Classes dans `chart.css` (feuille paresseuse), jamais dans `lecteur.css`.

## Mesure

- `view_changed` (propriété `view`, `text` ou `chart`) ;
- `stitch_marked`, une fois par tour et par session (pas à chaque toucher) ;

déclarés dans `AnalyticsEvent`, `EVENEMENTS` **et** `privacy-events.ts`.

## Tests

- `chart-layout.spec.ts` : positions d'un tour de 6 (angles 0, 60…300),
  rangs alternés, étape `null` sans maille ; boucle sur les deux `kind`.
- Store : toucher une maille puis attendre l'écriture (`vi.waitFor`), relire
  par `ProjectStoreService.list()` : `stepIndex` et `stitch` enregistrés ;
  changer d'étape remet `stitchIndex` à 0.
- Composant : clic sur une maille → progression ; flèche droite → maille
  suivante ; infobulle absente sur un `pointerenter` immobile.
- e2e `e2e/chart-view.spec.ts` : exemple → Diagramme → toucher la 5e maille
  du tour 2 → recharger → toujours tour 2, maille 5, affichage Diagramme ;
  `e2e/reading-mode.spec.ts` reste vert (`.step-body` sous 450 px en texte) ;
  passage axe sur l'affichage diagramme, clair et sombre.

## Critères d'acceptation

- `npm run verify:ci` vert. Le dessin et sa géométrie sont hors du bundle
  initial (`import()`) ; si le budget d'erreur d'`angular.json` est dépassé
  malgré cela, ne pas grappiller : le relever avec une vraie marge et dire
  dans la PR ce qui pèse (règle « Bundle initial » de `CLAUDE.md`).
- Utilisable au doigt sur tablette : une maille touchée fait au moins 32 px
  à l'échelle 1, sinon le dessin s'ouvre zoomé.

## Hors périmètre

Le choix proposé à l'import (fiche 46), les grilles de couleurs (fiche 47),
éditer le patron depuis le diagramme, l'impression du diagramme, le tricot.
