# 38 — Mode page pleine par défaut

**Étape d'entonnoir servie : activation (le lecteur tient sa promesse « une
seule instruction à la fois, en très grand », sans rien autour).**

## Pourquoi

Demande de Phil du 30 septembre, inspirée de l'application Filo : une fois le
patron ouvert, l'écran ne montre que ce qu'il faut faire maintenant. Aujourd'hui,
l'étape partage l'écran avec l'en-tête, le partage, trois compteurs, le panneau
du patron, la liste d'attente et le pied de page : sur téléphone, il faut
défiler pour tout voir, et l'œil ne sait pas où se poser à un mètre de distance.

## Objectif

Dès qu'un patron est chargé, le lecteur passe en **mode page pleine**, activé
par défaut : l'écran entier (`100dvh`) ne montre que

- la position (« Étape 3 / 8 ») et la barre de progression ;
- le texte de l'étape (et ses notes, astuce, photos, diagramme, qui font partie
  de l'étape) ;
- **le compteur de répétitions** (décision de Phil : il reste visible, en
  compact, sous l'étape) ;
- « Précédent » et « Suivant », en bas, à portée de pouce ;
- un bouton discret « Outils » (icône ⋯, nommé par `aria-label`), en haut à
  droite, qui quitte le mode page pleine et rend la page complète.

Tout le reste est masqué dans ce mode : en-tête du site, sélecteurs de pièce et
de taille, partage, tuiles « Progress » et « Session », panneau du patron,
liste d'attente, matériel, pied de page. Depuis la page complète, un bouton
« Page pleine » (même emplacement) y revient.

## Fichiers à lire

- `src/app/features/reader/components/step-view.ts` — l'étape, la barre, les
  boutons, `reader-tools`
- `src/app/features/reader/components/reader-counters.ts` — tuile des
  répétitions (à réutiliser, pas à dupliquer)
- `src/app/features/reader/pages/reader-page.ts` — gabarit de la page
  (`grep -n` : fichier de plus de 300 lignes)
- `src/app/core/platform/display-prefs.service.ts` — préférences d'affichage
  persistées (taille du texte, fond sombre) : le mode page pleine s'y ajoute
- `src/app/app.ts` et `src/app/shared/layout/site-header.ts`,
  `site-footer.ts` — ce qu'il faut masquer
- `src/styles/lecteur.css` — `.step-block`, `.navrow`, `.meter`, `.reps-tile`
- `e2e/lecteur-epure.spec.ts`, `e2e/reading-mode.spec.ts`, `e2e/a11y.spec.ts`

## À faire

1. **Préférence.** `DisplayPrefsService` gagne `focus` (signal, `true` par
   défaut), persistée comme les deux autres réglages, et posée en attribut
   `data-focus` sur `<html>` **seulement quand un patron est chargé** (le
   lecteur le pose et le retire). Rien au pré-rendu : la page d'accueil
   pré-rendue reste la page complète, indexable.

2. **Masquage par CSS.** `html[data-focus] ...` masque l'en-tête, le pied de
   page et les blocs listés plus haut ; aucun `@if` qui détruirait l'état des
   composants (chronomètre, panneau d'import). Le compteur de répétitions
   apparaît sous l'étape dans ce mode : soit la tuile existante déplacée par
   la mise en page (grille), soit une version compacte **du même composant**
   (une entrée `compact`), jamais une seconde implémentation.

3. **Mise en page.** L'étape se centre verticalement dans l'espace libre ;
   « Précédent » et « Suivant » se fixent en bas (`position: sticky` ou
   grille sur `100dvh`, `env(safe-area-inset-bottom)` respecté). Les boutons
   restent immobiles d'une étape à l'autre (garde existante,
   `e2e/lecteur-epure.spec.ts`). Aucune valeur brute : jetons de `tokens.css`.

4. **Entrer et sortir.**
   - Bouton « Outils » (⋯) en mode page pleine, « Page pleine » en page
     complète, au même endroit ; `aria-pressed` reflète l'état.
   - Échap quitte le mode page pleine ; le focus va au bouton qui vient
     d'apparaître.
   - Charger un patron (exemple, collage, PDF, lien reçu, reprise d'un
     projet) respecte la préférence.
   - Le choix est mémorisé : qui a quitté le mode le retrouve quitté au
     prochain patron.

5. **Plein écran du navigateur (facultatif, dans ce même bouton).** Si
   `document.fullscreenEnabled`, entrer en mode page pleine par un clic
   demande aussi `requestFullscreen()` ; en sortir appelle
   `exitFullscreen()`. Jamais au chargement : le navigateur l'exige d'un
   geste. Passe par `core/platform` (règle des API navigateur).

6. Textes FR/EN (« Outils », « Page pleine », `aria-label`) dans la page ou
   `reader-copy.ts`, pas dans `translations.ts` (bundle initial).

## Mesure

`focus_mode_toggled` avec `value: 'on' | 'off'`, émis au clic (pas depuis un
`effect`), déclaré dans `AnalyticsEvent` **et** `EVENEMENTS`.

## Tests

- `DisplayPrefsService` : `focus` vaut `true` par défaut, persiste,
  n'écrit rien côté serveur.
- e2e (390 × 844 **et** 820 × 1180) :
  - après « Example », en-tête, partage, « Progress » et pied de page ne sont
    pas visibles ; étape, barre, répétitions, « Précédent », « Suivant » et
    « Outils » le sont, **sans défilement** (tous dans le premier écran) ;
  - « Outils » rend la page complète ; Échap aussi ; le choix survit à un
    rechargement ;
  - la garde « les boutons ne bougent pas d'une étape à l'autre » passe dans
    les deux modes ;
  - `e2e/reading-mode.spec.ts` : l'étape reste sous 450 px à 820 × 1180.
- `e2e/a11y.spec.ts` : audit axe du lecteur **en mode page pleine**, clair et
  sombre.
- Le HTML pré-rendu de `/` et `/fr` ne contient pas `data-focus`.

## Critères d'acceptation

- `npm run verify:ci` vert.
- Bundle initial : le lecteur est dans le premier affichage, ses règles vont
  dans `lecteur.css` ; un avertissement de budget se justifie dans la PR.
- axe vert ; focus visible sur « Outils » ; Échap documenté par
  `aria-keyshortcuts`.
- Français soigné.

## Hors périmètre

Gestes de balayage, vibration, commande vocale, mode paysage dédié, verrou
d'écran automatique (le bouton existant de l'en-tête reste accessible depuis la
page complète), refonte des tuiles.
