# 28 — Page-outil : calculateur d'échantillon

**Étape d'entonnoir servie : acquisition.**

## Pourquoi

Audit A-2 (`docs/audit-ux-acquisition-2026-09.md`) : « gauge calculator »,
« calcul échantillon crochet » et « combien de mailles monter » sont des
requêtes précises, servies aujourd'hui par des pages de blog sans outil. Une
page qui calcule, explique, et renvoie vers le lecteur et la page des tailles
de crochet (fiche 29) complète le trio d'outils.

## Objectif

`/gauge-calculator` et `/fr/calculateur-d-echantillon` : à partir de
l'échantillon du patron et du sien, la page dit quoi changer et convertit
mailles ↔ centimètres (ou pouces), avec au moins 500 mots pré-rendus qui
expliquent comment mesurer un échantillon.

## Fichiers à lire

- `src/app/features/tools/pages/row-counter-page.ts` (fiche 27), la page-outil
  modèle ; si la 27 n'est pas encore fusionnée, `for-designers-page.ts`
- `src/app/features/converter/converter-page.ts` — champs `filInput`,
  `Segmented` pour le sens, résultats en signaux : le modèle à suivre, plus
  léger que Signal Forms
- `src/app/features/converter/data/hook-sizes.ts` — `HOOK_SIZES`, pour la
  taille de crochet voisine (`data/` d'une autre fonctionnalité : autorisé)
- `src/app/core/i18n/route-paths.json`, `src/app/app.routes.ts`,
  `tools/generate-sitemap.mjs`

## À faire

1. Route `gaugeCalculator` :
   `{ "fr": "/calculateur-d-echantillon", "en": "/gauge-calculator" }`, page
   `features/tools/pages/gauge-calculator-page.ts`, textes locaux, SEO complet,
   JSON-LD `WebApplication`.

2. Fonctions pures dans `features/tools/data/gauge.ts`, unité en paramètre
   (`'cm' | 'in'`, référence 10 cm ou 4 pouces) :

   ```ts
   export interface Gauge {
     readonly stitches: number; // sur 10 cm ou 4 in
     readonly rows: number;
   }
   export function compareGauges(
     pattern: Gauge,
     mine: Gauge,
   ): { stitchRatio: number; rowRatio: number; advice: 'ok' | 'go-up' | 'go-down' } | null;
   export function stitchesFor(width: number, mine: Gauge, unit: Unit): number | null; // entier
   export function widthFor(stitches: number, mine: Gauge, unit: Unit): number | null; // au dixième
   export function nextHook(mm: number, direction: 'up' | 'down'): HookSize | null; // dans HOOK_SIZES
   ```

   Trop de mailles sur 10 cm → crochet plus gros (`go-up`) ; écart de 5 % ou
   moins → `ok`. Entrée nulle, négative, `NaN` ou hors d'un intervalle
   plausible (1 à 100 mailles, 0,5 à 500 cm) → `null` et un message, jamais
   d'exception.

3. Interface : trois blocs, « Le patron demande », « Mon échantillon »,
   « Résultat » (le conseil en une phrase, en gros, puis les deux conversions) ;
   `Segmented` cm / pouces ; un champ optionnel « Taille de crochet utilisée »
   pour proposer la taille voisine du tableau. Résultat vide dans le HTML
   pré-rendu, formulaire présent.

4. Contenu (≥ 500 mots par langue) : pourquoi l'échantillon décide de la
   taille finale ; comment le faire (15 × 15 cm, bloquer ou laver comme
   l'ouvrage, mesurer au centre sur 10 cm) ; lire la ligne « gauge » d'un
   patron anglais (« 14 sts and 16 rows = 4 in ») ; que faire quand ça ne
   correspond pas ; liens vers la page des tailles de crochet, le convertisseur
   et le lecteur.

5. Relier : pied de page et carte de l'accueil, comme la fiche 27.

## Mesure

`gauge_calculated` avec `unit` et `advice` ; déclaré dans `AnalyticsEvent`
**et** `EVENEMENTS`.

## Tests

- `gauge.spec.ts` : une table de cas parcourue **en boucle** dans les deux
  unités (ratios, conseil, arrondis) ; `nextHook` sur **toutes** les lignes de
  `HOOK_SIZES` dans les deux sens, extrémités → `null` ; entrées invalides.
- e2e : saisir 14/16 puis 16/16 → conseil « crochet plus gros » ; « 50 cm » →
  le nombre de mailles attendu ; 320 px sans débordement ; le HTML brut
  contient le contenu.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé (page paresseuse ;
  vérifier avec `ng build --stats-json` que `hook-sizes.ts` n'entre pas dans
  `main-*.js`).
- Deux langues pré-rendues, sitemap, axe, reflow.
- Aucun chiffre inventé : les seules données sont `HOOK_SIZES` et les formules.

## Hors périmètre

Le métrage de fil, les tailles de vêtement, la sauvegarde d'échantillons, les
aiguilles à tricoter (tableau distinct, données à valider plus tard), les
photos.
