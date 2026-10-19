# 55 — Articles des abréviations de tricot : `k2tog`, `ssk`, `m1`, `tbl`, `magicloop`

**Étape d'entonnoir servie : acquisition (« k2tog meaning », « ssk vs k2tog »,
« m1 knit », « tricoter à l'endroit par le brin arrière » : des requêtes
précises de tricoteuses qui lisent un patron, sur des pages d'abréviation qui
n'ont aujourd'hui aucun article et ne sont donc pas indexées).**

## Pourquoi

Le produit se dit « crochet & tricot », mais les articles longs de la fiche 30
couvrent une trentaine d'entrées dont presque toutes sont du crochet ; côté tricot, seuls `co`
et `bo` ont un article. Les cinq autres entrées de tricot du glossaire (`k2tog`,
`ssk`, `m1`, `tbl`, `magicloop`) n'en ont pas, et une page d'abréviation sans
article n'est pas indexée (`term-page.ts`). Sur 28 jours, `/fr/glossaire/ms`
(qui a un article) est la deuxième page vue du site (10 vues sur 373), et Google
est la première provenance (9 sessions sur 126) : une page d'abréviation avec
article est donc une porte d'entrée qui fonctionne. L'élargir au tricot ouvre
cette porte à l'autre moitié du public, sans code nouveau. Sous le plancher de
100 sessions (45 sur 7 jours) : fiche d'acquisition, aucune conclusion sur le
comportement.

## Objectif

Cinq articles (`k2tog`, `ssk`, `m1`, `tbl`, `magicloop`), en français et en
anglais, au gabarit de la fiche 30 : les cinq pages deviennent indexables, avec
400 à 600 mots chacune.

## Fichiers à lire

- `prompts/30-contenu-abreviations.md` : gabarit, longueur, exactitude
- `src/app/features/glossary/data/articles/types.ts` et
  `src/app/features/glossary/data/articles/gestures.ts` : le type et un modèle
- `src/app/features/glossary/data/term-articles.ts` : où brancher le nouveau
  fichier
- `src/app/features/glossary/data/term-articles.spec.ts`
- `src/app/features/reader/data/glossary.ts` (`grep -n "craft: 'tricot'"`) :
  slugs réels et exemples ; ne jamais en inventer

## À faire

1. Créer `articles/knitting.ts` (`KNITTING: TermArticles`) avec les cinq
   slugs réels du glossaire, chacun en `fr` et en `en`, et l'ajouter à
   `TERM_ARTICLES`.
2. Exactitude : `k2tog` (deux mailles tricotées ensemble, diminution penchée à
   droite), `ssk` (glisser deux mailles comme pour les tricoter, une par une,
   puis les tricoter ensemble par le brin arrière, penchée à gauche), `m1`
   (relever le fil entre deux mailles et le tricoter par le brin arrière :
   préciser `m1l` / `m1r` seulement si le glossaire les distingue), `tbl`,
   `magicloop`. Pour « US ou UK ? » : dire « identique » quand c'est le cas.
   Dans le doute, écrire moins plutôt que faux.
3. Chaque article relie, par le texte, les diminutions entre elles (`k2tog` ↔
   `ssk`) et renvoie vers la page des tailles d'aiguilles (`needleSizes`) quand
   c'est pertinent.
4. Vérifier que les cinq pages entrent dans le sitemap
   (`tools/generate-sitemap.mjs`) et sont reliées par le maillage des voisins
   existant ; sinon corriger le maillage, pas le sitemap à la main.

## Mesure

Aucun nouvel événement : pages vues des cinq URL et provenance `google.com`.
Seuil de la vérification, huit semaines après la mise en ligne : au moins 5 vues
par mois cumulées sur les cinq pages, dont une venue de Google.

## Tests

- `term-articles.spec.ts` : étendre la boucle existante aux cinq slugs :
  article en `fr` et en `en`, 400 à 600 mots, au moins deux gestes et une
  erreur fréquente ; aucun slug de `TERM_ARTICLES` absent du glossaire.
- `term-page.spec.ts` : une des cinq pages rend les cinq `<h2>` d'article.
- Pré-rendu : les cinq pages sont `index` (pas `noIndex`) et dans le sitemap.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé (les textes vivent dans
  le chunk paresseux de `term-page`).
- Au moins 450 mots propres dans le HTML pré-rendu de `/glossary/k2tog` et
  `/fr/glossaire/k2tog`, hors navigation.
- Français soigné : article devant chaque nom de maille, espaces insécables.

## Hors périmètre

Nouvelles entrées de glossaire (`kfb`, `psso`, `sl1`…), nouvelles routes,
modification de `term-page.ts`, toute monétisation (lot 8 gelé).
