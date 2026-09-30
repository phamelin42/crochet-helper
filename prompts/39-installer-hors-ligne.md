# 39 — Proposer l'installation, dire que ça marche hors ligne

**Étape d'entonnoir servie : rétention (une icône sur l'écran d'accueil ramène
la lectrice au prochain ouvrage).**

## Pourquoi

Le site est déjà une application installable (fiche 05 : `manifest.webmanifest`
complet, service worker, projets dans IndexedDB) et **marche hors ligne** : les
patrons, la progression, les photos des PDF restent sur l'appareil. Mais rien
ne le dit, et rien ne propose de l'installer : la plupart des lectrices ne
savent pas qu'« Ajouter à l'écran d'accueil » existe. C'est ce qui a séduit
Phil dans l'application Filo : avoir ses patrons toujours sous la main, sans
réseau.

## Objectif

Une carte discrète « Gardez vos patrons sous la main » qui dit en une phrase
que l'outil marche sans connexion et que les patrons restent sur l'appareil,
avec **le bon geste pour chaque navigateur** :

- Chrome, Edge, Samsung Internet (Android, ordinateur) : un bouton
  « Installer » qui déclenche l'invite native (`beforeinstallprompt`) ;
- Safari sur iPhone et iPad (pas d'invite native) : l'instruction « Touchez
  Partager, puis “Sur l'écran d'accueil” », avec l'icône de partage ;
- déjà installé (ouvert en `display-mode: standalone`) ou après
  `appinstalled` : la carte ne s'affiche pas ;
- ailleurs (Firefox ordinateur…) : pas de carte.

## Fichiers à lire

- `src/app/core/platform/` — `wake-lock.service.ts` comme modèle d'un
  service de capacité navigateur ; tout accès à `window` ou `navigator` passe
  par `core/platform`
- `src/app/features/reader/pages/reader-page.ts` — accueil sans patron
  (`hero`, `proof-list`, `how-it-works`) ; `grep -n`
- `src/app/features/reader/pages/projects-page.ts` — écran « Mes projets »
- `src/app/features/reader/components/waitlist-banner.ts` — modèle d'une ligne
  discrète qu'on ferme (mémorisation de la fermeture)
- `public/manifest.webmanifest`, `ngsw-config.json`
- `src/app/core/analytics/analytics.service.ts`, `tools/umami.mjs`

## À faire

1. **`InstallService`** dans `core/platform`, chargé par `import()` (hors du
   bundle initial) :
   - écoute `beforeinstallprompt` (le met de côté avec `preventDefault()`) et
     `appinstalled` ;
   - expose `mode(): 'prompt' | 'ios' | 'installed' | 'none'` ;
   - `install(): Promise<'accepted' | 'dismissed'>` appelle `prompt()` sur
     l'événement gardé.
   - Détection iOS : Safari mobile sur iPhone / iPad, iPadOS compris (qui se
     déclare Mac avec écran tactile). Côté serveur : `'none'`.

2. **Carte** (composant dans `features/reader/components/`, classes
   `hanami.css` : `.card`, `.btn`) :
   - titre « Gardez vos patrons sous la main » ;
   - une phrase : « Installez l'application : elle s'ouvre comme une appli et
     marche sans connexion. Vos patrons restent sur votre appareil. » ;
   - puis le geste propre au navigateur, et un bouton « Plus tard » qui la
     masque, mémorisé (`LocalStorageService`, clé dédiée).

3. **Emplacements.** Sur l'accueil sans patron, sous la liste des preuves ;
   sur « Mes projets », en tête de liste. **Jamais au-dessus de l'étape** ni
   en mode page pleine (fiche 38) : règle « tout ajout au-dessus de l'étape se
   mesure sur tablette ». Rien au pré-rendu (la capacité n'existe qu'au
   navigateur) : réserver la hauteur ou afficher après `afterNextRender` sans
   décaler le contenu (garde CLS de `e2e/perf.spec.ts`).

4. **Preuve « hors ligne » sur l'accueil.** Ajouter à la liste des preuves
   existante : « Marche sans connexion, une fois ouvert » (FR/EN).

## Mesure

`install_prompted` (invite native affichée), `app_installed` (événement
`appinstalled`), avec `mode` ; déclarés dans `AnalyticsEvent` **et**
`EVENEMENTS`.

## Tests

- `InstallService` : chacun des quatre modes, **toutes** les combinaisons
  listées plus haut (boucle), événement simulé ; `install()` rend la réponse
  de l'invite ; aucun accès à `window` côté serveur.
- e2e :
  - accueil : un `beforeinstallprompt` simulé fait apparaître « Installer » ;
  - `display-mode: standalone` émulé : pas de carte ;
  - « Plus tard » masque la carte et survit au rechargement ;
  - la carte n'apparaît jamais lecteur ouvert.
- Hors ligne : `e2e` coupe le réseau (`context.setOffline(true)`) après une
  première visite avec un patron enregistré, recharge, et retrouve le patron
  et l'étape (`/ngsw/state` en « NORMAL », piège du service worker).
- axe vert sur l'accueil avec la carte.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé à 1 ko près (service et
  carte par `import()`).
- CLS de l'accueil inchangé (`e2e/perf.spec.ts`).
- Français soigné.

## Hors périmètre

Play Store (fiche 41), App Store, notifications, synchronisation, bannière
insistante ou fenêtre modale d'installation.
