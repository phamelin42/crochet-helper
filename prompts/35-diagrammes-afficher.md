# 35 — Diagrammes de crochet : les charger, les voir en grand, les épingler

**Étape d'entonnoir servie : activation (les patrons à diagramme, napperons,
motifs, amigurumis japonais, sont aujourd'hui inutilisables dans le lecteur).**

## Pourquoi

Beaucoup de patrons sont donnés en diagramme (symboles) plutôt qu'en texte, ou
en plus du texte. Le lecteur ne sait rien en faire : le diagramme d'un PDF est
un dessin vectoriel, pas une image incorporée (la fiche 34 ne le voit pas), et
une photo de diagramme collée devient la « photo de couverture ». La lectrice
a besoin de trois choses : mettre son diagramme dans le projet, le voir en
grand crochet en main (zoom, rotation), et l'avoir sous les yeux pendant la
pièce qu'il décrit. La légende des symboles doit être à portée de main.

## Objectif

Un projet peut porter un ou plusieurs diagrammes (image chargée ou page de
PDF), affichés dans un panneau du lecteur avec zoom et rotation, épinglés à
une pièce, avec une légende des symboles standard en français et en anglais.
Aucune reconnaissance automatique ici : c'est la fiche 37.

## Fichiers à lire

- `prompts/34-images-du-pdf.md` — le stockage des images (`objectStore`
  `images`, `kind`), les `Blob`, la sauvegarde v2 : cette fiche s'appuie
  dessus. Si la 34 n'est pas fusionnée, s'arrêter et le dire.
- `src/app/features/reader/data/pdf-extract.ts` — pdf.js ; `page.render`
  pour obtenir une page en image
- `src/app/features/reader/state/reader-store.ts`, `data/project.model.ts`
- `src/app/features/reader/components/pattern-import.ts` (entrée de fichier),
  `step-view.ts` (`.pieces`, `Segmented` des pièces), `pages/reader-page.ts`
  (`onPaste`, `onDrop`)
- `src/app/features/guides/pages/reading-chart-page.ts` — le guide « lire un
  diagramme », section `h2Symbols`
- `src/app/shared/ui/dialog/`, `disclosure/`, `segmented/`
- `CLAUDE.md`, « Pièges » : aucune valeur brute de style, API navigateur par
  `core/platform`, entrée bornée, `NgOptimizedImage`

## À faire

1. **Charger un diagramme.** Dans le panneau d'import, un bouton « Ajouter un
   diagramme » : image PNG / JPEG / WebP (≤ 10 Mo, réduite à ≤ 2400 px de
   côté, encodée en JPEG 0,85 ; un diagramme a besoin de plus de définition
   qu'une photo), ou un PDF dont on choisit les pages : chaque page est rendue
   par `page.render` à l'échelle 2 en vignette, la lectrice coche celles qui
   contiennent un diagramme (au plus 10). Le collage et le dépôt d'une image
   sur la page demandent désormais « Photo de couverture ou diagramme ? »
   (`Dialog`) au lieu de remplacer la couverture en silence. Stockage dans
   l'`objectStore` `images` avec `kind: 'chart'`.

2. **Panneau « Diagramme ».** Un `Disclosure` sous l'étape, ouvert par défaut
   dès qu'un diagramme existe pour la pièce en cours : l'image dans un cadre
   défilable, boutons Zoom +, Zoom −, Ajuster, Tourner (90°), Plein écran
   (`Dialog` avec les mêmes commandes). Le zoom est un `transform: scale()`
   piloté par un signal, avec pincement au doigt laissé au navigateur
   (`touch-action` adapté) ; jetons et classes dans `lecteur.css`, aucune
   bibliothèque.

3. **Épingler.** Un `Segmented` « Pour la pièce : … » dans le panneau lie le
   diagramme à une pièce (`Project.charts: Record<number, number>`, pièce →
   image ; « Tout le patron » quand il n'y a qu'une pièce). Changer de pièce
   affiche son diagramme ; une pièce sans diagramme montre « Aucun diagramme
   pour cette pièce », avec le choix des autres. `parseBackup`, `hydrate` et
   `persist` connaissent `charts` (absent → `{}`).

4. **Légende des symboles.** `src/app/features/reader/data/chart-symbols.ts` :
   les symboles standard (norme du Craft Yarn Council) avec, pour chacun,
   l'identifiant, l'abréviation US, UK et FR, le nom FR / EN et le fichier SVG
   `public/symbols/<id>.svg` (trait noir sur fond transparent, 64 × 64,
   ≤ 1 Ko chacun, dessinés par toi) : `ch`, `sl-st`, `sc`, `hdc`, `dc`, `tr`,
   `dtr`, `magic-ring`, `ch-space`, `sc-inc`, `dc-inc`, `sc2tog`, `dc2tog`,
   `dc3tog`, `picot`, `fpdc`, `bpdc`, `blo`, `flo`, `cluster`, `puff`,
   `popcorn`, `shell`. Un bouton « Légende » dans le panneau ouvre la liste
   (symbole, abréviation dans la convention de la page, nom), et le guide
   « lire un diagramme » gagne un vrai tableau des symboles, pré-rendu, généré
   depuis ces données (SEO : « symboles diagramme crochet », « crochet chart
   symbols »).

## Mesure

- `chart_added` avec `source: 'image' | 'pdf'` ;
- `chart_viewed`, sans propriété, une fois par session de lecture et par
  diagramme (à l'ouverture du panneau ou du plein écran).

Déclarés dans `AnalyticsEvent` **et** `EVENEMENTS`.

## Tests

- `chart-symbols.spec.ts` : chaque symbole (boucle) a ses trois abréviations,
  ses deux noms et un fichier SVG existant (contrôle dans `tools/`, lancé par
  le build, puisqu'une spec Angular n'a pas les types Node).
- `reader-store.projects.spec.ts` : ajout d'un diagramme → image en base avec
  `kind: 'chart'` ; épinglage persistant ; écriture avortée → rien de
  perdu ; sauvegarde v2 conserve `charts`.
- Composant : zoom borné (0,5 à 4), rotation cyclique, changement de pièce
  → bon diagramme.
- e2e (`e2e/charts.spec.ts`) : charger un PNG de test (`tools/fixtures/`),
  l'épingler à la pièce 2 de l'exemple, passer à la pièce 2 → panneau ouvert
  avec l'image ; recharger la page → toujours là ; à 320 px, aucun débordement
  horizontal, le zoom reste dans son cadre.
- Le guide « lire un diagramme » : le tableau des symboles est dans le HTML
  pré-rendu des deux langues (`check-prerender.mjs` et un `grep` sur `dist/`).

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé.
- Un diagramme de 2400 px se manipule sans à-coups sur tablette.
- Aucun symbole inventé : les 23 identifiants ci-dessus, dessinés d'après la
  norme, rien d'autre.
- Français soigné.

## Hors périmètre

Lire ou reconnaître les symboles (fiche 37), transcrire un diagramme en texte
(fiche 36), annoter le diagramme, suivre le rang en cours sur le diagramme, les
diagrammes de tricot (symboles différents, fiche ultérieure), tout service
externe.
