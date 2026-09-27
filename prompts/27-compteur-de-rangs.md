# 27 — Page-outil : compteur de rangs en ligne

**Étape d'entonnoir servie : acquisition (requête précise, concurrence faible,
renvoi vers le lecteur).**

## Pourquoi

Audit A-2 (`docs/audit-ux-acquisition-2026-09.md`) : les pages-outils prévues
au plan n'existent pas. « compteur de rangs crochet » et « row counter online »
sont des requêtes où un petit site peut se classer : intention précise, peu de
concurrence de qualité, et la page renvoie naturellement vers le lecteur
(« vous avez le patron ? collez-le, il compte pour vous »). C'est la première
page-outil parce que c'est la plus simple.

## Objectif

Une page `/row-counter` et `/fr/compteur-de-rangs`, pré-rendue et reliée, avec
un compteur utilisable d'une main sur tablette et téléphone, qui se souvient
de sa valeur, et au moins 450 mots de contenu utile par langue.

## Fichiers à lire

- `src/app/core/i18n/route-paths.json`, `src/app/app.routes.ts`
- `src/app/features/designers/pages/for-designers-page.ts` — modèle de page
  avec SEO, textes locaux et un peu d'interaction
- `src/app/features/reader/components/reader-counters.ts` — le compteur de
  répétitions du lecteur (classes `.big`, `.row`, boutons)
- `src/app/core/storage/local-storage.service.ts`,
  `src/app/core/platform/wake-lock.service.ts`
- `src/app/shared/layout/site-footer.ts` — pour relier la page
- `tools/generate-sitemap.mjs`, `e2e/a11y.spec.ts` (la page y entre
  d'elle-même via `route-paths.json`)
- `CLAUDE.md` : toute API navigateur passe par `core/platform` ou
  `core/storage` ; textes d'une page paresseuse dans la page

## À faire

1. Route `rowCounter` dans `route-paths.json` :
   `{ "fr": "/compteur-de-rangs", "en": "/row-counter" }` ; route paresseuse
   dans `app.routes.ts` ; page `src/app/features/tools/pages/row-counter-page.ts`
   (nouveau dossier `features/tools/`, qui accueillera aussi les fiches 28 et
   29). Textes dans la page (`COPY`), SEO complet : titre « Compteur de rangs
   crochet et tricot en ligne, gratuit » / « Free online row counter for
   crochet and knitting », description, canonique, `hreflang`, JSON-LD
   `WebApplication`.

2. Logique pure dans `src/app/features/tools/data/row-counter.ts` :

   ```ts
   export interface CounterState {
     readonly count: number;
     readonly target: number | null;
   }
   export function increment(state: CounterState, delta: number): CounterState; // jamais < 0 ni > 9999
   export function reset(state: CounterState): CounterState;
   export function parseSaved(raw: unknown): CounterState; // entrée inconnue → état initial, jamais d'exception
   ```

3. Interface : le compte en très grand (`--reader-step`), un bouton **+1**
   primaire très large (cible ≥ 64 px de haut), `−1`, « Remettre à zéro » avec
   confirmation `Dialog` au-delà de 10 ; un champ optionnel « Jusqu'au rang »
   qui affiche « 12 / 40 » et la barre de progression (`.meter`) ; raccourcis
   clavier espace et flèche droite (+1), flèche gauche (−1) quand le focus
   n'est pas dans un champ ; case « Garder l'écran allumé » via
   `WakeLockService`. Données en `localStorage` (`fil.rowCounter`) via
   `LocalStorageService`, relues dans `afterNextRender` : le HTML pré-rendu
   affiche 0.

4. Contenu pré-rendu sous l'outil, dans chaque langue (≥ 450 mots) : à quoi
   sert un compteur de rangs ; comment on perd son rang et comment ne plus le
   perdre ; compter en rond ; compter les répétitions ; un encadré « Vous avez
   le patron en texte ou en PDF ? Le lecteur compte pour vous », lien vers `/`.
   Liens vers le glossaire et le convertisseur.

5. Relier la page : un lien dans le pied de page (`site-footer.ts`, clé
   `footer.rowCounter` dans `translations.ts` : deux courtes chaînes) et une
   carte dans la section des guides de l'accueil.

## Mesure

`row_counted` avec `value` arrondi à la dizaine, émis aux paliers 10, 20, 30…
et non à chaque clic ; à déclarer dans `AnalyticsEvent` **et** `EVENEMENTS`.
Aucune propriété de contenu.

## Tests

- `row-counter.spec.ts` : incréments, bornes 0 et 9999, `parseSaved` sur
  `null`, une chaîne, un objet mal typé, une valeur négative ; les paliers de
  mesure parcourus en boucle.
- Page : la valeur relue au démarrage s'affiche ; `−1` est désactivé à 0.
- e2e, nouveau `e2e/tools.spec.ts` : trois clics sur +1 → 3 ; rechargement →
  3 ; à 320 px pas de débordement ; le HTML brut de `/row-counter` contient le
  contenu et « 0 ».

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé à 100 octets près
  (mesurer : les deux chaînes du pied de page sont la seule addition).
- Page pré-rendue dans les deux langues, au sitemap, auditée par axe et au
  reflow (automatique).
- Français soigné.

## Hors périmètre

Plusieurs compteurs nommés, l'historique, les sons ou vibrations, la
synchronisation, un compteur dans le lecteur (il existe), la PWA (déjà en
place).
