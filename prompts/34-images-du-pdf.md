# 34 — Les images du PDF, à l'étape qu'elles illustrent

**Étape d'entonnoir servie : activation et rétention (un PDF acheté sans ses
photos est moins bon que le PDF lui-même).**

## Pourquoi

Un patron d'amigurumi vendu en PDF est fait de texte **et** de photos : « as in
image 3 », « see photo », « (fig. 2) ». Aujourd'hui l'import PDF ne garde que le
texte (`pdf-extract.ts`) : la lectrice qui suit une étape ambiguë doit rouvrir
le PDF, et le lecteur perd sa raison d'être. Le projet ne connaît qu'une seule
image, la photo collée à la main (`Project.image`, `setImage`).

## Objectif

À l'import d'un PDF, les images qu'il contient sont extraites, réduites,
enregistrées avec le projet, et affichées sous l'étape qu'elles illustrent :
d'abord par la référence explicite du texte (« see image 3 »), sinon par leur
position dans la page. Rien ne quitte l'appareil ; aucune perte en cas de
quota ; les liens `#p=` et `#j=` ne transportent toujours pas d'image.

## Fichiers à lire

- `src/app/features/reader/data/pdf-extract.ts` — pdf.js (`import()`,
  `workerSrc`, `getTextContent`) ; `pdf-normalize.ts` (`normalizePdfPages`)
- `src/app/features/reader/state/reader-store.ts` — `importPdf`, `persist`,
  `hydrate`, `setImage`, effet de persistance
- `src/app/features/reader/data/project.model.ts` — `Project`, `parseBackup`,
  `BACKUP_SCHEMA_VERSION`, `mergeProjects`
- `src/app/core/storage/project-store.service.ts` — `DB_VERSION`,
  `onupgradeneeded`, `put`/`putAll` validés au `complete`
- `src/app/features/reader/data/pattern-parser.ts` — `BRACKET_NOTE` (une ligne
  entre crochets part en note : le marqueur d'image doit être reconnu
  **avant**), `parsePattern`
- `src/app/features/reader/data/pattern.model.ts` — `PatternStep`
- `src/app/features/reader/components/step-view.ts`, `pages/reader-page.ts`
  (`onPaste`, `setImage`)
- `e2e/pattern-link.spec.ts` — fabrication d'un vrai PDF par `page.pdf()`
- `CLAUDE.md`, « Pièges » : aucune perte de données, entrée d'un tiers bornée,
  API navigateur par `core/platform`, `img-src 'self' data: blob:` (CSP)

## À faire

1. **Extraction.** `extractPdfPages` renvoie, par page, le texte **et** les
   images : `{ lines: readonly string[]; images: readonly ExtractedImage[] }`
   avec `ExtractedImage = { blob: Blob; width; height; afterLine: number }`.
   Les images sont les `XObject` peints par la page (`getOperatorList`,
   `OPS.paintImageXObject`, matrice courante suivie sur `save` / `restore` /
   `transform` pour connaître leur position) ; `afterLine` est l'indice de la
   dernière ligne de texte située au-dessus de l'image. Chaque image est
   redessinée sur un canvas au plus long côté ≤ 1280 px et encodée en JPEG
   (qualité 0,8) ; les images de moins de 80 px de côté et celles répétées sur
   trois pages ou plus (logos, bandeaux) sont ignorées. Plafonds : 40 images
   et 20 Mo par PDF ; au-delà, on garde les premières et on le dit. Le PDF
   est traité page par page, sans garder les bitmaps de toutes les pages en
   mémoire.

2. **Marqueurs dans le texte.** `normalizePdfPages` insère une ligne
   `[image N]` (N à partir de 1, dans l'ordre de lecture) après la ligne
   `afterLine` de chaque image. Le texte du projet reste du texte : la
   lectrice le voit dans la zone de saisie, un lien `#p=` le transporte sans
   les images (le lecteur n'affiche alors rien à cet endroit, sans erreur).

3. **Parseur.** Une ligne `[image N]` est rattachée à l'étape en cours
   (`PatternStep.images: readonly number[]`, vide par défaut) et n'apparaît
   ni dans le corps ni dans les notes. Une référence explicite dans le corps
   d'une étape rattache aussi l'image citée : `image 3`, `photo 3`, `fig. 3`,
   `figure 3`, `picture 3`, en anglais et en français (« voir photo 3 », « comme
   sur l'image 2 »), avec ou sans parenthèses ; une référence sans numéro
   (« see photo ») rattache l'image dont le marqueur suit l'étape. Un numéro
   qui n'existe pas est ignoré. Les marqueurs avant la première étape vont au
   patron (`Pattern.images`), pas à une étape.

4. **Stockage.** Un nouvel `objectStore` `images` (`DB_VERSION` 2, migration
   dans `onupgradeneeded`), clé `${projectId}:${n}`, enregistrement
   `{ id, projectId, n, blob, width, height, kind: 'pdf' }`. Écriture du projet
   et de ses images dans **une seule transaction** validée au `complete` ;
   si elle avorte (quota), le projet est chargé sans images et un message le
   dit — jamais d'exception, jamais de projet perdu. `removeProject` supprime
   les images. `Project` reçoit `imageCount: number` (0 pour les projets
   existants, `hydrate` tolère l'absence). Les `Blob` sont affichés par
   `URL.createObjectURL` via un service de `core/platform`, révoqués au
   changement de projet.

5. **Sauvegarde.** `BACKUP_SCHEMA_VERSION` passe à 2 : les images sont
   exportées en base64 avec le projet ; `parseBackup` accepte la version 1
   (sans images) et la 2, borne chaque image à 2 Mo et le fichier à 60 Mo, et
   refuse en bloc au-delà. L'import écrit projets et images dans une seule
   transaction, comme aujourd'hui.

6. **Affichage.** Sous le texte de l'étape, une rangée de vignettes
   (« Photo 3 »), boutons accessibles ; un clic ouvre un `Dialog` avec l'image
   en grand, boutons Précédente / Suivante entre les images de l'étape,
   fermeture au clavier. Les images du patron non rattachées (couverture,
   schémas généraux) sont dans un `Disclosure` « Photos du patron » sous les
   compteurs. Aucun style local ; classes dans `lecteur.css`.

## Mesure

- `pdf_imported` reçoit la propriété `images` (nombre extrait) ;
- `image_opened`, sans propriété.

Déclarés dans `AnalyticsEvent` **et** `EVENEMENTS`.

## Tests

- `pdf-normalize.spec.ts` : les marqueurs tombent après la bonne ligne, dans
  l'ordre, sur plusieurs pages.
- `pattern-parser.spec.ts` : chaque forme de référence de la liste du point 3
  est parcourue **en boucle**, en anglais et en français ; `[image N]` ne
  devient jamais une note ; un numéro inconnu est ignoré ; un marqueur avant
  la première étape va au patron.
- `reader-store.projects.spec.ts` (fausse IndexedDB) : import d'un PDF avec
  images → projet et images en base ; écriture avortée → projet chargé sans
  image, message, rien d'écrit à moitié ; suppression du projet → images
  supprimées ; sauvegarde v2 exportée puis réimportée à l'identique sur un
  profil vide ; sauvegarde v1 toujours acceptée.
- e2e (`e2e/pdf-images.spec.ts`) : un PDF fabriqué par `page.pdf()` depuis
  du HTML contenant deux `<img>` (JPEG en `data:`) et le texte « Row 3: … see
  image 1 » ; après import, l'étape 3 montre une vignette, le clic ouvre le
  dialogue, et le rechargement de la page retrouve l'image.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé (tout est dans le chunk
  du lecteur ou chargé par `import()`).
- Un PDF de 20 pages et 30 photos s'importe en moins de 10 s sur un portable
  ordinaire, sans geler la page (indicateur `pdfImporting` déjà présent).
- Un PDF sans image s'importe exactement comme avant (mêmes étapes, aucun
  marqueur).
- Français soigné.

## Hors périmètre

Les diagrammes vectoriels des PDF (ils ne sont pas des `XObject` : fiche 35),
la reconnaissance du contenu des images, l'impression des images, le partage
des images par lien, la retouche (recadrage, rotation) et le remplacement de
`Project.image`, qui reste la photo de couverture collée à la main.
