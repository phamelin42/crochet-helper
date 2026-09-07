# 09 — Performance et Core Web Vitals

## Pourquoi

Le référencement récompense la vitesse, et le public consulte souvent sur un
téléphone d'entrée de gamme, en 4G, une main occupée. Le paquet initial fait
aujourd'hui environ 313 ko bruts (86 ko transférés) : c'est correct, ce n'est pas
optimisé.

## Objectif

Mesurer, améliorer ce qui compte, et rendre la régression détectable.

## Fichiers à lire

- `angular.json` (budgets, configuration de production)
- `src/app/app.config.ts`, `src/app/app.routes.ts`
- `src/styles.css` et `src/styles/`
- `package.json`

## À faire

1. **Mesurer d'abord.** `npm run build`, puis Lighthouse en mode mobile sur le
   dossier servi en statique, sur `/`, `/lecteur` et `/glossaire`. Consigne les
   chiffres de départ dans `docs/performance.md`. **Ne change rien avant d'avoir
   ces chiffres** : sans référence, une optimisation est une croyance.
2. Pistes, par gain attendu décroissant — n'applique que celles qui se mesurent :
   - **Police** : `@fontsource-variable/inter` charge la fonte variable complète.
     Vérifier le sous-ensemble chargé, imposer `font-display: swap`, précharger
     le seul fichier utilisé au premier rendu.
   - **CSS critique** : `src/styles.css` est chargé en entier pour toutes les
     pages. Mesurer ce qui sert au-dessus de la ligne de flottaison.
   - **Découpage** : vérifier qu'aucun composant de `features/reader` ne fuit
     dans le paquet initial (`--stats-json` puis analyse).
   - **Décalage de mise en page** : le panneau de diagramme et la zone d'étape
     changent de taille à l'hydratation. Réserver la place.
   - **Hydratation incrémentale** (`@defer (hydrate on …)`) pour les compteurs et
     le panneau matériel, qui ne sont pas visibles au premier écran sur mobile.
3. Resserrer les budgets d'`angular.json` **juste au-dessus** du résultat
   obtenu, pour qu'une régression casse le build plutôt qu'un tableau de bord.
4. Ajouter au workflow CI une étape qui échoue si le paquet initial dépasse le
   budget (le build le fait déjà : vérifie que l'étape n'est pas silencieuse).

## Critères d'acceptation

- `docs/performance.md` : chiffres avant / après par page et par métrique
  (LCP, CLS, TBT, poids transféré), et pour chaque changement, le gain mesuré.
- Un changement sans gain mesurable est **retiré**, pas conservé « au cas où ».
- LCP mobile simulé sous 2,0 s et CLS sous 0,05 sur les trois pages.
- Aucune régression fonctionnelle : les tests des fiches 02 et 07 passent.
- `npm run verify` vert.

## Hors périmètre

Changer d'hébergeur, ajouter un CDN, ou introduire une dépendance de mesure en
production. Aucun outil d'analyse d'audience : le produit ne piste personne.
