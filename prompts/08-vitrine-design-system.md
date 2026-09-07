# 08 — Vitrine du design system

## Pourquoi

Les composants réutilisables existent (`shared/ui/`) mais rien ne les montre
ensemble. Résultat : on ne sait pas ce qui existe, et on réécrit un bouton.
Une page qui les expose tous est le moyen le moins coûteux d'empêcher ça.

## Objectif

Une page interne `/design-system`, **non indexée**, qui présente chaque jeton et
chaque composant dans tous ses états.

## Fichiers à lire

- `src/styles/tokens.css`
- `src/styles/nocturne.css`
- Tous les fichiers de `src/app/shared/ui/`
- `src/app/features/glossary/glossary-page.ts` (structure d'une page)
- `src/app/app.routes.ts`, `src/app/core/i18n/route-paths.ts`

## À faire

1. `src/app/features/design-system/design-system-page.ts`, route
   `/design-system` **en français uniquement** (pas de version anglaise : c'est
   une page d'équipe). `SeoService.apply({ ..., noIndex: true })`.
2. Sections, dans cet ordre :
   - **Jetons** : pastilles de couleur avec le nom du jeton et sa valeur calculée
     (`getComputedStyle`, dans un `afterNextRender`), échelle typographique de h1
     à h6, échelle d'espacement, les trois rayons, les trois ombres.
   - **Composants** : `Button` (trois variantes × normal / survol / désactivé /
     icône seule / pleine largeur / grande cible), `InputField` (champ, zone de
     texte, invalide, désactivé), `Checkbox`, `Segmented` (deux et cinq options),
     `Tile`, `Progress` (0 %, 37 %, 100 %), `Disclosure`, `Dialog`, `Icon` (la
     grille complète avec le nom de chaque icône), l'infobulle du glossaire.
   - **Usage** : pour chaque composant, le fragment de gabarit à copier, dans un
     `<pre>`. Écris ces fragments à la main : ne tente pas de les extraire du
     code à l'exécution.
3. Un sélecteur normal / assombri en haut de page, qui bascule `ThemeService`,
   pour vérifier les deux thèmes d'un coup d'œil.
4. Ajouter un lien vers cette page depuis `CLAUDE.md`, section design system.

## Critères d'acceptation

- La page rend chaque composant exporté par `shared/ui/` — vérifie la liste
  fichier par fichier, il n'en manque aucun.
- `<meta name="robots" content="noindex, nofollow">` dans le HTML pré-rendu de
  `/design-system`, et la page **n'apparaît pas** dans `sitemap.xml` (adapter
  `tools/generate-sitemap.mjs` : exclure les routes marquées `noindex`).
- Aucun style local en dehors de la grille de la vitrine elle-même : la page
  consomme le design system, elle ne le redéfinit pas.
- `npm run verify` vert.

## Hors périmètre

Storybook, ou toute autre dépendance : la vitrine est une page de l'application,
c'est ce qui garantit qu'elle ne diverge jamais du produit.
