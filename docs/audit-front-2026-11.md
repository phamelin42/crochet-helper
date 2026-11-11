# Audit front-end et design en navigateur (novembre 2026)

Lot 1 : constats seulement, aucun code applicatif modifié. Build de `78c5d3c` (branche `claude/great-goodall-hs9gnj`), servi par `e2e/static-server.mjs`, mesuré le 11/11/2026 sous Chromium.

## Résumé

1. Le pré-audit est confirmé presque en entier : B1, B2, B3, I2, I3, I5, I6, I7, I8, I9, C2 sont vrais ; I1 et I4 sont nuancés.
2. **Bloquant, clavier** : le gestionnaire `document:keydown` fait avancer l’étape quand on appuie sur Espace sur n’importe quel bouton. Sur « Précédente », l’étape avance. Sur « Annuler » d’un dialogue, il ne se ferme pas et le patron avance derrière. Sur l’accueil, Espace, PageBas et Flèche bas ne font plus défiler.
3. **Bloquant, lisibilité** : une étape de 90 signes s’écrit en 16,8 px à 390 px et une de 120 signes en 14 px, soit moins que le texte des boutons (15 px). L’exemple du site s’y prend lui-même : son étape 7 est à 18 px sur tablette, au milieu d’un écran presque vide.
4. **Bloquant, page pleine** : elle s’active seule après tout chargement et sa sortie est un cercle de trois points de 43 × 44 px, sans libellé visible. La taille du texte, les pièces et l’en-tête y sont masqués.
5. **Bloquant, contraste** : la bordure des champs `.input` vaut 1,29:1 (clair) et 1,60:1 (sombre) contre 3:1 requis (WCAG 1.4.11).
6. axe : 0 violation sur 64 analyses WCAG (toutes gravités, clair et sombre, EN et FR, 390 et 820 px). Les défauts réels sont ceux qu’axe ne voit pas.
7. Tous les contrôles principaux font 44 px de haut, pas 48 px (règle commune § 10) ; 5 familles descendent sous 44 px (liens d’en-tête 34 px, abréviations 27 × 40 px).
8. L’infobulle d’abréviation s’ouvre au toucher, mais ne se ferme pas à Échap (au focus) et n’est pas survolable (WCAG 1.4.13). Échap au survol quitte la page pleine à la place.
9. Le réglage de taille du texte n’existe qu’en page complète du lecteur. `/reglages` n’est lié nulle part sur le web et ses deux groupes n’ont pas de libellé visible.
10. Première visite : l’exemple en français est un patron en anglais, un dialogue pose une question avant de montrer quoi que ce soit, et une erreur d’import ne propose aucune issue. Pas de débordement horizontal à 200 % ni à 400 %.

## Méthode et limites

- Chromium seul (celui du conteneur, `PW_CHROMIUM`), Playwright. **Pas de WebKit, pas de vrai iPad ni de vrai téléphone** : le « toucher » est une émulation (`hasTouch`, `isMobile`), sans clavier virtuel, sans geste de balayage réel ni zoom au pincement.
- **Pas de lecteur d’écran réel** (ni VoiceOver ni TalkBack ni NVDA) : les noms accessibles viennent de `ariaSnapshot`, le comportement annoncé n’est pas écouté.
- Écrans : 390 × 844, 820 × 1180 (tactiles), 1280 × 800, en EN (`/`) et FR (`/fr`). Zoom 200 % simulé par un viewport de 640 × 400 (400 % : 320 × 256), à `deviceScaleFactor` 1.
- Parcours : première visite, « Voir un exemple », lecteur en page pleine et complète, A / A+ / A++, fond sombre, Mes projets, glossaire, calculateur de cercle, réglages. Service worker bloqué (`serviceWorkers: 'block'`) pour mesurer le réseau à nu.
- Texte sous 16 px et cibles : parcours du DOM (`getBoundingClientRect`, `getComputedStyle`) sur chaque écran et largeur. Les liens en ligne dans un paragraphe sont comptés à part (exception WCAG 2.5.8).
- Contrastes sur dégradé : axe les classe « à vérifier » (232 nœuds) ; mesurés par échantillonnage de pixels (6 points par élément, texte rendu transparent).
- CLS et flash : `PerformanceObserver` et boucle `requestAnimationFrame` dès le démarrage, préférences posées dans `localStorage`, avec et sans CPU ralenti 4× (CDP). Un ralentissement 4× est une approximation d’une tablette, pas une mesure sur tablette.
- Les mesures de ce rapport viennent d’un seul build, d’un seul passage ; les durées de flash (§ I4) varient d’une exécution à l’autre.
- Quatre captures de preuve sont versionnées dans `docs/audit-front-2026-11/` (JPEG, 27 à 82 ko).

## Vérification du pré-audit

| Point                 | Verdict                  | Mesure                                                                                                                      |
| --------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| B1 texte rétréci      | **Confirmé**             | 120 signes : 14 px (390 px, A), 18 px (820 px, A). Voir B-2.                                                                |
| B2 clavier intercepté | **Confirmé, plus grave** | Espace sur « Précédente » : étape +1. Espace sur « Annuler » : dialogue ouvert, étape +1. Voir B-1.                         |
| B3 page pleine        | **Confirmé**             | `data-focus="true"` après tout chargement ; sortie 43 × 44 px, icône seule. Voir B-3.                                       |
| I1 texte < 16 px      | **Confirmé**             | 13 px : 5 familles ; 15 px : 20 familles, dont tous les boutons. Voir I-5.                                                  |
| I2 cibles < 48 px     | **Confirmé**             | Aucun contrôle de formulaire ou bouton à 48 px sauf « Précédente » et « Suivante » (64-68 px). Voir I-4.                    |
| I3 bordure `.input`   | **Confirmé**             | 1,29:1 contre l’intérieur, 1,36:1 contre l’extérieur (clair). Voir B-4.                                                     |
| I4 flash et CLS       | **Nuancé**               | CLS = 0 sur 20 chargements. Flash clair de 234 à 349 ms à CPU 4× (6 cas sur 8), 53 ms à CPU normal (1 cas sur 8). Voir C-4. |
| I5 densité et noms    | **Confirmé**             | 11 commandes en page pleine, 50 en page complète (hors pied de page) ; « − » et « + » ; deux « Reset ». Voir I-6.           |
| I6 jargon             | **Confirmé**             | Voir I-9.                                                                                                                   |
| I7 infobulles         | **Confirmé**             | Toucher : ouvre. Échap : ne ferme pas. Survol de l’infobulle : elle disparaît. Voir I-3.                                    |
| I8 focus et annonce   | **Confirmé**             | Le focus reste sur le lien cliqué ; aucune région vivante ; focus sur `BODY` après un chargement. Voir I-1.                 |
| I9 taille du texte    | **Confirmé, plus grave** | `/reglages` n’est lié que depuis une barre d’onglets masquée sur le web. Voir I-7.                                          |
| C2 en-tête mobile     | **Confirmé**             | 537 px de contenu dans 348 px visibles (EN), 556 px (FR) ; ni fondu ni indice. Voir I-8.                                    |
| Zoom 200 %            | **Nuancé**               | Aucun débordement horizontal ; mais l’étape arrive hors écran. Voir I-2.                                                    |

## Constats

### Bloquants

#### B-1. Espace, PageHaut/Bas et flèches sont volés à tous les contrôles

- **Ce que voit la lectrice** : elle atteint « Précédente » au clavier, appuie sur Espace, et le patron avance. Elle ouvre « Voir un exemple », atteint « Annuler » ou « Étapes écrites », appuie sur Espace : le dialogue reste ouvert et l’étape bouge derrière lui. Sur l’accueil, Espace et PageBas ne font plus défiler la page (End fonctionne). Dans la FAQ, Espace n’ouvre pas la question (Entrée oui).
- **Mesure** (Chromium, 1280 × 800) :

| Geste                                             | Attendu           | Observé                                                              |
| ------------------------------------------------- | ----------------- | -------------------------------------------------------------------- |
| Accueil sans patron : Espace, PageBas, Flèche bas | défilement        | `scrollY` = 0 les trois fois (End : 2780)                            |
| Espace sur `summary` de la FAQ                    | ouvre             | reste fermé (Entrée : ouvre)                                         |
| Espace sur « Written steps » (dialogue)           | choisit           | dialogue ouvert, étape 1 → 2                                         |
| Espace sur « Cancel » (dialogue « Effacer »)      | annule            | dialogue ouvert, étape 1 → 2                                         |
| Espace sur « Next »                               | étape +1          | étape +1 (le clic du bouton est supprimé, le gestionnaire seul agit) |
| Espace sur « Previous »                           | étape −1          | **étape +1**                                                         |
| Espace sur « Reset » (répétitions)                | remet à zéro      | étape +1 ; le bouton n’est pas activé                                |
| Échap dans le dialogue de l’exemple               | ferme le dialogue | ferme **et** quitte la page pleine                                   |

- **Cause** : `reader-page.ts:425` (`'(document:keydown)'`) et `:728-756`. Seuls `TEXTAREA` et `INPUT` sont exclus, avec les touches de modification. `preventDefault()` sur Espace supprime l’activation native du bouton. L’Échap vient de `step-view.ts:36` et `:257-259` : la garde `event.defaultPrevented` ne voit pas la fermeture d’un `<dialog>` natif, qui n’est pas le défaut du `keydown`.
- **Correction** : n’agir que si la cible est `body` ou le conteneur du lecteur ; laisser passer `button`, `a`, `summary`, `select`, `[role]`, tout ce qui est dans un `dialog[open]` ; ne rien intercepter tant qu’aucun patron n’est chargé. Pour Échap, ignorer l’événement si un `dialog[open]` existe. Tests : une boucle sur chaque type de cible, plus un test « Espace sur Précédente ne fait pas avancer ».
- **Effort** : S. **Choix de design** : non.

#### B-2. Le texte de l’étape rétrécit jusqu’à devenir illisible, au milieu de l’espace vide

- **Ce que voit la lectrice** : une étape de plus de 30 signes passe à 80 %, plus de 60 à 60 %, plus de 90 à 50 % de la taille normale. Les rangs réels dépassent souvent 90 signes (« Round 14: sc in next 3 sts, 2 sc in next st, repeat from * to end… »). Le texte devient plus petit que les boutons, alors que c’est ce qu’on lit à un mètre.
- **Mesure** (taille calculée de `.step-body`, en px, `fil.textSize` posé) :

| Signes | 390 px, A | A+   | A++ | 820 px, A | A+   | A++  |
| ------ | --------- | ---- | --- | --------- | ---- | ---- |
| 30     | 28        | 34   | 40  | 36,1      | 45,9 | 57,4 |
| 60     | 22,4      | 27,2 | 32  | 28,9      | 36,7 | 45,9 |
| 90     | 16,8      | 20,4 | 24  | 21,6      | 27,6 | 34,4 |
| 120    | **14**    | 17   | 20  | **18**    | 23   | 28,7 |

(45 et 60 signes tombent dans la même classe ; 75 et 90 aussi.) À 390 px en A, un rang de 120 signes (14 px) est plus petit que le libellé d’un bouton (15 px). L’exemple intégré en est la preuve : son étape 7 (« [sc, dec] x 6 (12) Attach safety eyes… ») s’écrit à 18,04 px quand les autres font 36,08 px, avec environ 370 px libres au-dessus du texte et 450 px au-dessous (capture `02-exemple-etape-7-820.jpg`). À 390 px, un rang de 120 signes (`01-etape-120-signes-390.jpg`) occupe 3 lignes de 14 px.

- **Cause** : `lecteur.css:444-463` (`.step-block` réserve deux lignes ; `.long`, `.longer`, `.longest`) et `step-view.ts:26-28, 275-281` (seuils 30, 60, 90). Le rétrécissement sert à garder « Précédente » et « Suivante » immobiles (garde de la fiche 24), mais en page pleine la place existe : environ 150 px vides à 390 px, plus de 800 px à 820 px.
- **Correction** : supprimer les paliers de taille. Garder `--reader-step` quelle que soit la longueur, laisser l’étape occuper la hauteur disponible, et faire défiler l’étape à l’intérieur de son bloc au-delà de la place restante. Plancher de sécurité : jamais sous 24 px à 390 px et 28 px à 820 px. Revoir `e2e/reading-mode.spec.ts` (`.step-body` sous 450 px à 820 × 1180) et ajouter un test sur les 4 longueurs × 3 tailles × 2 largeurs.
- **Effort** : M. **Choix de design** : oui (Q1).

#### B-3. La page pleine s’impose et sa sortie est un cercle de trois points

- **Ce que voit la lectrice** : après « Voir un exemple » ou « Découper en étapes », tout l’écran est remplacé par l’étape : plus d’en-tête, plus de taille du texte A / A+ / A++, plus de choix de pièce (Arbre / Tronc / Étoile), plus de partage. La seule issue est un bouton rond « ⋯ » de **43 × 44 px**, sans texte, nommé par `aria-label` seul ; Échap fait la même chose, mais une tablette n’a pas de clavier. Rien n’explique le mode la première fois.
- **Mesure** : `data-focus="true"` dès le chargement (`display-prefs.service.ts:33`, `signal(true)`) ; en page pleine, `ariaSnapshot` ne contient ni `header`, ni `nav`, ni sélecteur de taille. Le bouton porte `aria-pressed="true"` **et** un libellé qui change (« Quitter la page pleine » / « Page pleine ») : un lecteur d’écran annonce « Quitter la page pleine, bouton à bascule, enfoncé », ce qui se contredit. En page complète, le même bouton est un texte (« Page pleine »), à un autre endroit visuel.
- **Cause** : `step-view.ts:86-101` (bouton) et `:92` (`aria-pressed` + libellé variable).
- **Correction** : (a) garder la sortie visible avec un libellé (« Quitter » ou « Page complète ») ; (b) ne pas retirer la taille du texte de la page pleine ; (c) retirer `aria-pressed` ou garder un libellé fixe ; (d) première fois seulement, une ligne « Page pleine : touchez Quitter pour revenir ».
- **Effort** : M. **Choix de design** : oui (Q2).

#### B-4. La bordure des champs est quasi invisible

- **Ce que voit la lectrice** : le grand champ « Texte du patron », le filtre du glossaire et le nombre de rangs du cercle ne se distinguent presque pas du fond ; le texte d’exemple (placeholder) ressemble à du texte déjà saisi.
- **Mesure** (pixels de la capture, bordure de 2 px) : clair, bordure `rgb(227, 215, 205)` contre intérieur `rgb(250, 244, 237)` = **1,29:1**, contre extérieur `rgb(255, 250, 243)` = **1,36:1** ; sombre, 1,60:1 et 1,47:1. Il faut 3:1 (WCAG 1.4.11, AA). axe ne contrôle pas ce critère.
- **Cause** : `hanami.css:307` (`border: 2px solid var(--color-line)`), `tokens.css:24` et `:145`. `--color-line` est fait pour des filets décoratifs, pas pour des champs.
- **Correction** : un jeton `--color-line-strong` dédié aux champs, cases et segments : valeurs candidates `#8a7d72` (3,66:1 contre `#faf4ed`) en clair et `#7a7699` (3,34:1 contre `#2a273f`) en sombre. Garder 2 px. Vérifier `.input`, `select`, la case à cocher et `.seg`.
- **Effort** : S. **Choix de design** : oui (Q3, teinte).

### Importants

#### I-1. Aucun focus ni annonce quand la page change ou que le patron se charge

- **Ce que voit la lectrice** (au lecteur d’écran ou au clavier) : elle active « Glossaire » : la page change, le focus reste sur le lien de l’en-tête, aucune région vivante n’annonce la nouvelle page (le titre du document change, `<title>`, c’est tout). Après « Découper en étapes » ou la fermeture du dialogue de l’exemple, `document.activeElement` est `BODY` : elle repart du début de la page. Le lien d’évitement fonctionne (focus sur `main`).
- **Mesure** : `activeElement` = `A.active "Glossary"` après navigation ; `lives` vide ; après chargement, `BODY`. Le seul `aria-live` de l’accueil est le message d’état vide (« Paste or type your pattern… »), lu dès l’arrivée.
- **Correction** : à chaque `NavigationEnd`, annoncer le `<h1>` (région `aria-live="polite"` dans la coquille) et, sur un changement de page déclenché au clavier, déplacer le focus sur le `<h1>` (`tabindex="-1"`). Après chargement d’un patron, focus sur l’étape (`.step-body`, déjà `tabindex="-1"`) ou sur « Suivante ». Après fermeture d’un dialogue, rendre le focus à l’élément déclencheur quand il existe.
- **Effort** : S-M. **Choix de design** : non.

#### I-2. À 200 % de zoom, l’étape arrive hors écran

- **Ce que voit la lectrice** : à 640 × 400 (1280 × 800 à 200 %), on clique « Voir un exemple » depuis le bas de l’accueil (le bouton est sous la ligne de flottaison) ; la page pleine s’ouvre **scrollée de 248 px** (`scrollY` = 248, étape à −174 px) et ne montre que les compteurs. À `scrollY` 0, étape à 74 px et « Suivante » à 336 px : tout tient, de justesse.
- **Mesure** : à 390 × 844 et 820 × 1180 le document tient dans la fenêtre (`scrollHeight` = 844 / 1180) et le défilement retombe à 0 ; en 640 × 400 la page pleine mesure 648 px. À 390 px en A++, la page pleine mesure 866 px (22 px de trop). Aucun débordement horizontal à 200 % ni à 400 % sur les 9 écrans testés.
- **Correction** : `scrollTo(0, 0)` (ou `scrollIntoView` du lecteur) à l’entrée en page pleine ; en page pleine, une hauteur de contenu `100dvh` qui rétrécit les compteurs avant d’imposer un défilement.
- **Effort** : S. **Choix de design** : non.

#### I-3. Infobulles : fermeture et survol (WCAG 1.4.13, AA)

- **Ce que voit la lectrice** : au toucher, l’infobulle s’ouvre (« sc — single crochet ») et se ferme au toucher ailleurs ; elle reste affichée tant qu’on ne touche rien (testé 3 s). Au clavier, le focus l’ouvre, **Échap ne la ferme pas**. À la souris, Échap quitte la page pleine : l’infobulle disparaît seulement parce que la mise en page a bougé. On ne peut pas poser la souris sur l’infobulle (`pointer-events: none`, elle disparaît).
- **Mesure** : cible tactile de l’abréviation : 27 × 40 px (390 px) et 34 × 52 px (820 px). L’infobulle fait 15 px (`lecteur.css:705-722`, `font-size: var(--text-sm)`), 201 × 46 px. La page d’accueil dit « expliquée au survol » (`reader-page.ts:211, 216`), ce qui n’existe pas au doigt.
- **Correction** : `Échap` ferme l’infobulle d’abord (`preventDefault`, puis l’Échap de la page pleine ne se déclenche pas) ; `pointer-events: auto` sur l’infobulle avec un délai de fermeture ; zone tactile ≥ 44 × 44 px autour de l’abréviation (`padding` + marge négative) ; texte « au survol ou au toucher » ; 16 px minimum.
- **Effort** : S-M. **Choix de design** : non.

#### I-4. Cibles tactiles : 44 px partout, 48 px nulle part

- **Mesure** (tous écrans, `getBoundingClientRect`) :

| Famille                                                                  | Taille                                           | Où                         |
| ------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------- |
| Liens de navigation (Lecteur, Mes projets, Glossaire, Préparer, US ↔ UK) | 34 px de haut                                    | en-tête, tous écrans       |
| Logo « Pattern Reader »                                                  | 175 × 32                                         | en-tête                    |
| « Quitter la page pleine »                                               | **43** × 44                                      | page pleine                |
| Abréviations dans l’étape                                                | 27 × 40 ; 34 × 52                                | étape, note                |
| `summary` « Matériel »                                                   | 40 px de haut                                    | lecteur                    |
| Liens de maillage et de pied de page                                     | 18 à 27 px de haut (16 à 87 liens selon l’écran) | accueil, outils, glossaire |
| Boutons, champs, `select`, `summary` de la FAQ                           | 44 à 47 px                                       | partout                    |

Au-dessus de 44 px : « Précédente » et « Suivante » (64-68 px), `summary` de la FAQ (64 px). La règle commune (§ 10) demande 48 px pour ce public ; les icônes de l’en-tête (œil, lune, Discord, langue) sont à 44 × 44 px.

- **Correction** : `--control-size: 48px` (`tokens.css`, aussi le `.tool-slot` du bouton « écran allumé ») ; liens d’en-tête à 44 px au moins (padding vertical) ; liens du maillage listés en `li` avec `padding-block` pour 44 px ; zone tactile des abréviations (voir I-3).
- **Effort** : M (l’en-tête grandit de 10 à 14 px). **Choix de design** : oui (Q4).

#### I-5. Du texte sous 16 px presque partout

- **Mesure** (texte réellement affiché, identique à 390, 820 et 1280 px, non agrandi par A / A+ / A++) :

| Taille  | Éléments                                                                                                                                                                                                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13 px   | pastille d’état (« aucun patron chargé », « 13 étapes découpées »), titres de tuiles (Répétitions, Avancement, Session), date d’ouverture des projets, en-têtes de tableau du glossaire, pastilles US / UK                                                              |
| 13,8 px | `code` des abréviations du glossaire                                                                                                                                                                                                                                    |
| 15 px   | tous les `.btn` (« Voir un exemple », « Découper en étapes »…), liens d’en-tête, libellés de champs, cases à cocher, aides, « Étape 1 / 8 », segments (A / A+ / A++, Texte / Diagramme), cellules du glossaire, pied de page, résumés des cartes du maillage, infobulle |

- **Cause** : `tokens.css:70-71` (`--text-sm` 0,9375 rem, `--text-xs` 0,8125 rem).
- **Correction** : `--text-sm` à 1 rem et `--text-xs` à 0,875 rem au plus bas (réservé aux étiquettes en capitales grasses) ; vérifier que les mises en page à 320 px tiennent (FR plus long).
- **Effort** : S-M. **Choix de design** : oui (Q5).

#### I-6. Densité du lecteur et noms de commandes

- **Mesure** : 11 commandes en page pleine (hors lien d’évitement), 50 en page complète hors pied de page. Noms accessibles : « − » (désactivé) et « + » ; **deux boutons « Reset » / « Remettre à zéro »** (répétitions et chronomètre) identiques ; titres `h6` (Répétitions, Avancement, Session) sans `h1` à `h5` avant eux en page pleine. « Avancement 0 / 13 » et « Étape 1 / 8 » ont deux dénominateurs sans explication (13 = toutes les pièces, 8 = la pièce en cours). Le chronomètre démarre seul au premier « Suivante » (« Pause » apparaît, 0:02 après 2,5 s).
- **Correction** : `aria-label` « Retirer une répétition » / « Ajouter une répétition » et « Remettre les répétitions à zéro » / « Remettre le chronomètre à zéro » ; niveaux de titre cohérents (ou `p` stylé) ; libeller « Pièce : étape 1 sur 8 » et « Total : 0 sur 13 ». En FR, « Remettre à zéro » passe sur deux lignes à 390 px (capture `03-exemple-fr-pleine-390.jpg`) : « Zéro » ou une icône.
- **Effort** : S. **Choix de design** : oui pour le chronomètre (Q9).

#### I-7. Taille du texte et réglages introuvables

- **Ce que voit la lectrice** : A / A+ / A++ n’existe qu’en page complète du lecteur (hors page pleine, voir B-3). `/reglages` contient la taille, le fond sombre, la vue par défaut, la langue, mais son seul lien (`<nav class="tab-bar">`) est **masqué sur le web** (largeur 0) : aucune entrée visible depuis l’accueil, la page est `noindex`. Sur la page, les deux groupes de boutons (A / A+ / A++ ; « Demander / Texte / Diagramme ») n’ont **aucun libellé visible** : `aria-label` seul (capture `04-reglages-390.jpg`). « Demander » n’explique pas ce qu’on lui demande.
- **Correction** : un lien « Réglages » dans l’en-tête ou le pied de page ; libellés visibles « Taille du texte » et « À l’ouverture d’un patron » ; A / A+ / A++ aussi sur l’accueil.
- **Effort** : S. **Choix de design** : oui (Q2 pour la place).

#### I-8. En-tête mobile : 35 % des liens hors de vue

- **Ce que voit la lectrice** : à 390 px, « Lecteur », « Mes projets », « Glossaire » puis « Prépa… » coupé ; « US ↔ UK » est entièrement hors écran. Aucun fondu, aucune ombre, aucun scroll-snap ; la barre de défilement est masquée (`lecteur.css:164-175`). À 820 px, tout tient.
- **Mesure** : `scrollWidth` 537 px pour 348 px visibles (EN), 556 px (FR) : 189 à 208 px cachés. Focus clavier sur le dernier lien : il se met bien en vue (x = 269, visible). L’en-tête occupe environ 110 px (13 % de la hauteur) en deux rangées ; la rangée de liens mesure 34 px. Le conteneur `<nav>` est nommé « Home » / « Accueil » (`site-header.ts:34`, clé `nav.home`), ce qui nomme mal un repère de navigation.
- **Correction** : fondu à droite (`mask-image`) et défilement du lien actif au chargement ; passer « Préparer un patron » et « US ↔ UK » dans le pied de page ou un menu sur mobile ; nom de repère « Principale ».
- **Effort** : S. **Choix de design** : oui (Q6).

#### I-9. Première visite : ce qu’une personne qui ne connaît pas l’outil comprend

- **Ce que voit la lectrice** : l’accueil est clair : titre, paragraphe, quatre garanties, deux boutons à 512 px de haut sur un 390 × 844. Mais :
  1. **L’exemple en français est un patron en anglais** (« Tiny Tree », « Round 1: in magic ring, 6 sc (6) ») ; seules les infobulles sont en français. Sur `/fr`, « Voir un exemple » montre « in magic ring, 6 sc (6) ».
  2. Un dialogue « Comment voulez-vous suivre ce patron ? » (case « Retenir mon choix », « Étapes écrites », « Diagramme ») s’ouvre avant tout. Le bouton **primaire est « Diagramme »**, alors que l’exemple est un texte. Le focus initial est sur la case à cocher.
  3. Le libellé du rang a disparu : « Rounds 5-8 » devient « Étape 5 / 8 » ; l’étape 7 contient la consigne « Attach safety eyes… » collée au rang 10.
  4. Six actions dans le panneau d’import (Découper en étapes, Ouvrir un PDF, Ouvrir un diagramme, Ouvrir une image en grille, Exemple, Effacer) sur 4 lignes à 390 px ; « Exemple » double « Voir un exemple » ; « Effacer » est collé à « Exemple ».
  5. Jargon : « Lecteur » (l’accueil), « Préparer un patron » (la page de mise en forme), « US ↔ UK », « Diagramme », « Pièces ». Le texte d’aide dit « avancer aux flèches ← → ou à la barre d’espace » à des utilisateurs de tablette.
  6. **Erreur d’import** : un patron en paragraphes (« Chain 20. Single crochet… ») renvoie « No numbered rows found… A pattern written as paragraphs can’t be split yet », en texte courant sous les boutons, sans icône ni couleur ni action (`role="alert"` présent, `pattern-import.ts:150`). La case « Remettre en forme avec une IA » est la solution et n’est pas citée. Un patron en français sur la page anglaise se découpe, mais sans aucune infobulle (le glossaire suit la langue du site, pas celle du patron).
- **Correction** : traduire l’exemple (un par langue) ; supprimer le dialogue pour l’exemple (ou « Étapes écrites » en primaire) ; afficher « Rang 5-8 » avec « Étape 5 sur 8 » ; regrouper Ouvrir un PDF / diagramme / image sous un seul « Ouvrir un fichier » ; message d’erreur en `.hint` d’erreur (icône + texte) proposant la mise en forme IA ; retirer les flèches du texte d’aide sur écran tactile.
- **Effort** : M. **Choix de design** : oui (Q7, Q8).

### Confort

#### C-1. Hiérarchie et densité de la page pleine

- 390 px : l’étape (28 px) occupe 36 px sur 844 ; environ 150 px de vide entre la barre et la note, puis trois tuiles et deux boutons. Les tuiles pèsent plus que l’instruction. Sur 820 px, l’étape est à 36 px (A), avec plus de 350 px vides au-dessus et au-dessous. Piste : étape centrée verticalement à 1,5 à 2 fois la taille actuelle, tuiles plus discrètes, « Suivante » seul en couleur pleine.

#### C-2. Repères de page

- Best-practice axe : `page-has-heading-one` (lecteur pleine et complet, EN et FR : plus de `h1` une fois un patron chargé), `region` (24 nœuds, 12 écrans : marque, bouton de langue hors repère, l’en-tête n’est pas un `<header>`), `heading-order` (accueil, les `h6` des tuiles). Aucun n’est dans les étiquettes WCAG demandées. Correction : `<header role="banner">`, un `h1` masqué visuellement dans le lecteur.

#### C-3. Icônes de l’en-tête

- L’œil (« Garder l’écran allumé ») et la lune (« Fond sombre ») sont sans libellé visible ; un œil évoque « afficher / masquer ». À 820 px apparaît aussi un bouton Discord de même poids visuel. Piste : libellés visibles dans `/reglages` (voir I-7) et, sur mobile, l’œil et la lune dans les réglages seulement.

#### C-4. Flash clair en mode sombre et A++ au chargement

- **Mesure** : 20 chargements (2 largeurs × 5 scénarios × 2 vitesses), CLS = 0 partout. Fond sombre et A++ ne sont posés qu’à l’hydratation (`display-prefs.service.ts:38-47`, `afterNextRender`). À CPU normal : préférences appliquées dès la première image dans 7 scénarios sur 8, 53 ms plus tard dans le dernier. À CPU 4× : première image claire et petite, préférences appliquées 234 à 349 ms plus tard dans 6 scénarios sur 8. Le commentaire du service accepte ce flash ; pour une personne qui a choisi le fond sombre à cause de sa vue, 0,3 s de blanc est inconfortable.
- **Correction** : poser `data-dim` et `data-text-size` dans `public/app-mode.js`, script externe déjà chargé avant le premier rendu (`index.html:20`, compatible avec la CSP), sur le modèle de `data-app`.
- **Effort** : S. **Choix de design** : non.

#### C-5. Cohérence FR / EN

- Même structure, aucun débordement horizontal à 390, 820 ou 1280 px en FR (les libellés FR sont plus longs de 10 à 25 %). À corriger : « Remettre à zéro » sur deux lignes (voir I-6), l’exemple (I-9), le `select` du cercle tronqué à 390 px (« Maille serrée (6 augmentations pa »).

#### C-6. Détails de mise en page

- Mes projets : date et durée (« Ouvert le 11 nov. 2026, 08:41 · 0:00 ») en 13 px ; « 0:00 » sans explication ; bouton « Supprimer » sans bordure à côté de « Renommer ». Les cartes sont lisibles.
- À 320 px (400 %), trois liens « A » du glossaire dépassent leur conteneur sans créer de défilement : à revoir.
- Le texte `placeholder` du champ ressemble à une saisie (voir B-4).

## axe

Réglage : `@axe-core/playwright`, étiquettes `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, **toutes gravités**, `reducedMotion: 'reduce'`, attente qu’aucune animation ne soit en cours (`playState`). Écrans : accueil, exemple (dialogue ouvert), lecteur pleine, lecteur complet, Mes projets, glossaire, calculateur de cercle, réglages. Fond clair et sombre (`fil.dim`), EN et FR, 390 et 820 px : 64 analyses.

| Règle                            | Étiquettes                   | Gravité | Analyses touchées | Nœuds                                             |
| -------------------------------- | ---------------------------- | ------- | ----------------- | ------------------------------------------------- |
| (aucune violation)               | WCAG 2.0 / 2.1 / 2.2 A et AA | toutes  | 0 / 64            | 0                                                 |
| `color-contrast` (à vérifier)    | WCAG AA                      | —       | `incomplete`      | 232 (dégradés, éléments partiellement recouverts) |
| `th-has-data-cells` (à vérifier) | WCAG A                       | —       | `incomplete`      | 8                                                 |

Passe supplémentaire `best-practice` (14 analyses, 390 px, clair) : hors étiquettes demandées, donnée à titre indicatif.

| Règle                  | Gravité | Écrans                                  | Nœuds |
| ---------------------- | ------- | --------------------------------------- | ----- |
| `region`               | modérée | 12                                      | 24    |
| `page-has-heading-one` | modérée | 4 (lecteur pleine et complet, EN et FR) | 4     |
| `heading-order`        | modérée | 2 (accueil, EN et FR)                   | 2     |

Contrastes lus à la main sur dégradé (échantillon de pixels, pire des 6 points) : texte courant, liens et titres de tuiles ≥ 7,37:1 en clair et ≥ 10,9:1 en sombre. Le `h1` de l’accueil n’est pas concluant (l’échantillon touche l’illustration). Bordure des champs : 1,29:1 (voir B-4). Le focus clavier est un anneau de 3 px `rgb(107, 95, 168)`, décalé de 2 px : visible.

## Corrections proposées pour le lot 2

Ordonnées par gravité puis par effort ; chacune avec un test qui échoue avant.

1. **B-1** : gestionnaire de clavier limité à `body` / lecteur, sans dialogue ouvert, sans patron vide ; Échap ignoré sous un `dialog[open]`. Test : une boucle sur chaque type de cible. (S)
2. **B-4** : jeton `--color-line-strong` pour champs, cases, segments, mesuré ≥ 3:1 en clair et en sombre ; test de contraste dans `tools/` ou dans `e2e/a11y.spec.ts`. (S)
3. **B-2** : supprimer les paliers `.long` / `.longer` / `.longest`, garder la taille, défilement interne au-delà de la place disponible ; plancher 24 / 28 px ; adapter `e2e/reading-mode.spec.ts`. (M)
4. **B-3** : sortie de page pleine avec libellé, taille du texte conservée, première fois expliquée, plus d’`aria-pressed` contradictoire. (M)
5. **I-1** : annonce de route et focus sur le `h1` ; focus sur l’étape après chargement ; focus rendu au déclencheur après un dialogue. (S-M)
6. **I-3** : Échap ferme l’infobulle, infobulle survolable, zone tactile 44 px, mot « toucher ». (S-M)
7. **I-4** et **I-5** : `--control-size` à 48 px, liens d’en-tête à 44 px, texte secondaire à 16 px. Un seul lot, un seul passage sur les captures et l’e2e à 320 px. (M)
8. **I-7** : lien « Réglages », libellés visibles, A / A+ / A++ sur l’accueil. (S)
9. **I-9** : exemple traduit, dialogue de l’exemple supprimé, libellé de rang conservé, erreur d’import avec issue. (M)
10. **I-2**, **I-6**, **I-8** : retour en haut à l’entrée en page pleine ; noms de commandes distincts ; fondu et nom de repère de l’en-tête. (S chacun)
11. **C-4** : préférences d’affichage dans `public/app-mode.js`. (S)
12. **C-2**, **C-1** : repères de page, hiérarchie de la page pleine, après décision sur Q2. (S-M)

Hors de ce lot : WebKit, vrai iPad, lecteur d’écran réel (à faire sur matériel avant de clore le lot 2).

## Questions à Phil

Choix de design uniquement ; chaque question a une valeur par défaut, appliquée en l’absence de réponse.

1. **Étape longue (B-2)** : quel comportement quand un rang ne tient pas dans la hauteur réservée ? _Par défaut_ : la taille ne baisse jamais (plancher 24 px à 390 px, 28 px à 820 px), « Précédente » et « Suivante » restent ancrées en bas de l’écran, l’étape défile dans son bloc.
2. **Page pleine (B-3, I-7)** : garder le mode par défaut au premier chargement ? _Par défaut_ : oui, mais avec une barre haute qui garde « Quitter » (libellé visible) et « A A+ A++ », plus une phrase d’explication la première fois seulement.
3. **Teinte des bordures de champ (B-4)** : _par défaut_ `#8a7d72` en clair et `#7a7699` en sombre, 2 px conservés.
4. **Cibles (I-4)** : passer toutes les commandes à 48 px, quitte à grandir l’en-tête de 10 à 14 px ? _Par défaut_ : oui, comme l’écrit la règle commune.
5. **Texte sous 16 px (I-5)** : _par défaut_ 16 px pour tout texte lu (boutons, aides, pied de page, infobulle) ; 14 px conservé seulement pour les étiquettes en capitales grasses (« Répétitions »).
6. **En-tête mobile (I-8)** : _par défaut_ garder une ligne défilante avec fondu à droite, et sortir « US ↔ UK » de l’en-tête sur mobile (pied de page).
7. **Exemple (I-9)** : _par défaut_ un exemple traduit par langue (« Petit sapin », « Rang 1 : 6 ms dans un cercle magique (6) »), ouvert directement en « Étapes écrites », sans dialogue.
8. **Libellé du rang (I-9)** : _par défaut_ afficher « Rang 5-8 » en grand et « Étape 5 sur 8 » en petit, au lieu de « Étape 5 / 8 » seul.
9. **Chronomètre (I-6)** : _par défaut_ il ne démarre que sur le bouton ▶ (aujourd’hui : au premier « Suivante »).
