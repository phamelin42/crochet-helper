# 24 — Mode lecture : l'étape en haut, en grand, réglable

**Étape d'entonnoir servie : activation (la promesse tenue dès le premier
patron) et rétention.**

## Pourquoi

Audit UX-1 (`docs/audit-ux-acquisition-2026-09.md`) : sur une tablette de
820 px, patron chargé, l'étape commence à 650 px du haut, sous l'en-tête, le
bandeau d'accueil et le panneau d'import replié ; elle fait 36 px
(`--reader-step: clamp(28px, 4.4vw, 48px)`) ; le compteur de répétitions, la
commande la plus utilisée crochet en main, est sous la ligne de flottaison,
séparé de l'étape par un filet. Aucun réglage de taille ; le fond sombre existe
dans les jetons (`data-dim`) mais n'est accessible que sur `/design-system`. La
promesse « une étape à la fois, en très grand » n'est pas tenue sur l'appareil
cible, et le soir le fond clair éblouit.

## Objectif

Dès qu'un patron est chargé, l'écran devient un écran de lecture : l'étape et
le compteur de répétitions dans le premier écran, en plus grand, avec deux
réglages persistants (taille du texte, fond sombre). Sans patron, l'accueil ne
change pas (la fiche 26 s'en occupe).

## Fichiers à lire

- `src/app/features/reader/pages/reader-page.ts` — l'ordre des sections
- `src/app/features/reader/components/step-view.ts`, `reader-counters.ts`,
  `pattern-import.ts`
- `src/styles/tokens.css` (`--reader-step`, `--reader-step-sm`,
  `[data-dim='true']`, `prefers-reduced-motion`) ; `src/styles/lecteur.css`
  (`.reader`, `.reps`, `.navrow`, `.home-hero`, `.import-host`)
- `src/app/features/design-system/design-system-page.ts` — la bascule
  `data-dim` existante, à réutiliser et non dupliquer
- `src/app/core/storage/local-storage.service.ts`,
  `src/app/shared/ui/segmented/segmented.ts`
- `e2e/perf.spec.ts` (CLS ≤ 0,05), `e2e/project-link.spec.ts` (sélecteurs
  `.big.reps`, bouton `+`, `.import-host summary`)
- `CLAUDE.md`, « Pièges déjà rencontrés » : aucune valeur brute de style, budget
  du bundle, sombre explicite jamais `prefers-color-scheme`

## À faire

1. **Mode lecture.** Quand `store.step()` est non nul, `ReaderPage` masque le
   bandeau d'accueil (`.home-hero`) et la section des guides (`@if`), et place
   `<fil-pattern-import />` **après** les compteurs. L'en-tête du site ne
   change pas. Sans patron, rien ne bouge : le HTML pré-rendu de `/` et `/fr`
   reste identique (le pré-rendu n'a jamais de patron). Un lien « Changer de
   patron » dans la zone de lecture ouvre le panneau d'import (`open.set(true)`)
   et y amène le focus.

2. **Répétitions près de l'étape.** Le compteur de répétitions (`.big.reps`,
   boutons `−`, `+`, « Remettre à zéro ») passe de `ReaderCounters` à
   `StepView`, juste sous le texte de l'étape et au-dessus de
   Précédente / Suivante. `ReaderCounters` garde l'avancement et la session.
   Les sélecteurs des tests e2e (`.big.reps`, bouton `+`) restent valides.

3. **Taille de l'étape.** Trois crans, `Segmented` « A · A+ · A++ » dans la zone
   de lecture, libellé accessible « Taille du texte ». Jetons dans
   `tokens.css` : `--reader-step` garde sa valeur ; `[data-text-size='lg']` et
   `[data-text-size='xl']` la redéfinissent (par exemple
   `clamp(34px, 5.6vw, 60px)` et `clamp(40px, 7vw, 72px)`), ainsi que
   `--reader-step-sm`. L'attribut est posé sur `<html>` par un service
   `src/app/core/platform/display-prefs.service.ts` (signaux `textSize` et
   `dim`, persistés en `localStorage` sous `fil.textSize` et `fil.dim` via
   `LocalStorageService`, `DOCUMENT` injecté, gardé par `isPlatformBrowser`).
   À 320 px en A++, aucun débordement horizontal : `overflow-wrap: anywhere`
   sur `.step-body` si ce n'est pas déjà le cas.

4. **Fond sombre.** Bouton « Assombrir » / « Éclaircir » (texte et icône, jamais
   l'icône seule) à côté du réglage de taille, qui pose `data-dim` par le même
   service. La page `/design-system` utilise désormais ce service (une seule
   implémentation). Le choix est explicite, jamais `prefers-color-scheme`. Au
   démarrage, la préférence est relue dans `afterNextRender` : un bref flash
   clair est accepté (aucun script inline, CSP) et noté dans la PR.

5. **UX-8, tablette.** L'illustration de pelote (`.home-hero::before`,
   `pelote.svg`) passe sous le bouton Suivante entre 600 et 900 px : corriger
   le positionnement pour qu'elle ne chevauche jamais un contrôle, de 320 à
   1280 px, sans valeur brute.

## Mesure

Un événement `reading_pref_changed` avec `pref: 'text_size' | 'dim'` et
`value` (`base` | `lg` | `xl`, ou `on` | `off`), émis dans le gestionnaire du
clic, pas dans un `effect`. À déclarer dans `AnalyticsEvent` **et** dans
`EVENEMENTS` (`tools/umami.mjs`).

## Tests

- `display-prefs.service.spec.ts` : lecture au démarrage, écriture, valeur
  inconnue en stockage → défaut, `localStorage` absent (serveur) → rien ne casse.
- `reader-page.spec.ts` : sans patron, le bandeau et les guides sont rendus ;
  patron chargé, ils ne le sont plus et le panneau d'import vient après les
  compteurs.
- e2e, nouveau `e2e/reading-mode.spec.ts` : sur un viewport 820 × 1180, après
  « Example », le haut de `.step-body` est à moins de 260 px du haut de la page
  et sa taille de police ≥ 40 px ; en A++ à 320 px, `scrollWidth ≤ innerWidth` ;
  « Assombrir » pose `data-dim` et survit à un rechargement. Le thème sombre
  est déjà audité par `a11y.spec.ts` : ne pas dupliquer.
- Mutation à faire soi-même avant de rendre : retirer l'`@if` du bandeau — un
  test doit échouer.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial sous le budget d'`angular.json`
  (le service tient en quelques lignes, aucune dépendance).
- Sur tablette en portrait, patron chargé : étape, compteur de répétitions et
  boutons Précédente / Suivante visibles sans défilement.
- Le HTML pré-rendu de `/` et `/fr` est inchangé au mot près (comparer `dist/`
  avant et après).
- Français soigné dans les nouveaux libellés.

## Hors périmètre

Une police au choix, le thème automatique selon le système, le plein écran
(`requestFullscreen`), un mode téléprompteur ligne à ligne, tout changement du
parseur ou du modèle de projet. La liste des étapes et le saut à un rang :
fiche 25. L'accueil sans patron : fiche 26.
