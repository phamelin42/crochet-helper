# 48 — Transformer une image en grille de crochet (chaque pixel, une maille)

**Étape d'entonnoir servie : activation (une photo ou un dessin devient un
ouvrage suivable en une minute).**

## Pourquoi

Phil : « importer une image et que ça la transforme en points de crochet,
chaque pixel serait un point ; un diagramme très basique, en rectangle, avec
juste des mailles serrées, et de la couleur pour les couleurs. » La fiche 47
sait afficher et suivre une grille ; il manque de la fabriquer.

## Objectif

« Ouvrir une image en grille » : la lectrice choisit une image, règle la
**largeur en mailles** et le **nombre de couleurs**, voit l'aperçu se mettre
à jour, choisit « à plat » ou « en rond », puis « Créer la grille » ouvre un
**nouveau projet** grille. Tout se passe sur l'appareil.

## Fichiers à lire

- `src/app/features/reader/data/color-grid.ts` (fiche 47) — si elle n'est
  pas fusionnée, s'arrêter et le dire
- `src/app/core/platform/image-pixels.ts` — `decodePixels(blob, maxSide)`,
  déjà là pour la lecture des diagrammes ; ne pas écrire un autre décodeur
- `src/app/features/reader/state/chart-intake.ts` — bornes de fichier
  (`MAX_CHART_FILE_BYTES`, types acceptés), à réutiliser
- `src/app/features/reader/components/pattern-import.ts` — les boutons
  d'import
- `grep -n "openFromChart" -A40 src/app/features/reader/state/reader-store.ts`
  — modèle d'un nouveau projet écrit en une transaction
- `src/app/shared/ui/` : `Dialog`, `InputField`, `Segmented`, `Button`
- `CLAUDE.md`, « Pièges » : entrée tierce bornée avant traitement ; charger
  un autre patron ouvre un autre projet

## À faire

1. **Réduction pure**, `data/image-to-grid.ts` :

   ```ts
   export function imageToGrid(
     pixels: { data: Uint8ClampedArray; width: number; height: number },
     options: { width: number; colors: number; worked: 'flat' | 'round' },
   ): ColorGrid;
   ```

   - Hauteur = `round(width × hauteur / largeur de l'image)`, bornée par
     `validGrid` ; on suppose une maille carrée et on le **dit** dans le
     dialogue (« une maille serrée est à peu près carrée »).
   - Rééchantillonnage par moyenne de zone (pas le plus proche voisin : un
     pixel isolé ne doit pas décider d'une maille).
   - Palette par **coupe médiane** déterministe (même image, mêmes réglages
     → même grille), couleurs triées de la plus claire à la plus foncée ;
     pixels transparents comptés comme blanc. Pas de tramage.

2. **Dialogue** `components/image-grid-dialog.ts` : aperçu (un `<canvas>`
   par `core/platform`, ou le rendu de la fiche 47 réduit), largeur 10 à 150
   (40 par défaut, champ nombre + boutons −/+), couleurs 2 à 12 (6 par
   défaut), `Segmented` À plat / En rond, résumé « 40 × 52 mailles, 6
   couleurs, 2 080 mailles », « Créer la grille ». Le calcul de l'aperçu est
   repoussé de 150 ms après le dernier réglage.
3. **Entrée** : bouton « Ouvrir une image en grille » dans le panneau
   d'import, à côté d'« Ouvrir un diagramme » ; fichiers PNG, JPEG, WebP,
   10 Mo au plus, refus dit par les messages existants de `chart-intake`.
4. **Création** : `ReaderStore.openFromGrid(grid, name)` crée **toujours** un
   nouveau projet (le projet actif reste intact), `source = gridToText`,
   `view = 'chart'`, en une transaction ; échec d'écriture → message, rien
   de perdu. Le nom par défaut est celui du fichier sans extension, borné à
   60 caractères. L'image d'origine n'est pas gardée.

## Mesure

- `grid_created` (propriétés `width` à la dizaine, `colors`, `worked`) —
  jamais l'image ni ses couleurs ;

déclaré dans `AnalyticsEvent`, `EVENEMENTS` **et** `privacy-events.ts`.

## Tests

- `image-to-grid.spec.ts` : image unie → 1 couleur utile ; damier 2 couleurs
  → les deux, au bon endroit ; dégradé → exactement `colors` couleurs pour
  **chaque** valeur de 2 à 12 (boucle) ; déterminisme (deux appels égaux) ;
  proportions sur une image 2:1 ; bornes de largeur 10 et 150.
- Store : `openFromGrid` avec un projet actif → deux projets relus par
  `ProjectStoreService.list()` après écriture, l'ancien intact.
- e2e `e2e/image-grid.spec.ts` : depuis l'accueil, ouvrir
  `tools/fixtures/` (ajouter une petite image 4 couleurs, 40 × 30 px) en
  grille de 40 mailles et 4 couleurs → nouveau projet, 30 rangs, affichage
  diagramme ; toucher une maille ; recharger ; position retenue. Réseau :
  aucune requête hors de l'origine pendant le calcul. axe sur le dialogue.

## Critères d'acceptation

- `npm run verify:ci` vert ; réduction et dialogue hors du bundle initial.
- Image de 4 000 × 3 000 px → aperçu en moins de 1 s sur le profil mobile
  bridé (mesure notée dans la PR) ; au-delà de 64 millions de pixels, refus
  propre (`decodePixels` renvoie `null`).

## Hors périmètre

Corriger une couleur ou une maille à la main, choisir une palette de laines
du commerce, maille non carrée (rapport réglable), C2C, tramage, la page
d'atterrissage (fiche 49).
