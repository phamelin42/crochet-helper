# 37 — Reconnaissance automatique des symboles : étude bornée, puis décision

**Étape d'entonnoir servie : activation. Fiche d'étude : elle livre des
mesures et une décision, pas une fonctionnalité.**

## Pourquoi

Phil veut « uploader et traduire un diagramme ». Les fiches 35 et 36 donnent
l'affichage et la transcription assistée ; la traduction **automatique**
(image → rangs écrits) est une reconnaissance de symboles sur une grille
souvent radiale, parfois photographiée de travers, avec des symboles collés
les uns aux autres. Personne ne sait aujourd'hui si c'est faisable dans le
navigateur avec une qualité acceptable, ni ce que ça pèserait. Il ne faut ni
promettre une fonction qui lit un diagramme sur deux, ni ajouter un serveur
sans décision : la règle n° 1 du dépôt l'interdit.

## Objectif

Mesurer, sur des diagrammes réels et synthétiques, ce qu'une reconnaissance
**dans le navigateur, sans réseau** donne, et rendre une décision chiffrée :
go (une fiche 38 d'intégration) ou no-go (un ADR qui présente l'option
serveur à Phil). Rien de cette étude n'entre dans l'application tant que la
décision n'est pas prise.

## Fichiers à lire

- `src/app/features/reader/data/chart-symbols.ts` et `public/symbols/`
  (fiche 35) — les gabarits ; si la 35 n'est pas fusionnée, s'arrêter et le
  dire
- `src/app/features/reader/data/chart-composer.ts` (fiche 36) — la sortie
  attendue (`Round`, `renderPattern`)
- `tools/render-pin.mjs` — Playwright depuis `tools/`, pour exécuter du code
  navigateur sur des images hors de l'application
- `docs/adr-001-mesure-audience.md` — la forme d'un ADR du dépôt
- `CLAUDE.md`, règle n° 1 (aucun back-end, aucun appel réseau) et « Pièges » :
  énumérations en boucle, un garde-fou non branché ne garde rien

## À faire

1. **Jeu d'essai**, `tools/fixtures/charts/` : dix diagrammes synthétiques
   générés par un script (`tools/charts/generate.mjs`) à partir des SVG de la
   fiche 35 (tours en rond de 1 à 8, rangs à plat, avec rotation des symboles
   le long du cercle, deux tailles de trait, un léger bruit), chacun avec sa
   transcription attendue (`*.expected.txt`, syntaxe du lecteur) ; et les
   diagrammes réels que Phil dépose dans `tools/fixtures/charts/real/`
   (images de patrons libres de droits ou ses propres photos), avec leur
   transcription écrite à la main. Sans diagramme réel déposé, l'étude ne
   mesure que le synthétique et le dit.

2. **Prototype**, `tools/charts/recognize.mjs`, exécuté dans Chromium par
   Playwright, code navigateur pur (canvas, `ImageData`), aucune dépendance
   nouvelle en production, aucune requête réseau :
   binarisation → composantes connexes → descripteurs simples par composante
   (taille, rapport largeur / hauteur, nombre de trous, extrémités de
   squelette) → plus proche gabarit parmi les symboles rendus à plusieurs
   échelles et rotations → regroupement en tours (tri polaire : rayon puis
   angle autour du centre) ou en rangs (regroupement par ordonnée) →
   `Round[]` → `renderPattern`. Chaque étape a une trace lisible (image
   annotée en sortie, `tools/charts/out/`).

3. **Mesures**, écrites dans `docs/etude-diagrammes-2026-10.md` : par
   diagramme, taux de symboles reconnus (bonne classe, bonne position), taux
   de tours dont le compte de mailles est juste, temps de traitement, et le
   poids qu'aurait le code dans un chunk paresseux. Chiffres bruts dans un
   tableau, méthode reproductible par une commande (`npm run etude:charts`).

4. **Décision**, dans le même document :
   - **Go** si ≥ 90 % des symboles sur le synthétique **et** ≥ 70 % sur le
     réel, en moins de 5 s par diagramme sur le portable de la CI, pour un
     chunk ≤ 300 Ko. Alors rédiger `prompts/38-diagrammes-reconnaissance.md`
     (intégration derrière le composeur de la fiche 36 : la reconnaissance
     **pré-remplit** le composeur, la lectrice corrige, rien n'est écrit sans
     elle) et marquer la 38 « À faire ».
   - **No-go** sinon : `docs/adr-002-reconnaissance-diagrammes.md`, qui
     constate le résultat, décrit l'option d'un service externe (un modèle de
     vision appelé depuis un petit serveur : ce que ça coûterait par
     diagramme, ce qui quitterait l'appareil, ce que ça change à l'ADR-001 et
     à la règle n° 1), et pose les questions à Phil dans la forme de la fiche
     20. Aucun code serveur, aucune clé, aucune dépendance.

## Mesure

Aucun événement : rien n'est livré aux lectrices.

## Tests

- `tools/charts/recognize.test.mjs` : sur trois diagrammes synthétiques
  simples (un tour, deux tours, un rang à plat), la transcription est exacte ;
  ce test tourne dans `npm run test:tools` pour que le prototype reste
  exécutable après l'étude.
- Le document d'étude cite la commande et le commit qui ont produit chaque
  chiffre.

## Critères d'acceptation

- `npm run verify:ci` vert ; **bundle initial et chunks de l'application
  inchangés** : l'étude vit dans `tools/`, `docs/` et `prompts/`.
- Le document d'étude tient la décision en une phrase en tête, puis les
  chiffres ; un lecteur pressé sait en dix secondes si c'est go ou no-go.
- Aucun appel réseau dans le prototype (vérifié : Playwright avec
  `route('**', abort)` sauf `about:blank`).

## Hors périmètre

Intégrer la reconnaissance dans l'application (fiche 38, si go), toute API
externe ou serveur, l'OCR du texte des diagrammes, les diagrammes de tricot,
plus de 200 tours d'agent : si le prototype n'atteint pas les seuils dans ce
budget, c'est un no-go documenté, pas une fiche inachevée.
