# 43 — Mode appli : une vraie coquille d'application mobile

**Étape d'entonnoir servie : rétention (une appli qui se comporte comme une
appli est celle qu'on rouvre au prochain ouvrage) et activation (on arrive
directement sur ses projets, pas sur une page de présentation).**

## Pourquoi

Phil, le 1er octobre, après avoir installé l'application Android (fiche 41) :
« je n'aime pas du tout le rendu de l'appli ». Ce qui gêne, dans ses mots :

1. **ça fait « site web »** : en-tête à liens, pied de page, textes de
   présentation et pages de référencement ;
2. **pas de navigation d'appli** : ni barre d'onglets en bas, ni transitions,
   ni retour arrière naturel ;
3. la barre d'adresse de Chrome en haut (traitée à part, voir « Hors
   périmètre »).

Décision de Phil : **même code, mode appli**. Pas de seconde base de code ni de
réécriture native : le site détecte qu'il tourne en application installée et
affiche une coquille d'application. Le site vu dans un navigateur ne change pas.

## Objectif

Quand l'outil tourne en application (TWA du Play Store, ou site installé sur
l'écran d'accueil), il ressemble à une application mobile :

- **plus d'en-tête de site ni de pied de page** ; à la place, une barre de
  titre compacte (nom de l'écran) ;
- une **barre d'onglets en bas**, toujours visible (sauf en page pleine) :
  **Lire** (le lecteur), **Mes projets**, **Glossaire**, **Réglages** ;
- **pas de contenu de présentation** : ni accroche, ni preuves, ni « comment ça
  marche », ni liste d'attente, ni carte d'installation (on y est déjà) ;
- **à l'ouverture**, « Mes projets » s'il en existe un, sinon l'écran d'import
  (coller, ouvrir un PDF, exemple) ;
- un **écran Réglages** qui regroupe ce que l'en-tête portait : fond sombre,
  écran allumé, langue, taille du texte, et les liens Discord, confidentialité,
  guides ;
- des **transitions** entre onglets, et le **bouton retour** d'Android qui
  ramène à l'écran précédent sans jamais quitter l'appli par surprise.

## Fichiers à lire

- `src/app/app.ts` — la coquille (en-tête, `main`, pied de page)
- `src/app/shared/layout/site-header.ts`, `site-footer.ts` — ce qu'on masque
  et ce que Réglages reprend
- `src/app/core/platform/install.service.ts` — détection
  `display-mode: standalone` existante (fiche 39), à réutiliser, pas à dupliquer
- `src/app/core/platform/display-prefs.service.ts` — préférences (fond sombre,
  taille, page pleine) ; Réglages s'en sert
- `src/app/app.routes.ts` — `page()`, `styled()` ; une route Réglages s'y ajoute
- `src/app/core/i18n/route-paths.json` — déclarer `settings`
  (`/settings`, `/fr/reglages`) : l'audit axe en dérive ses routes
- `src/app/features/reader/pages/reader-page.ts` — accueil sans patron
  (`grep -n "hero\|proof-list\|how-it-works\|waitlist\|install"`)
- `src/styles/lecteur.css` — règles `html[data-focus]` (fiche 38) comme modèle
  d'un mode porté par un attribut sur `<html>`
- `twa/twa-manifest.json` — `startUrl`, `appVersionCode`
- `e2e/page-pleine.spec.ts` — modèle de tests par taille d'écran

## À faire

1. **Détection, sans décalage.** Le mode appli est actif si
   `@media (display-mode: standalone)` est vrai **ou** si l'URL de lancement
   porte `mode=app`. Le second cas est le filet de la TWA : **vérifier sur
   l'application réelle** (ou dans la documentation Chrome des TWA, source
   citée dans la PR) que la TWA répond bien `standalone`.
   - Le paramètre `mode=app` est mémorisé pour la session (`sessionStorage`,
     via `core/storage`), puisque la navigation interne le perd.
   - `AppModeService` (`core/platform`) expose `active()` et pose
     `data-app` sur `<html>`, comme `data-focus`.
   - Tout le masquage passe par CSS (`@media (display-mode: standalone)` et
     `html[data-app]`), jamais par `@if` sur la coquille. Ainsi le premier
     affichage d'une appli installée est déjà le bon (CSS seul), et le HTML
     pré-rendu reste celui du site, indexable.
   - `startUrl` de `twa/twa-manifest.json` devient
     `/?mode=app&utm_source=play_store&utm_medium=app`, avec `appVersionCode`
     incrémenté.

2. **Barre d'onglets** (`shared/ui/tab-bar`, ajoutée à la vitrine
   `/design-system`) :
   - quatre onglets, **icône et libellé toujours visibles** (public de 50 à 70
     ans : jamais d'icône seule), cible de 56 px de haut au moins ;
   - `nav` nommée, `aria-current="page"` sur l'onglet actif, couleur
     `--color-primary` pour l'actif ;
   - fixée en bas avec `env(safe-area-inset-bottom)`, le contenu réserve sa
     hauteur (aucun texte caché dessous) ;
   - présente dans le DOM mais masquée hors mode appli (`display: none`, donc
     absente de l'arbre d'accessibilité et du référencement) ;
   - masquée en page pleine (`html[data-focus]`) : l'étape garde tout l'écran.

3. **Barre de titre** : nom de l'écran courant, centré, une ligne, à la place
   de l'en-tête de site. Aucun lien de navigation dedans.

4. **Écran Réglages** (route `settings`, `noIndex`, hors sitemap, styles dans
   `pages.css`) :
   - fond sombre, écran allumé (si pris en charge), langue (vrai lien vers
     l'URL de l'autre langue), taille du texte ;
   - liens : guides, confidentialité, Discord.
   - Dans un navigateur, la route existe aussi mais n'est reliée que depuis la
     barre d'onglets : vérifier qu'elle ne devient pas une page orpheline
     indexée (`noIndex`, hors sitemap).

5. **Accueil en mode appli** :
   - masquer `hero`, liste des preuves, « comment ça marche », bandeau de
     liste d'attente et carte d'installation ;
   - si un projet existe, ouvrir « Mes projets » (redirection côté navigateur
     seulement, après lecture d'IndexedDB, sans écran blanc intermédiaire),
     sinon montrer l'import.

6. **Navigation** :
   - transitions entre onglets par l'API View Transitions
     (`withViewTransitions()` du routeur). Mesurer son coût au bundle initial ;
     s'il dépasse 2 ko, une transition CSS simple suffit. Désactivées sous
     `prefers-reduced-motion`.
   - Bouton retour d'Android : chaque onglet est une entrée d'historique ;
     depuis un onglet racine, retour ramène à « Lire » avant de quitter l'appli.
     En page pleine, retour quitte d'abord la page pleine (comme Échap).

7. **Barre d'état** : `theme-color` suit le fond sombre (la meta change avec
   `data-dim`), pour que la barre d'Android ne reste pas claire sur un écran
   sombre.

8. Textes FR/EN des onglets et de Réglages : dans les composants ou
   `reader-copy.ts` si le lecteur s'en sert, pas dans `translations.ts`, sauf
   les quatre libellés d'onglet (coquille, premier affichage).

## Mesure

`app_tab_selected` avec `tab: 'read' | 'projects' | 'glossary' | 'settings'`,
émis au clic (pas depuis un `effect`), et `app_opened` avec
`mode: 'twa' | 'standalone'` une fois par session. Déclarés dans
`AnalyticsEvent` **et** `EVENEMENTS` (`tools/umami.mjs`).

## Tests

- `AppModeService` : chaque combinaison (media query vraie ou fausse, `mode=app`
  présent ou absent, valeur mémorisée en session, côté serveur) en boucle ;
  rien n'est lu ni écrit côté serveur.
- e2e, en mode appli (`/?mode=app`, et `display-mode: standalone` émulé par CDP
  `Emulation.setEmulatedMedia` si Chromium le permet), à 390 × 844 **et**
  820 × 1180 :
  - en-tête de site, pied de page, accroche et liste d'attente invisibles ;
    barre d'onglets visible, quatre onglets nommés, `aria-current` juste ;
  - chaque onglet mène à son écran (boucle sur les quatre) ;
  - le dernier élément de chaque écran n'est pas caché sous la barre
    d'onglets (boîte englobante) ;
  - avec un projet enregistré, l'ouverture mène à « Mes projets » ;
  - page pleine : barre d'onglets masquée, garde « les boutons ne bougent pas »
    verte ;
  - retour arrière : d'un onglet à l'autre puis `page.goBack()` revient à
    l'onglet précédent.
- **Hors mode appli, rien ne change** : toute la suite e2e existante reste verte
  sans modification de ses attentes ; le HTML pré-rendu de `/` ne contient ni
  `data-app` ni barre d'onglets visible.
- axe vert en mode appli, clair et sombre (`e2e/a11y.spec.ts`), reflow 320 px.
- CLS de l'accueil en mode appli sous le seuil de `e2e/perf.spec.ts`.

## Critères d'acceptation

- `npm run verify:ci` vert.
- Bundle initial : coquille et barre d'onglets y sont (premier affichage), le
  reste est paresseux ; un avertissement de budget se justifie dans la PR.
- Captures avant / après dans la PR, en mode appli, téléphone : accueil,
  lecteur, Mes projets, Réglages.
- Nouvelle version Android construite (`android.yml`) avec le nouveau
  `startUrl`, lien du run dans la PR.
- Français soigné.

## Hors périmètre

- **Barre d'adresse de Chrome dans l'appli** : elle disparaît quand
  `twa/fingerprints.json` contient l'empreinte SHA-256 de signature de la
  console Play (Phil la fournit) ; aucun code à écrire ici.
- **Emballage Capacitor** (vrais écrans natifs, partage natif, appli lisible
  sans réseau dès l'installation) : fiche suivante, à décider une fois ce mode
  appli jugé sur téléphone.
- iOS / App Store, notifications, gestes de balayage entre étapes, refonte du
  design system.
