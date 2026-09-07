# 02 — Couvrir le lecteur par des tests

## Problème

Le parseur et le glossaire sont testés (`pattern-parser.spec.ts`,
`glossary.spec.ts`), mais **rien ne teste le lecteur lui-même** : navigation
entre étapes et entre pièces, compteurs, chronomètre, persistance, raccourcis
clavier. Ce sont pourtant les comportements qu'une régression casserait en
silence.

## Objectif

Fixer le comportement observable du lecteur par des tests, avant que la fiche 03
ne fasse évoluer le parseur.

## Fichiers à lire

- `src/app/features/reader/state/reader-store.ts`
- `src/app/features/reader/pages/reader-page.ts`
- `src/app/features/reader/components/step-view.ts`
- `src/app/features/reader/components/reader-counters.ts`
- `src/app/features/reader/data/demo-pattern.ts`
- `src/app/features/reader/data/pattern-parser.spec.ts` (pour le style attendu)

## À faire

### `src/app/features/reader/state/reader-store.spec.ts`

Tests unitaires du magasin via `TestBed.runInInjectionContext`. Couvrir :

- `load(DEMO_PATTERN)` : `total` correspond à la somme des étapes des pièces ;
  la position repart à la première étape de la première pièce.
- `move(1)` franchit la fin d'une pièce et bascule sur la première étape de la
  suivante ; `move(-1)` fait l'inverse. `hasNext()`/`hasPrevious()` sont faux
  aux deux extrémités.
- `goTo(n)` borne aux limites de la pièce courante ; `goTo` hors patron ne lève pas.
- `addRepeat` ne descend jamais sous zéro ; les compteurs sont **par position**
  (changer d'étape puis revenir retrouve la valeur).
- `setDone(true)` avance d'une étape s'il en reste une, et pas au-delà de la fin.
- `load(texte, true)` conserve la position, `load(texte)` la réinitialise.
- Chronomètre : `startTimer` puis `stopTimer` laisse `running()` à faux et
  n'accumule plus (utiliser les faux minuteurs de Vitest, `vi.useFakeTimers()`).
- `clear()` remet tout à zéro, chronomètre compris.

### `src/app/features/reader/pages/reader-page.spec.ts`

Tests de composant avec `TestBed.configureTestingModule` + `ComponentFixture`.
Fournir la route avec `provideRouter([])` et un `ActivatedRoute` factice portant
`data: { locale: 'fr' }`. Couvrir :

- patron chargé : le texte de l'étape courante apparaît dans le DOM rendu ;
- clic sur « Suivante » : le DOM affiche l'étape suivante ;
- `ArrowRight` sur `document` avance d'une étape ; la même touche **n'avance
  pas** quand l'événement vient d'un `<textarea>` ;
- sans patron, le message d'invite est affiché et « Suivante » est désactivé.

## Critères d'acceptation

- Les tests échouent si l'on inverse le sens de `move()`, si l'on supprime la
  remise à zéro de `load()`, ou si l'on retire le garde sur `<textarea>` des
  raccourcis clavier — vérifie-le en cassant temporairement le code.
- Aucun `setTimeout` réel : les tests s'exécutent en moins d'une seconde.
- `npm run verify` vert.

## Hors périmètre

Ne modifie pas le comportement du lecteur. Si un test révèle un vrai défaut,
**ne le corrige pas ici** : note-le dans le message de commit et laisse le test
décrire le comportement actuel avec un commentaire `// comportement actuel`.
