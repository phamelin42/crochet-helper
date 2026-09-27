# 29 — Page dédiée aux tailles de crochet

**Étape d'entonnoir servie : acquisition (« crochet hook sizes chart », l'une
des requêtes les plus fréquentes du crochet).**

## Pourquoi

Audit A-2 (`docs/audit-ux-acquisition-2026-09.md`) : le tableau mm ↔ US existe
(fiche 17) mais comme section du convertisseur, sur une URL dont le titre parle
de conversion US / UK. « crochet hook size chart » ou « taille crochet 4 mm
US » mérite sa page, avec l'explication qui va avec ; elle renvoie vers
l'échantillon (fiche 28) et le convertisseur.

## Objectif

`/crochet-hook-sizes` et `/fr/tailles-de-crochet`, pré-rendues : le tableau,
un chercheur de taille (« 4 mm » → « G-6 », « G-6 » → « 4 mm ») et au moins
500 mots qui expliquent lettres, numéros et choix de la taille.

## Fichiers à lire

- `src/app/features/converter/data/hook-sizes.ts` et son `.spec.ts` —
  `HOOK_SIZES`, seules données autorisées
- `src/app/features/converter/converter-page.ts` — la section tableau
  existante, à garder et à relier
- `src/app/features/tools/pages/` (fiches 27 et 28), ou
  `for-designers-page.ts` comme modèle
- `src/app/core/i18n/route-paths.json`, `src/app/app.routes.ts`

## À faire

1. Route `hookSizes` : `{ "fr": "/tailles-de-crochet", "en": "/crochet-hook-sizes" }`,
   page `features/tools/pages/hook-sizes-page.ts` (import de
   `converter/data/hook-sizes` : `data/` est du domaine partagé). SEO complet,
   JSON-LD `WebPage`.

2. Tableau complet, `<table>` avec `<caption>` et `<th scope="col">`, généré
   depuis `HOOK_SIZES`. Une colonne « Poids de fil usuel » **seulement** si la
   donnée est ajoutée à `hook-sizes.ts` d'après le Craft Yarn Council
   (catégories 0 à 7 et leur plage de crochets), source citée en commentaire ;
   sinon l'omettre : aucune valeur approximative.

3. Chercheur : un `InputField` « 4 mm ou G-6 » ; fonction pure
   `findHookSize(input: string): HookSize | null` dans
   `converter/data/hook-sizes.ts`, qui accepte `4`, `4 mm`, `4,0`, `G`, `G-6`,
   `g6`, `7` ; résultat en grand ; entrée inconnue → « Cette taille n'est pas
   dans la norme », sans exception.

4. Contenu (≥ 500 mots par langue) : pourquoi une lettre et un chiffre ; la
   norme du Craft Yarn Council ; millimètres, US et l'ancienne numérotation
   britannique, évoquée sans tableau (hors périmètre tant que la source n'est
   pas vérifiée) ; choisir sa taille selon le fil et l'échantillon (lien
   fiche 28) ; que faire quand le patron dit « size G » ; lien vers le
   convertisseur pour un patron entier.

5. Relier : pied de page, carte de l'accueil, et depuis la section tableau du
   convertisseur (« Tout savoir sur les tailles de crochet »).

## Mesure

Aucun nouvel événement : la page se lit dans les pages vues. `conversion_run`
reste au convertisseur.

## Tests

- `hook-sizes.spec.ts` : `findHookSize` parcourt **toutes** les lignes de
  `HOOK_SIZES` dans les deux sens et sous chaque écriture acceptée (boucle) ;
  entrée vide, « 3 mm », « Z » → `null`.
- e2e : le HTML brut des deux langues contient le tableau (14 lignes) ;
  chercher « g6 » affiche « 4 mm » ; 320 px sans débordement.

## Critères d'acceptation

- `npm run verify:ci` vert, bundle initial inchangé.
- Aucune donnée ajoutée sans source citée en commentaire dans `hook-sizes.ts`.
- Français soigné.

## Hors périmètre

Crochets acier, anciennes tailles britanniques, aiguilles à tricoter, poids de
fil sans source, boutique ou liens affiliés.
