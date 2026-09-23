# 22 — Une ligne discrète pour la liste d'attente

**Étape d'entonnoir servie : revenu.**

## Pourquoi

Le lot 8 (paiement) ne se décide qu'avec un signal : une liste d'attente d'au
moins 50 personnes, ou 1 000 visiteuses par mois. Pour le lire, il faut poser
la question à celles qui utilisent vraiment l'outil — pas sur l'accueil, mais
dans le lecteur, une fois qu'elles ont lu quelques étapes.

## Objectif

À partir de la **troisième étape lue** d'un projet, une ligne discrète sous les
commandes du lecteur propose un lien externe vers le formulaire Tally. Si
l'URL est vidée, rien ne s'affiche.

## Décision déjà prise

URL du formulaire, choisie par Phil le 23/09/2026 : `https://tally.so/r/A7Z2ve`.
Elle vit dans une constante ; la vider rend le composant inerte (pas de lien,
pas d'événement). Aucune autre URL, même d'exemple, dans le code livré.

## Fichiers à lire

- `src/app/features/reader/pages/reader-page.ts` — où sont les commandes
- `src/app/features/reader/data/reader-copy.ts` — textes du lecteur
- `src/app/core/analytics/analytics.service.ts`, `tools/umami.mjs`
- `src/styles/lecteur.css` — une classe existante convient-elle ?

## Contrat

1. `src/app/features/reader/data/waitlist.ts` :

   ```ts
   /** Formulaire externe de la liste d'attente. Vide = rien ne s'affiche. */
   export const WAITLIST_URL = 'https://tally.so/r/A7Z2ve';
   ```

2. Texte, exactement :
   - EN : « A version that syncs between devices for €29/year — interested? »
   - FR : « Une version synchronisée entre vos appareils, 29 € par an —
     intéressée ? » (espaces insécables avant `?` et dans `29 €`)

   Le lien porte le texte « Tell me more » / « En savoir plus », `target="_blank"`,
   `rel="noopener"`. Ligne affichée si `WAITLIST_URL` est non vide **et** que la
   position absolue dans le projet courant est ≥ 3. Une croix (`Button`
   existant, libellé accessible « Masquer » / « Hide ») la masque pour de bon
   (`LocalStorageService`, clé `fil.waitlistHidden`).

3. Événements `waitlist_shown` (une fois par projet) et `waitlist_clicked`, dans
   `AnalyticsEvent` **et** `EVENEMENTS`.

4. Style : classes existantes, sinon une classe dans `lecteur.css` avec des
   `var(--…)` ; la ligne ne doit ni pousser l'étape courante ni capter le focus.

## Tests

- URL vide (injectée dans le test) : rien dans le DOM, aucun événement.
- URL renseignée (injectée dans le test) : absente aux étapes 1 et 2, présente à 3.
- Masquée : ne revient pas après rechargement.
- Le lien ne part que vers l'URL configurée ; aucune requête réseau à l'affichage.

## Critères d'acceptation

- `npm run verify` vert ; bundle initial sous l'avertissement d'`angular.json`.
- Audit axe vert sur le lecteur chargé **à l'étape 3 ou au-delà**, là où la
  ligne est visible (ajouter ce cas à `e2e/a11y.spec.ts`).
- La CSP n'est pas modifiée : un lien sortant n'est pas un appel réseau.

## Hors périmètre

La synchronisation elle-même, tout paiement, compte, formulaire intégré à la
page, toute collecte d'adresse e-mail dans le site.
