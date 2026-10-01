# Micro-produits — workspace Angular

> Ce fichier fait autorité pour toute intervention sur ce workspace. Rôle et
> périmètre de l'agent : `AGENTS.md`. Workflow et checklist de PR :
> `CONTRIBUTING.md`. Ce qui est propre à un produit : `projects/<slug>/PRODUIT.md`.

## Ce que c'est

Dix micro-produits web, un par semaine, chacun visant 200 à 500 € par mois :
c'est l'addition qui fait le revenu. L'acquisition repose **entièrement sur
le référencement naturel** : chaque produit répond à une requête que les gens
tapent déjà (`produits.json` → `requete`).

## Architecture : un template, N produits

Un nouveau produit se crée en une journée, pas en une semaine.

```
produits.json        table des produits : configuration de chacun (schematic)
libs/core/           @mp/core — analytics, SEO, stockage, plateforme (PWA, thème), configuration, offre
libs/ui/             @mp/ui — coquille (en-tête, pied de page, installation, mise à jour, thème)
                     @mp/ui/sections — héros, blocs, FAQ, offre (pages paresseuses)
                     @mp/ui/legal — mentions légales, confidentialité
libs/ui/styles/      tokens.css (jetons) · base.css (classes) · print.css
projects/<slug>/     un produit : produit.json, contenu.json, src/app/metier/, PRODUIT.md
projects/vitrine/    vitrine interne des composants partagés (jamais publiée)
schematics/produit/  génération d'un produit
tools/               build, contrôles, icônes, rapport mensuel
e2e/                 audit Playwright de chaque application construite
prompts/<slug>/      fiches de chaque produit
docs/                ADR, tunnel, contenu unique, lancement
```

- **Seul le module métier est unique par produit**
  (`projects/<slug>/src/app/metier/`) : la logique du calculateur, du
  générateur ou du suivi. Tout le reste est mutualisé dans `libs/`.
- **Thématisation par configuration** : couleurs, typographie, logo, nom,
  domaine, offre viennent de `projects/<slug>/produit.json`. La coquille
  (`mp-shell`) pose le thème en propriétés CSS ; aucun composant n'est
  dupliqué ni surchargé pour changer l'apparence. Clair par défaut ; le
  sombre est optionnel (`theme.sombre`) et explicite (bouton), jamais
  déclenché par `prefers-color-scheme`.
- **Génération** : `npm run nouveau-produit -- <slug>` crée l'application
  depuis sa ligne de `produits.json` — squelette, configuration, routes,
  instrumentation branchée, contenu à rédiger, fiches, entrée d'`angular.json`.
  Le build, l'audit et le rapport mensuel la prennent en compte d'eux-mêmes.
- **Dépendances** : `projects` → `@mp/ui` → `@mp/core`, jamais l'inverse,
  jamais d'un produit vers un autre, jamais `libs/` par chemin relatif depuis
  un produit (ESLint le refuse). Un composant utile à deux produits monte
  dans `libs/ui` et entre dans la vitrine (`tools/check-vitrine.mjs`).
- **Points d'entrée séparés** : `@mp/ui` (coquille, premier affichage),
  `@mp/ui/sections` et `@mp/ui/legal` (pages paresseuses). Réexporter les
  sections depuis `@mp/ui` les mettrait toutes au bundle initial.

## Exception non négociable : le contenu éditorial est unique par produit

Dix sites de même structure ne posent aucun problème à Google ; dix sites aux
textes génériques quasi identiques sont traités comme du contenu dupliqué à
grande échelle. Sont donc rédigés pour chaque produit, dans son
`contenu.json` : l'accueil, les explications, les exemples, l'aide et la FAQ,
et dans `produits.json` sa meta description.

- Les bibliothèques ne contiennent **aucun texte rédigé** : des libellés
  courts (« Installer l'application », « Questions fréquentes ») et les pages
  légales, communes et donc `noindex`. Le pied de page n'a pas de phrase.
- `tools/check-contenu.mjs` fait échouer le build si deux produits partagent
  une phrase de huit mots ou plus, ou si leurs textes se ressemblent trop.
- `npm run lancement -- <slug>` refuse un produit qui a encore un texte
  « À RÉDIGER », moins de 300 mots d'accueil ou moins de quatre questions.
- Détails : `docs/contenu-unique.md`.

## Contraintes non négociables

1. **Aucun back-end.** Calcul, état, persistance (IndexedDB par
   `KvStoreService`, `localStorage` pour les préférences), génération de PDF
   ou d'iCal : tout dans le navigateur. Build statique (`outputMode: 'static'`).
   Ni serveur, ni appel réseau, ni clé d'API sans ADR. Seule exception, la
   mesure d'audience (`docs/adr-001-mesure-audience.md`). Le paiement attend
   son ADR : `libs/core/src/offre` ne fait que mesurer l'intérêt.
2. **Tout est pré-rendu.** Chaque route existe en HTML complet ;
   `tools/check-prerender.mjs` fait échouer le build sinon. Le code qui touche
   au DOM, au stockage ou à `navigator` est gardé par `isPlatformBrowser` ou
   `afterNextRender`.
3. **PWA** : manifeste, service worker natif (`UpdateService`, sans
   `@angular/service-worker` côté page), invite d'installation dans l'en-tête,
   fonctions de base hors ligne (`tools/check-pwa.mjs`).
4. **Les données de la personne ne quittent pas l'appareil.** Une écriture
   IndexedDB n'est réussie qu'au `complete` ; on n'efface jamais une ancienne
   copie sur la foi d'une écriture non confirmée ; écritures liées = une
   transaction (`writeMany`).
5. **Le texte n'est jamais du HTML** : ni `innerHTML` ni `bypassSecurityTrust*`.
   Le contenu éditorial est du texte brut rendu en paragraphes.
6. **Aucune valeur brute de style** : jetons de `tokens.css`, classes de
   `base.css`. Ni `styles:`, ni `style="…"`, ni liaison de style hors de la
   coquille (`tools/check-styles.mjs`).
7. **Français à la racine** de chaque produit ; une version anglaise viendrait
   sous `/en`, jamais d'un état stocké.

## Stack et commandes

Angular 22 (standalone, signaux, zoneless, `@Service()`), pré-rendu
`@angular/ssr`, Vitest, ESLint, Prettier, Playwright + axe. Node 24.

| Commande                            | Rôle                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| `npm run nouveau-produit -- <slug>` | crée un produit depuis `produits.json`                          |
| `npx ng serve <slug>`               | serveur de développement d'un produit                           |
| `npm run build [-- <slug>]`         | build, pré-rendu, sitemap, `ngsw.json` et contrôles             |
| `npm run test:ci`                   | tests unitaires de chaque projet (bibliothèques via la vitrine) |
| `npm run test:tools`                | tests des scripts et du schematic                               |
| `npm run verify`                    | lint + format + tests + build                                   |
| `npm run verify:ci`                 | `verify` puis l'audit Playwright : **ce que lance la CI**       |
| `npm run icones -- <slug>`          | PNG du manifeste depuis le logo du produit                      |
| `npm run lancement -- <slug>`       | ce qui manque avant la mise en ligne                            |

**Une tâche n'est pas terminée tant que `npm run verify:ci` n'est pas vert.**
`npx playwright test` seul sert le dernier `dist/`, pas le code du moment.

## Mesure

Umami sans cookie (aucun bandeau), un site par produit ; Search Console pour
les requêtes. Les noms d'événements sont **communs à tous les produits**
(`libs/core/src/analytics/evenements.ts`), pour que les rapports se
comparent ; un nom se déclare aussi dans `EVENEMENTS` de `tools/umami.mjs`
(`tools/evenements.test.mjs`). Tunnel et seuils : `docs/tunnel.md`.

## Conventions Angular

- Standalone, sans `standalone: true` ni `changeDetection` explicites.
- `input()`, `output()`, `model()`, `computed()`, `linkedSignal()` ; jamais
  `mutate`. Contrôle de flux natif. `host: {}` plutôt que `@HostBinding`.
  `inject()`. `@Service()` pour les singletons. Signal Forms.
- Préfixe `mp-` dans les bibliothèques, `app-` dans un produit (ESLint).
- SVG : `<img>` natif avec `width` et `height`, pas `NgOptimizedImage`
  (5,5 ko au bundle initial). Pas de `@defer` (5,6 ko) : `import()` suffit.
- Accessibilité : axe sans violation sur chaque page de chaque application,
  WCAG AA, cibles de 48 px, reflow à 320 px.

## Pièges hérités de Pattern Reader

- Un test décrit ce que la personne doit obtenir, pas ce que le code fait.
- Persistance : attendre l'écriture (`vi.waitFor`) puis relire par le service.
- Toute entrée venant d'un tiers est bornée en taille ; invalide → `null`.
- Une action destructive passe par une confirmation.
- Une nouvelle page est reliée ; une page `noIndex` ne va pas au sitemap.
- Bundle initial : la coquille seule. Le budget d'`angular.json` est une
  alarme avec de la marge ; on ne le resserre jamais au plus juste.
- Un événement émis depuis un `effect` arrive un tour plus tard que le clic.
- Un garde-fou non branché ne garde rien : tout contrôle tourne dans
  `verify:ci`.
- Une liste de valeurs (produits, formats, typographies) est testée en
  entier, en boucle.
- Impression : vérifier sur un vrai PDF, pas sur `innerText`.
- Prettier lit `__x__` comme du gras en Markdown et coupe un marqueur nu dans
  le CSS : le schematic ne substitue que `__SLUG__`, dans du code et de la
  configuration, et écrit les textes en JSON.

## Économie de tokens

Lire les fichiers listés par la fiche ; le reste par `grep -n`. Tests ciblés
pendant le travail (`npx ng test <projet> --no-watch`), un seul `verify:ci` à
la fin.
