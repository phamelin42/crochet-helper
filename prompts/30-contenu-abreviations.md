# 30 — Du contenu réel sur les pages d'abréviation

**Étape d'entonnoir servie : acquisition (les 102 pages d'abréviation sont la
surface indexable, mais elles sont vides).**

## Pourquoi

Audit A-1 (`docs/audit-ux-acquisition-2026-09.md`) : chaque page d'abréviation
est un gabarit d'environ 60 mots propres (définition d'une ligne, un rang
d'essai, une note US / UK, des liens). « what does sc mean in crochet » est
occupé par des tutoriels de 1 500 mots avec photos ; un gabarit n'y entrera
jamais, quel que soit le nombre de pages. Le levier n'est pas le nombre de
pages mais le contenu de chacune, à commencer par les vingt abréviations les
plus cherchées.

## Objectif

Vingt pages d'abréviation portent un article structuré de 400 à 600 mots par
langue, exact techniquement, sans image ; les autres gardent le gabarit. Le
contenu vit dans un fichier paresseux, hors du chunk du lecteur.

## Fichiers à lire

- `src/app/features/glossary/pages/term-page.ts` — structure actuelle, `COPY`,
  sections
- `src/app/features/reader/data/glossary.ts` — **par
  `grep -n "term: '<abr>'"`**, jamais en entier : `term`, `fr`, `en`, `craft`,
  `lang`, `region`, `example`, `slug`
- `src/app/features/glossary/data/term-neighbors.ts` — synonymes et voisins
- `src/app/features/converter/data/convert-terms.ts` — la correspondance
  US ↔ UK exacte
- `src/app/features/guides/pages/reading-pattern-page.ts` — ton et forme des
  textes longs
- `CLAUDE.md`, « Pièges » : article devant un nom de maille (« désigne _la_
  maille serrée »), espaces insécables, énumérations parcourues en boucle

## À faire

1. Données : `src/app/features/glossary/data/term-articles.ts`, importé
   **seulement** par `term-page.ts` (page paresseuse) :

   ```ts
   export interface TermArticle {
     readonly how: readonly string[]; // « Comment faire » : les gestes, une phrase par paragraphe
     readonly inPattern: string; // un rang réel, expliqué mot à mot
     readonly usUk: string; // ce que vaut l'abréviation dans l'autre convention, ou « identique »
     readonly mistakes: readonly string[]; // erreurs fréquentes et comment les repérer
     readonly tip: string; // un conseil pour lire à distance : compter, marqueur, repère
   }
   export const TERM_ARTICLES: Readonly<Record<string, Record<Locale, TermArticle>>>; // clé : slug
   ```

2. Slugs à couvrir, **tous**, dans les deux langues : les sept entrées
   `lang: 'fr'` du glossaire (`grep -n "lang: 'fr'"`), et treize anglaises :
   `sc`, `dc`, `hdc`, `tr`, `ch`, `sl st`, `st`, `inc`, `dec`, `sk`, `yo`,
   `rep`, `blo`. Prendre le slug réel donné par `glossary.ts`, ne jamais en
   inventer ; si l'une manque, la remplacer par la suivante parmi `flo`, `sp`,
   `rnd`, `k2tog`, `ssk`, et le dire dans la PR.

3. `term-page.ts` affiche l'article quand il existe, après la définition et
   dans cet ordre : « Comment faire », « Dans un patron » (le rang décomposé,
   chaque abréviation soulignée comme dans le lecteur : réutiliser la
   segmentation de `glossary.ts`), « US ou UK ? », « Erreurs fréquentes », « Un
   conseil », puis les sections existantes (essai, synonymes, voisins). Un
   `<h2>` par section.

4. Exactitude : chaque geste décrit doit être vrai pour la maille (nombre de
   jetés, nombre de boucles sur le crochet, où piquer) ; pour une abréviation
   qui diffère entre US et UK (`dc`, `tr`, `htr`…), « US ou UK ? » donne la
   correspondance exacte de `convert-terms.ts`. Dans le doute, écrire moins
   plutôt que faux.

5. Longueur : 400 à 600 mots par article et par langue, mesurés par le test.

## Mesure

Aucun nouvel événement : `term_tried` et les pages vues des vingt URL
suffisent ; le point hebdomadaire comparera avant et après.

## Tests

- `term-articles.spec.ts` : pour **chaque** slug de la liste (boucle),
  l'article existe en `fr` et en `en`, compte entre 400 et 600 mots, contient
  au moins deux gestes et une erreur ; aucun slug de `TERM_ARTICLES` n'est
  absent du glossaire.
- `term-page.spec.ts` : une page avec article rend cinq `<h2>` de plus ; une
  page sans article est inchangée.
- Pré-rendu : `check-prerender.mjs` vert ; le chunk de `term-page` contient les
  articles et **pas** `main-*.js` (vérifier `dist/`, noter la taille du chunk
  dans la PR).

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé.
- Pour `sc` en anglais et `ms` en français : ≥ 450 mots propres dans le HTML
  pré-rendu, hors navigation.
- Français soigné : article devant chaque nom de maille, espaces insécables.

## Hors périmètre

Images ou schémas (fiche ultérieure), les autres abréviations, la vidéo, un
CMS, les commentaires.
