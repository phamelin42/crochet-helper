# 36 — Transcrire un diagramme en texte, symbole par symbole

**Étape d'entonnoir servie : activation (un diagramme devient un patron que
le lecteur sait suivre) et acquisition (« traduire un diagramme de crochet »,
requête sans réponse outillée).**

## Pourquoi

Le lecteur ne suit que du texte. La fiche 35 montre le diagramme ; il manque
le pont : « traduire » le diagramme en rangs écrits, dans la convention de la
lectrice (US, UK ou FR). La reconnaissance automatique n'est pas acquise
(fiche 37) ; ce qui l'est, c'est une transcription **assistée** : la lectrice
tape les symboles qu'elle voit, l'outil écrit le rang, compte les mailles et
signale les incohérences. C'est plus rapide qu'au clavier, sans erreur
d'abréviation, et le résultat est un vrai patron du lecteur.

## Objectif

Depuis le panneau « Diagramme », « Transcrire ce diagramme » ouvre un
composeur : une palette de symboles (données de la fiche 35), des tours ou
rangs qu'on remplit en touchant les symboles, des répétitions, le compte de
mailles par tour, et un bouton « Ajouter au patron » qui écrit le texte dans
le projet, dans la convention choisie.

## Fichiers à lire

- `src/app/features/reader/data/chart-symbols.ts` (fiche 35) — la source
  unique des symboles ; si la 35 n'est pas fusionnée, s'arrêter et le dire
- `src/app/features/reader/data/pattern-parser.ts` — la syntaxe que le
  lecteur comprend (`ROW`, répétitions `*…*`, `x N`, comptes `(18)`) : le
  texte produit doit être découpé exactement comme attendu
- `src/app/features/converter/data/convert-terms.ts` — correspondance
  US ↔ UK, à réutiliser pour écrire dans la convention choisie
- `src/app/features/reader/state/reader-store.ts` — `load`, `source`
- `src/app/shared/ui/` : `Segmented`, `Dialog`, `Button`, `InputField`
- `CLAUDE.md`, « Pièges » : énumérations parcourues en boucle, texte de
  l'utilisatrice jamais en HTML, français soigné

## À faire

1. **Modèle pur**, `src/app/features/reader/data/chart-composer.ts` :

   ```ts
   export interface Token {
     readonly symbol: string; // identifiant de chart-symbols.ts
     readonly count: number; // 1 par défaut
   }
   export interface Group {
     readonly tokens: readonly Token[];
     readonly repeat: number; // 1 = pas de répétition ; N → *…* x N
   }
   export interface Round {
     readonly kind: 'round' | 'row';
     readonly groups: readonly Group[];
     readonly into?: 'magic-ring' | 'chain'; // premier tour seulement
   }
   export function stitchCount(round: Round): number; // mailles produites
   export function renderRound(round: Round, index: number, convention: 'US' | 'UK' | 'FR'): string;
   export function renderPattern(rounds: readonly Round[], convention): string;
   export function warnings(rounds: readonly Round[]): readonly string[]; // tour vide, compte qui chute de moitié…
   ```

   `renderRound` produit une ligne que `parsePattern` découpe en **une**
   étape, avec le compte entre parenthèses : « Rnd 3: \*sc, inc\* x 6 (18) »,
   « Row 3: 2 dc in each st across (24) », « Tour 3 : \*1 ms, 1 aug\* x 6
   (18) ». Les abréviations viennent de `chart-symbols.ts` ; la convention UK
   passe par la table de `convert-terms.ts`.

2. **Composeur**, composant `components/chart-composer.ts`, ouvert dans un
   `Dialog` plein écran depuis le panneau « Diagramme » (le diagramme reste
   visible à côté ou au-dessus, réduit) : à gauche la palette de symboles
   (icône SVG + abréviation, gros boutons), au centre le tour en cours (les
   jetons, avec un compteur × par jeton, « Répéter la sélection × N »), en
   bas la liste des tours déjà écrits avec leur compte, et « Ajouter au
   patron ». Choix Tour / Rang et Anneau magique / Chaînette au premier tour.
   Convention : celle de la page (FR sous `/fr`, US ailleurs), changeable par
   `Segmented` US / UK / FR.

3. **Écriture dans le projet.** « Ajouter au patron » ajoute une nouvelle
   pièce nommée par la lectrice (par défaut « Diagramme 1 ») à la fin de
   `source`, sans toucher au reste ; la position de lecture reste où elle
   était ; le brouillon du composeur est gardé en `localStorage`
   (`fil.chartDraft`, via `LocalStorageService`) tant qu'il n'est pas ajouté,
   pour survivre à un rechargement.

4. **Aides.** Le compte de mailles s'affiche à chaque tour ; un avertissement
   (sans blocage) quand un tour est vide, quand le compte fait moins de la
   moitié ou plus du double du précédent sans diminution ni augmentation
   explicite, ou quand une répétition ne tombe pas juste sur le compte
   précédent.

## Mesure

- `chart_transcribed` avec `rounds` (nombre de tours) et `convention` ;

déclaré dans `AnalyticsEvent` **et** `EVENEMENTS`.

## Tests

- `chart-composer.spec.ts` : pour **chaque** symbole de `chart-symbols.ts`
  (boucle), `renderRound` d'un tour d'un seul jeton produit une ligne que
  `parsePattern` découpe en une étape dont le corps contient l'abréviation de
  la convention ; `stitchCount` sur une table de tours connus (anneau
  magique 6 ms, tour d'augmentations, tour de diminutions, répétitions) ;
  `warnings` sur les trois cas ; conventions US, UK et FR parcourues en
  boucle.
- Composant : touche un symbole → jeton ; × 3 → compte ; « Ajouter » →
  `source` finit par la nouvelle pièce ; brouillon relu après rechargement.
- e2e (`e2e/chart-composer.spec.ts`) : depuis l'exemple, ouvrir le
  composeur, écrire deux tours, ajouter, vérifier que le `Segmented` des
  pièces montre la nouvelle pièce et que sa première étape est le tour 1.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé (composeur chargé par
  `import()` depuis le panneau).
- Chaque ligne produite est lue par le lecteur sans retouche.
- Utilisable au doigt sur tablette : boutons de la palette ≥ 48 px.
- Français soigné : « la maille serrée », espaces insécables.

## Hors périmètre

La reconnaissance automatique des symboles (fiche 37), les diagrammes de
tricot, l'export du texte hors du projet (le partage existe déjà), l'édition
d'un tour déjà ajouté au patron (on l'édite dans le texte), les symboles hors
de la liste de la fiche 35.
