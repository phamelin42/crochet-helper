# @@NOM@@

> Ce fichier fait autorité pour toute intervention sur ce dépôt. Rôle et
> périmètre de l'agent : `AGENTS.md`. Workflow et checklist de PR :
> `CONTRIBUTING.md`. Ce dépôt est né du socle commun des micro-produits
> (`micro-produits/socle` dans le dépôt de Pattern Reader) : une règle qui
> vaut pour tous se corrige d'abord là-bas.

## Ce que fait le produit

@@PROMESSE@@

- **Requête visée** : « @@REQUETE@@ ». C'est elle qui amène la visite ; le
  titre et la description de l'accueil la reprennent.
- **Public** : @@PUBLIC@@.
- **Fonction principale** : @@FONCTION@@.
- **Exports** : @@EXPORTS@@.
- **Offre payante envisagée** (pas construite, voir « Revenu ») : @@OFFRE@@.

## Objectif et tunnel

Revenu visé : 200 à 500 € par mois, en addition avec les neuf autres produits.
Acquisition quasi gratuite : le référencement naturel sur une requête que les
gens tapent déjà, rien qui exige de créer une demande. Le tunnel, ses
événements et ses seuils d'alerte sont dans `docs/tunnel.md` ; toute
fonctionnalité dit, dans sa fiche, quelle étape elle sert (acquisition,
activation, rétention, revenu). Une fiche qui n'en sert aucune n'est pas
prioritaire.

**Revenu : gratuit d'abord.** Le produit se lance 100 % gratuit et statique.
L'intérêt pour l'offre complète se mesure (`offre_vue`, `offre_cliquee`) ; le
paiement ne se construit que sur un produit qui montre du trafic réel, après
un ADR validé par Phil (il suppose un back-end, donc un écart à la contrainte 1).

## Contraintes non négociables

1. **Aucun back-end.** Parsing, calcul, état, persistance (IndexedDB par
   `KvStoreService`, `localStorage` pour les seules préférences), génération
   de PDF ou d'iCal : tout se passe dans le navigateur. Le build produit des
   fichiers statiques (`outputMode: 'static'`). Ni serveur, ni appel réseau,
   ni clé d'API sans ADR — seule exception : la mesure d'audience
   (`docs/adr-001-mesure-audience.md`).
2. **Tout est pré-rendu.** Chaque route existe en HTML complet dans
   `dist/app/browser` ; `tools/check-prerender.mjs` fait échouer le build
   sinon. Le code qui touche au DOM, au stockage ou à `navigator` est gardé par
   `isPlatformBrowser` ou `afterNextRender`.
3. **PWA.** Manifeste, service worker (`UpdateService`, sans
   `@angular/service-worker` côté page), invite d'installation visible
   (`InstallButton` dans l'en-tête), fonctions de base hors ligne.
   `tools/check-pwa.mjs` vérifie icônes et `ngsw.json`.
4. **Les données de la personne ne quittent pas l'appareil.** Une écriture
   IndexedDB n'est réussie qu'au `complete` de la transaction ; on n'efface
   jamais une ancienne copie sur la foi d'une écriture non confirmée ;
   plusieurs écritures liées = une seule transaction (`writeMany`).
5. **Le texte saisi n'est jamais du HTML** : pas d'`innerHTML` ni de
   `bypassSecurityTrust*`.
6. **Aucune valeur brute de style.** Couleurs, espacements, rayons : des
   `var(--…)` de `src/styles/tokens.css`, classes dans `src/styles/base.css`.
   Ni `styles:` de composant ni `style="…"` (`tools/check-styles.mjs`).
7. **Français à la racine.** La requête visée est française. Une version
   anglaise viendrait sous `/en`, jamais d'un état stocké.

## Architecture

```
produit.json         identité du produit (nom, domaine, requête, éditeur, mesure) — seule source
src/styles/          tokens.css (jetons) · base.css (classes) · print.css (impression, chargée à part)
src/app/core/        analytics · seo · storage · platform — services transverses, sans UI
src/app/shared/      layout (coquille) · ui (composants réutilisables)
src/app/features/<nom>/
     data/           modèles et fonctions pures — testables sans Angular
     state/          magasin de signaux
     components/     composants de la fonctionnalité
     pages/          composants routés, portent le SEO de la page
tools/               build (sitemap, contrôles), icônes, rapport mensuel
e2e/                 audit Playwright sur le build (axe, reflow 320 px, pré-rendu, mesure)
prompts/             fiches de tâche autoportantes
docs/                tunnel, ADR, lancement
```

Dépendances : `features` → `shared` → `core`, jamais l'inverse, pas de
dépendance croisée entre deux `features` (sauf leurs `data/`).

## Stack et commandes

Angular 22 (standalone, signaux, zoneless par défaut, `@Service()`), pré-rendu
statique `@angular/ssr`, Vitest, ESLint, Prettier, Playwright + axe. Node 24.

| Commande             | Rôle                                                             |
| -------------------- | ---------------------------------------------------------------- |
| `npm start`          | serveur de développement                                         |
| `npm run build`      | build, pré-rendu, sitemap, `ngsw.json`, contrôles                |
| `npm run test:ci`    | tests unitaires (Vitest)                                         |
| `npm run test:tools` | tests des scripts de `tools/`                                    |
| `npm run verify`     | lint + format + tests + build                                    |
| `npm run verify:ci`  | `verify` puis l'audit Playwright : **ce que lance la CI**        |
| `npm run icones`     | régénère les PNG du manifeste depuis `public/favicon.svg`        |
| `npm run lancement`  | liste ce qui manque avant la mise en ligne (`docs/lancement.md`) |

**Une tâche n'est pas terminée tant que `npm run verify:ci` n'est pas vert.**
Le hook `pre-push` la lance (cinq minutes environ). `npx playwright test`
seul sert le dernier `dist/`, pas le code du moment.

## Mesure

Umami sans cookie (aucun bandeau), Search Console pour les requêtes. Les noms
d'événements sont **communs aux dix produits** (`core/analytics/evenements.ts`)
et se déclarent deux fois : là et dans `EVENEMENTS` de `tools/umami.mjs`
(`tools/evenements.test.mjs` vérifie). Aucune saisie de la personne ne part,
seulement des noms et des propriétés courtes (format d'export, mode).

## Conventions Angular

- Composants standalone sans `standalone: true` ni `changeDetection` explicites.
- `input()`, `output()`, `model()`, `computed()`, `linkedSignal()` ; jamais
  `mutate`. Contrôle de flux natif (`@if`, `@for`, `@switch`).
- `host: {}` plutôt que `@HostBinding` / `@HostListener` ; `inject()` plutôt
  que le constructeur ; `@Service()` pour les singletons.
- Formulaires : Signal Forms (`@angular/forms/signals`).
- Pas de `ngClass` / `ngStyle`. Pour un SVG, `<img>` natif avec `width`,
  `height` (pas `NgOptimizedImage`, 5,5 ko au bundle initial pour rien).
- Pas de `@defer` (5,6 ko au bundle initial) : `import()` suffit.
- Accessibilité : axe sans violation, WCAG AA (contraste, focus visible,
  cibles de 48 px, étiquettes). L'audit tourne sur chaque page pré-rendue.

## Pièges hérités de Pattern Reader

- **Un test décrit ce que la personne doit obtenir**, pas ce que le code fait.
- **Persistance** : attendre l'écriture (`vi.waitFor`) puis relire par le
  service, jamais l'état en mémoire juste après l'action.
- **Toute entrée venant d'un tiers est bornée en taille** avant traitement
  (fichier importé, image, lien) : invalide ou trop grand → `null`, jamais
  d'exception.
- **Une action destructive passe par une confirmation.**
- **Une nouvelle page est reliée** (en-tête, pied de page ou maillage) ; une
  page `noIndex` ne va pas au sitemap (`tools/generate-sitemap.mjs` l'exclut).
- **Bundle initial** : la coquille seule ; chaque page est paresseuse
  (`loadComponent`). Le budget d'`angular.json` est une alarme avec de la
  marge : un avertissement se justifie dans la PR, on ne le resserre jamais
  à quelques octets de la taille du moment.
- **Un événement émis depuis un `effect` arrive un tour plus tard** que le
  clic : un test e2e accumule la file au lieu de la lire une fois.
- **Un garde-fou non branché ne garde rien** : tout contrôle créé tourne dans
  `npm run verify:ci`.
- **Une fiche qui énumère des valeurs** (formats d'export, rythmes, formes) :
  le test les parcourt toutes.
- **Impression** : vérifier sur un vrai PDF (Chromium `page.pdf`), pas sur
  `innerText`.
- **Vert chez l'agent, rouge en CI** : chercher ce que l'environnement a de
  plus (navigateur installé, cache, historique git).

## Économie de tokens

Lire les fichiers listés par la fiche, et seulement eux ; le reste par
`grep -n`. Tests ciblés pendant le travail
(`npx ng test --no-watch --include='<glob>'`), un seul `verify:ci` à la fin.
