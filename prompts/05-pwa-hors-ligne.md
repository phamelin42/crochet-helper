# 05 — Fonctionner hors ligne, et s'installer

## Pourquoi

On crochète dans le train, au chalet, chez quelqu'un. L'application n'a aucun
besoin du réseau une fois chargée : tout est statique et tout l'état est local.
Ne pas fonctionner hors ligne est un défaut, pas une limite.

## Objectif

Installer le service worker d'Angular, servir toutes les pages pré-rendues hors
ligne, et rendre l'installation possible depuis le navigateur.

## Fichiers à lire

- `angular.json`
- `src/app/app.config.ts`
- `public/manifest.webmanifest`
- `src/index.html`

## À faire

1. `ng add @angular/pwa` puis **relire ce qu'il a écrit** : il remplace le
   manifeste et ajoute des icônes. Conserve le manifeste existant (nom, couleurs,
   `start_url: /lecteur`, `lang`) en y intégrant seulement les icônes générées.
2. `ngsw-config.json` :
   - groupe `app` en `prefetch` : `index.html`, `*.css`, `*.js`, les polices ;
   - groupe `assets` en `lazy` avec `updateMode: prefetch` pour `/favicon.ico`
     et les icônes ;
   - `dataGroups` : **aucun**. Il n'y a pas d'API.
   - Ajouter les six pages pré-rendues (`/lecteur`, `/glossaire`, `/en`, …) aux
     ressources préchargées, sinon seule la page d'entrée est disponible hors ligne.
3. Enregistrer le service worker dans `app.config.ts` via
   `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`.
4. Créer `src/app/core/platform/update.service.ts` : à l'écoute de
   `SwUpdate.versionUpdates`, expose un signal `updateAvailable`. Le
   `SiteHeader` affiche alors un bouton discret « Mettre à jour » qui appelle
   `activateUpdate()` puis recharge. Réutilise la directive `filButton`.
   **N'affiche jamais de rechargement automatique** : quelqu'un est peut-être au
   rang 42.

## Critères d'acceptation

- `npm run build` produit `ngsw.json` et `ngsw-worker.js` dans
  `dist/fil-patterns/browser`.
- Servi localement (`npx http-server dist/fil-patterns/browser`), puis réseau
  coupé : `/`, `/lecteur` et `/glossaire` s'ouvrent, le patron et la progression
  sont là.
- Le navigateur propose l'installation (manifeste valide, icônes 192 et 512,
  `display: standalone`).
- Le service worker est **désactivé** en développement (`ng serve` ne le
  déclare pas).
- `npm run verify` vert.

## Hors périmètre

Les notifications push, la synchronisation en arrière-plan, le partage de
fichiers. Aucun back-end — c'est la règle 1 du contexte.
