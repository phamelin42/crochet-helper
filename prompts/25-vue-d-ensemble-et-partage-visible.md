# 25 — Vue d'ensemble du patron, partage et impression visibles

**Étape d'entonnoir servie : rétention (retrouver son rang) et acquisition (le
partage, seule boucle qui amène une deuxième lectrice).**

## Pourquoi

Audit UX-3 et UX-4 (`docs/audit-ux-acquisition-2026-09.md`) : aucune liste des
étapes, aucun saut à un rang (`goTo` existe dans le magasin, sans interface),
pas de barre de progression près de l'étape ; retrouver le rang 34 après une
pause coûte 33 clics. « Copier le lien » et « Envoyer ce projet » n'apparaissent
qu'en rouvrant le panneau d'import, et la vue d'impression (`print-view.ts`,
`print.css`) n'a aucun bouton : la seule boucle qui amène une deuxième lectrice
(`project_shared`) est introuvable.

## Objectif

Depuis l'écran de lecture (fiche 24) : voir où l'on en est dans la pièce,
sauter à n'importe quelle étape, et trouver en un coup d'œil « Copier le
lien », « Envoyer ce projet » et « Imprimer ».

## Fichiers à lire

- `src/app/features/reader/state/reader-store.ts` — `goTo`, `progress`,
  `doneCount`, `absoluteStep`, `positionKey`, `stepCount`
- `src/app/features/reader/components/step-view.ts`, `reader-counters.ts`,
  `pattern-import.ts` (les deux liens et leurs `effect`), `print-view.ts`
- `src/app/shared/ui/disclosure/disclosure.ts`, `src/app/shared/ui/field/`
- `src/styles/lecteur.css` (`.meter`, `.progress`, `.steps`, `.navrow`) et
  `src/styles/print.css`
- `e2e/pattern-link.spec.ts`, `e2e/project-link.spec.ts` — ils cliquent les
  boutons dans le panneau d'import : à mettre à jour
- `CLAUDE.md`, « Pièges » : `TooltipService.isStationaryHover`, événement émis
  dans le gestionnaire, toute API navigateur par `core/platform`

## À faire

1. **Liste des étapes.** Sous Précédente / Suivante, un `Disclosure` « Toutes
   les étapes de <pièce> », replié par défaut, contenant un `<ol>` : une entrée
   par étape de la pièce en cours, avec son libellé (`step.label` ou son
   numéro), un début de texte tronqué (environ 60 caractères) et un marqueur
   « terminée » d'après `done`. L'étape en cours porte `aria-current="step"`.
   Chaque entrée est un `<button>` qui appelle `store.goTo(n)`, referme le
   panneau et ramène le focus sur `.step-body`. Les autres pièces se
   choisissent avec le `Segmented` existant (`.pieces`).

2. **Aller à l'étape n°.** Dans le même panneau, un `InputField` numérique et
   un bouton « Aller », bornés entre 1 et `stepCount()` ; une valeur hors bornes
   est ramenée dans les bornes (comportement de `goTo`), jamais d'erreur
   technique.

3. **Progression près de l'étape.** « Étape 2 / 13 » et la barre de progression
   en fil retors (`.meter`) juste au-dessus de l'étape, dans `StepView`.
   `ReaderCounters` garde le compte des étapes terminées et la session. La
   case « Étape terminée » reste telle quelle : changer sa sémantique est hors
   périmètre.

4. **Actions visibles.** Une rangée d'actions sous la liste des étapes :
   « Copier le lien du patron », « Envoyer ce projet », « Imprimer », « Changer
   de patron ». La logique des deux liens (encodage, tickets,
   `MAX_LINK_LENGTH`, messages « trop long » et « copié », texte d'aide) sort de
   `PatternImport` vers un composant `components/share-actions.ts`, utilisé à
   un seul endroit : les boutons disparaissent du panneau d'import. Textes
   inchangés (`reader-copy.ts`). « Imprimer » appelle `window.print()` à travers
   `core/platform` (nouveau `PrintService`, ou méthode d'un service existant),
   jamais `window` directement dans la fonctionnalité. « Changer de patron »
   ouvre le panneau d'import et y amène le focus.

5. **Décision liens courts** (audit, décision 1) : cette fiche ne la présuppose
   pas. Le message « trop long pour tenir dans un lien » reste. Si un service
   de liens courts est retenu un jour, il remplacera ce message dans une fiche
   dédiée, avec son ADR.

## Mesure

- `step_jumped` avec `origin: 'list' | 'field'` ;
- `print_opened`.

Déclarés dans `AnalyticsEvent` **et** `EVENEMENTS`. `project_shared` reste émis
au clic de « Envoyer ce projet », où qu'il soit.

## Tests

- `step-view` ou un `steps-list.spec.ts` : la liste a autant d'entrées que
  `stepCount()`, l'étape courante porte `aria-current`, un clic appelle `goTo`
  avec le bon numéro, le champ ramène 0 et 999 dans les bornes.
- `share-actions.spec.ts` : bouton désactivé au-delà de `MAX_LINK_LENGTH`,
  message « copié », échec du presse-papiers → message d'erreur, pas
  d'exception ; `project_shared` émis une fois par copie réussie.
- e2e : `pattern-link.spec.ts` et `project-link.spec.ts` cliquent les boutons
  **sans rouvrir le panneau d'import** ; nouveau cas : ouvrir la liste, cliquer
  la 5e étape → `.step-body` contient le texte de la 5e étape de l'exemple.
- Impression : `page.pdf()` sur l'exemple produit au moins une page qui
  contient le titre du patron (compter `/Type /Page`, jamais `innerText`).

## Critères d'acceptation

- `npm run verify:ci` vert, bundle initial inchangé (tout vit dans le chunk du
  lecteur).
- Sur tablette, la liste dépliée d'un patron de 150 étapes reste fluide
  (`@for` avec `track`, pas de recalcul par entrée).
- axe vert : `aria-current`, libellés des boutons, ordre des titres.

## Hors périmètre

Supprimer ou changer le sens de « Étape terminée » (le compte `done` alimente
la progression, la sauvegarde et le lien de projet : c'est une migration de
données) ; le défilement virtuel ; les liens courts (décision 1) ; le partage
natif (`navigator.share`) ; le partage de l'image ; des notes par étape.
