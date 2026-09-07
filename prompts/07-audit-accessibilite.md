# 07 — Audit d'accessibilité WCAG 2.1 AA

## Pourquoi

L'application s'utilise les mains prises, souvent en agrandissant beaucoup, et
son public inclut des personnes âgées. L'accessibilité n'est pas une case à
cocher ici, c'est la fonctionnalité principale.

## Objectif

Auditer, corriger, et empêcher les régressions.

## Fichiers à lire

- `src/app/shared/ui/` (tous)
- `src/app/features/reader/components/` (tous)
- `src/app/shared/layout/site-header.ts`
- `src/styles/nocturne.css`, `src/styles/tokens.css`

## Méthode

1. Installer `@axe-core/playwright` en dépendance de développement, plus
   Playwright. Écrire `e2e/a11y.spec.ts` qui, sur le build de production servi
   en statique, passe axe sur les six routes, en thème normal et assombri.
   Ajouter le script `npm run test:a11y`.
2. Auditer **à la main** ce qu'axe ne voit pas :
   - parcours au clavier seul, de la première tabulation à la dernière : ordre
     logique, focus toujours visible, aucun piège ;
   - le lien d'évitement fonctionne et amène bien sur `<main>` ;
   - l'infobulle du glossaire est atteignable au clavier et au toucher, et son
     contenu est annoncé ;
   - le changement d'étape est annoncé une fois (pas à chaque frappe) par les
     lecteurs d'écran ;
   - la boîte de zoom : focus piégé, retour au bouton d'ouverture à la fermeture ;
   - zoom navigateur à 200 % et à 400 % : aucun contenu coupé, aucun défilement
     horizontal ;
   - `prefers-reduced-motion` respecté ;
   - contraste de **toutes** les paires texte/fond, y compris `.hint`,
     `.piecename`, `figcaption` et le texte désactivé, dans les deux thèmes.
3. Corriger. Si un contraste est insuffisant, **corrige le jeton** dans
   `tokens.css` plutôt que le cas particulier, et signale l'écart au design.

## Critères d'acceptation

- `npm run test:a11y` : zéro violation axe de gravité `serious` ou `critical`
  sur les six routes, dans les deux thèmes.
- Un rapport `docs/accessibilite.md` : ce qui a été vérifié, ce qui a été
  corrigé, et les points restants avec leur raison.
- Toute correction de contraste passe par un jeton, avec le rapport calculé en
  commentaire.
- `npm run verify` vert.

## Hors périmètre

Refondre le design. Si une correction demanderait de changer la maquette,
documente-la dans le rapport au lieu de l'appliquer.
