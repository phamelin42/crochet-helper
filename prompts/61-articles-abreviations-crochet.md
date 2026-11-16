# 61 — Articles des abréviations de crochet restantes : `sc2tog`, `dc2tog`, `dc3tog`, `fpdc`, `bpdc`, `picot`, `shell`, `bobble`

**Étape d'entonnoir servie : acquisition (« dc3tog meaning », « fpdc bpdc
difference », « picot crochet », « shell stitch crochet » : des requêtes précises
de crocheteuses qui lisent un patron, sur des pages d'abréviation qui n'ont
aujourd'hui aucun article et ne sont donc pas indexées).**

## Pourquoi

Les fiches 30 et 55 ont donné un article à la plupart des entrées du glossaire.
Il en reste une vingtaine sans article ; huit sont des mailles ou des
diminutions que les patrons emploient tous les jours : `sc2tog`, `dc2tog`,
`dc3tog`, `fpdc`, `bpdc`, `picot`, `shell`, `bobble`. Une page d'abréviation
sans article n'est pas indexée (`term-page.ts`). Sur 28 jours (19/10 au 15/11),
deux pages d'abréviation sont vues (`/fr/glossaire/dbr`, `/fr/glossaire/dc3tog`,
une vue chacune) et la recherche reste la provenance principale (Bing 5, DuckDuckGo 3,
Google 1 sur 39 visiteuses). La file des fiches est vide : élargir la porte
d'entrée qui existe est la suite la moins chère du plan. Sous le plancher de
100 sessions (12 sur 7 jours) : fiche d'acquisition, aucune conclusion sur le
comportement.

## Objectif

Huit articles, en français et en anglais, au gabarit de la fiche 30 : les huit
pages deviennent indexables, avec 400 à 600 mots chacune, questions fréquentes
comprises, et des liens vers les entrées voisines (`term-neighbors.ts`).

## Fichiers à lire

- `prompts/30-contenu-abreviations.md` et `prompts/55-articles-abreviations-tricot.md` :
  gabarit, longueur, exactitude
- `src/app/features/glossary/data/term-articles.ts` et un fichier de
  `articles/` (`grep -n "k2tog" articles/knitting.ts`) : forme d'un article
- `src/app/features/glossary/data/term-articles.spec.ts` : ce que le test exige
- `CLAUDE.md`, « Pièges » : français soigné (article devant un nom de maille,
  espaces insécables), une fiche qui énumère les formes les parcourt toutes

## À faire

1. Écrire les huit articles dans un nouveau fichier `articles/` (un par
   famille : diminutions, mailles en relief, décors) et les déclarer dans
   `term-articles.ts`.
2. Étendre `term-articles.spec.ts` : chaque terme de la liste a un article FR
   et EN dans la longueur demandée (boucle sur les huit).
3. Vérifier que les huit pages sortent du sitemap pré-rendu comme les autres
   pages à article.

## Mesure

Au moins 5 vues par mois cumulées sur les huit pages, dont une venue d'un moteur
de recherche, huit semaines après la mise en ligne.

## Hors périmètre

Les entrées restantes (`rsc`, `rnd`, `flo`, `fphdc`, `bphdc`, abréviations de
fin de patron) : une autre fiche si ces huit pages se lisent.
