# 42 — La taille du texte suit celle du système

**Étape d'entonnoir servie : activation (une lectrice de 50 à 70 ans qui a
grossi le texte de son téléphone doit le retrouver grossi dans l'outil, sans
chercher un réglage).**

## Pourquoi

Demande de Phil du 1er octobre : « sur l'application mobile, la taille du
texte doit être la même que le système ». Aujourd'hui, toute la typographie
est en pixels (`--text-base: 17px`, `--reader-step: clamp(28px, …, 48px)`,
une trentaine de `font-size: NNpx` dans `hanami.css`, `lecteur.css` et
`pages.css`). Une taille en pixels ignore la taille de police choisie dans
les réglages d'Android ou d'iOS : l'application Android (fiche 41, TWA) et le
site installé (fiche 39) affichent donc le même texte à qui a demandé « très
grand » et à qui a gardé « normal ».

## Objectif

La taille de base du texte vient du système : réglage « Taille de police »
d'Android (TWA et Chrome), « Taille du texte » d'iOS (Safari, site installé),
taille par défaut du navigateur sur ordinateur. Les choix A / A+ / A++ du
lecteur restent, **multipliés** par cette base.

## Fichiers à lire

- `src/styles/tokens.css` — jetons de typographie (`--text-*`,
  `--reader-step*`)
- `src/styles/hanami.css`, `src/styles/lecteur.css`, `src/styles/pages.css` —
  `grep -n "font-size"` seulement (fichiers longs)
- `src/index.html` — balise `viewport`
- `src/app/core/platform/display-prefs.service.ts` — `data-text-size`
  (A / A+ / A++)
- `tools/check-styles.mjs` — ce que le contrôle des styles accepte
- `e2e/reading-mode.spec.ts`, `e2e/page-pleine.spec.ts`,
  `e2e/lecteur-epure.spec.ts`

## À faire

1. **Tailles relatives.** Toute taille de police passe en `rem` (ou `em`
   quand elle dépend de son parent), à valeur égale par défaut : 17 px →
   `1.0625rem`, etc. Les `clamp()` gardent leurs bornes en `rem`. Aucune
   taille de police en `px` ne reste (le contrôle de `tools/check-styles.mjs`
   le vérifie désormais). Les espacements et les rayons restent en `px` : on
   grossit le texte, pas les marges.

2. **Android (TWA et Chrome).** `<meta name="text-scale" content="scale">`
   dans `src/index.html` : avec elle, Chrome sur Android règle la taille
   racine sur le réglage du système au lieu d'appliquer son propre zoom.
   **Vérifier** dans la documentation de Chrome (« text-scale meta tag ») la
   version qui la prend en charge et son comportement dans une TWA ; consigner
   la source dans la PR. Sans prise en charge, rien ne doit casser.

3. **iOS.** Sur Safari (iPhone, iPad), la taille « Dynamic Type » passe par
   `font: -apple-system-body` sur `html`, puis on rétablit la famille de
   police du design system (`--font-body`). Vérifier dans la documentation
   WebKit que la taille seule est reprise, sans changer la police.

4. **A / A+ / A++.** `data-text-size` multiplie la base au lieu de fixer une
   taille : A++ reste plus grand que A quel que soit le réglage du système.

5. **Mise en page.** À 200 % du texte, rien ne se chevauche ni ne déborde :
   en-tête (marque, navigation, boutons), étape et compteurs en page pleine,
   « Précédent » / « Suivant ». Les éléments à hauteur fixe qui contiennent du
   texte (boutons, `.tool-slot`, tuiles) grandissent avec lui.

## Tests

- e2e, en simulant la taille du système par CDP
  (`Page.setFontSizes`, `standard` à 16, 24 et 32 px) :
  - la taille calculée de `.step-body` et du corps de texte suit la base
    (rapport 1,5 et 2 à ± 5 %), pour **chaque** taille A / A+ / A++ (boucle) ;
  - à 390 × 844 et 32 px : aucun débordement horizontal, et en page pleine
    l'étape, les compteurs, « Précédent » et « Suivant » restent visibles
    (défilement permis, chevauchement non) ;
  - la garde « les boutons ne bougent pas d'une étape à l'autre » passe à
    24 px.
- `e2e/reading-mode.spec.ts` : l'étape reste sous 450 px à 820 × 1180 avec la
  base par défaut.
- Le HTML pré-rendu de `/` contient la balise `text-scale`.
- `tools/check-styles.mjs` : un `font-size` en `px` fait échouer le contrôle
  (testé dans `npm run test:tools`).

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé à 1 ko près.
- Par défaut (16 px), le rendu est identique à aujourd'hui (captures avant /
  après jointes à la PR, téléphone et ordinateur).
- axe vert ; reflow 320 px vert.
- Français soigné.

## Hors périmètre

Nouveau réglage de taille dans l'outil, changement de police, mode paysage,
zoom de la page entière.
