# 17 — Tailles de crochet mm ↔ US dans le convertisseur

## Pourquoi

Après la convention des mailles, la deuxième erreur d'un patron étranger est
la taille du crochet : un patron américain dit « G-6 hook », une lectrice
française cherche un 4 mm. « crochet hook size chart » et « 4 mm hook US
size » sont des requêtes fréquentes, stables, auxquelles un tableau répond
mieux qu'un paragraphe. La page `/us-uk-converter` existe déjà et reçoit ce
public : c'est elle qu'on enrichit, pas une nouvelle page.

## Objectif

1. Dans le texte converti, les tailles de crochet sont données dans les deux
   systèmes (« G-6 (4 mm) hook »), avec le même contrôle par la lectrice que
   pour les mailles : chaque ajout figure dans la liste des remplacements.
2. Sous le convertisseur, un tableau des tailles, pré-rendu dans les deux
   langues.

## Fichiers à lire

- `src/app/features/converter/data/convert-terms.ts` et son `.spec.ts` — le
  modèle à suivre (jetons entiers, casse, rapport des remplacements)
- `src/app/features/converter/converter-page.ts` — la page, ses textes (`COPY`)
  et son SEO
- `src/app/core/analytics/analytics.service.ts` — `conversion_run`
- `CLAUDE.md`, « Pièges déjà rencontrés » : budget, énumérations, français

## À faire

1. Créer `src/app/features/converter/data/hook-sizes.ts`, sans dépendance
   Angular :

   ```ts
   export interface HookSize {
     readonly mm: number;
     readonly us: string; // « G-6 », « 7 » quand il n'y a pas de lettre
   }
   export const HOOK_SIZES: readonly HookSize[];
   export interface HookConversion {
     readonly text: string;
     /** Chaque taille annotée : ce qui était écrit, ce qui a été ajouté. */
     readonly annotations: readonly { readonly original: string; readonly added: string }[];
     /** Tailles reconnues comme telles mais absentes du tableau. */
     readonly unknown: readonly string[];
   }
   export function annotateHookSizes(text: string): HookConversion;
   ```

   La fonction ne dépend pas du sens choisi : une taille écrite dans un
   système reçoit l'autre, quel que soit le sens de conversion des mailles.

   Données : exactement ce tableau (norme du Craft Yarn Council). N'en ajoute
   aucune taille : une valeur approximative serait pire que son absence.

   | mm   | US  | mm  | US     |
   | ---- | --- | --- | ------ |
   | 2.25 | B-1 | 5   | H-8    |
   | 2.75 | C-2 | 5.5 | I-9    |
   | 3.25 | D-3 | 6   | J-10   |
   | 3.5  | E-4 | 6.5 | K-10½  |
   | 3.75 | F-5 | 8   | L-11   |
   | 4    | G-6 | 9   | M/N-13 |
   | 4.5  | 7   | 10  | N/P-15 |

2. `annotateHookSizes` reconnaît `G-6`, `G6`, `G/6`, `size G` suivis de `hook`
   (ou `crochet hook`) et ajoute `(4 mm)` ; elle reconnaît `4 mm`, `4mm`,
   `4.0 mm`, `4,0 mm` suivis de `hook` et ajoute `(US G-6)`.
   Contraintes, chacune avec son test :
   - on **ajoute** l'équivalent, on ne remplace jamais la taille d'origine ;
   - une taille absente du tableau (3 mm, 7 mm) est laissée telle quelle et
     listée dans `unknown`, affichée comme les termes sans équivalent ;
   - une taille déjà écrite dans les deux systèmes (« 5 mm (H-8) hook ») n'est
     pas annotée ;
   - pas de double annotation : un texte déjà annoté puis reconverti ne gagne
     pas une deuxième parenthèse ;
   - `4 mm` sans `hook` (une épaisseur de fil, une longueur) n'est pas touché.

   Le test parcourt **toutes** les lignes du tableau, dans les deux sens
   (boucle), pas un échantillon.

3. `converter-page.ts` : appliquer `annotateHookSizes` après `convertTerms`, et
   ajouter les annotations à la liste affichée des remplacements.

4. Tableau sous le convertisseur : un vrai `<table>` avec `<caption>` et `<th
scope="col">`, généré depuis `HOOK_SIZES` avec `@for`. Classes existantes de
   `nocturne.css`/`lecteur.css` ; s'il en manque une, l'ajouter à
   `lecteur.css`, jamais de style local. Les textes vont dans `COPY` de la page
   (paresseuse), pas dans `translations.ts`.

5. SEO : compléter titre et description des deux langues pour mentionner les
   tailles de crochet (« … et tailles de crochet mm ↔ US »), sans changer
   l'URL. JSON-LD inchangé.

## Mesure

Ajouter la propriété `hooks` (nombre d'annotations) à `conversion_run`. Pas de
nouvel événement. L'effet se lit dans les pages vues de `/us-uk-converter` et
`/fr/convertisseur-us-uk` dans les rapports quotidiens.

## Critères d'acceptation

- `npm run verify` vert, bundle initial inchangé (la page est paresseuse).
- « Row 1: with a G-6 hook, ch 20 » donne « with a G-6 (4 mm) hook ».
- « 4mm hook » donne « 4mm (US G-6) hook ».
- Le tableau figure dans le HTML pré-rendu de `/us-uk-converter` et de
  `/fr/convertisseur-us-uk` (vérifier dans `dist/`, pas dans le navigateur).
- Français soigné : espaces insécables avant `: ; ? !` et dans « ».

## Hors périmètre

Les anciennes tailles britanniques (numéros 14 à 000), les crochets acier
(tailles 0 à 14), les aiguilles à tricoter, le poids des fils, l'échantillon.
Toute nouvelle page : le tableau vit sur la page du convertisseur.
