# 04 — Trois pages éditoriales pour le référencement

## Problème

Le site n'a que trois pages par langue. Le glossaire capte les recherches
d'abréviations, mais rien ne capte les questions que se posent réellement les
débutantes — et ce sont elles qui amènent du trafic durable.

## Objectif

Ajouter trois pages de contenu, en français et en anglais, entièrement
pré-rendues, maillées avec le lecteur.

| Route FR                   | Route EN                     | Intention de recherche visée           |
| -------------------------- | ---------------------------- | -------------------------------------- |
| `/guide/lire-un-patron`    | `/guide/reading-a-pattern`   | « comment lire un patron de crochet »  |
| `/guide/lire-un-diagramme` | `/guide/reading-a-chart`     | « comprendre un diagramme de crochet » |
| `/guide/crochet-ou-tricot` | `/guide/crochet-or-knitting` | « différence crochet tricot »          |

## Fichiers à lire

- `src/app/features/glossary/glossary-page.ts` (le modèle à suivre : contenu par
  langue, `SeoService`, JSON-LD)
- `src/app/core/i18n/route-paths.ts`
- `src/app/app.routes.ts`
- `src/app/core/seo/seo.service.ts`
- `tools/generate-sitemap.mjs`

## À faire

1. Créer `src/app/features/guides/` avec **un composant par guide**, sur le
   modèle de `GlossaryPage` : contenu porté par une constante
   `Record<Locale, …>`, `SeoService.apply(...)` dans le constructeur.
2. Étendre `ROUTE_PATHS` avec les trois entrées, puis `app.routes.ts` — les
   routes se génèrent déjà pour les deux langues, n'écris pas deux arbres.
3. Mettre à jour `ALTERNATES` dans `tools/generate-sitemap.mjs`.
4. **Le contenu compte plus que le code.** Chaque page : 700 à 1000 mots utiles,
   un `<h1>` unique, des `<h2>` qui reprennent des formulations de recherche
   réelles, des exemples concrets tirés du domaine (« Rang 3 : [ms, aug] x 6 (18) »
   se lit ainsi…). Pas de remplissage, pas de promesse marketing. Écris comme
   quelqu'un qui a un crochet en main.
5. JSON-LD : `Article` sur chaque guide, plus un bloc `FAQPage` sur
   « lire-un-patron » avec trois à cinq questions réellement posées.
6. Maillage interne : chaque guide renvoie au lecteur et au glossaire ;
   l'accueil gagne une section renvoyant aux trois guides.

## Critères d'acceptation

- `npm run build` annonce **12 routes pré-rendues** (6 existantes + 6 guides).
- `dist/fil-patterns/browser/guide/lire-un-patron/index.html` contient le texte
  intégral de la page sans exécution de JavaScript (`grep` sur une phrase du
  corps).
- `canonical` et les trois `hreflang` sont corrects sur chaque nouvelle page ;
  la version anglaise pointe la française et réciproquement.
- `sitemap.xml` liste 12 URL avec leurs alternates.
- Aucun style local : uniquement `.prose`, `.card`, `.hr` et les jetons.

## Hors périmètre

Un CMS, du Markdown chargé à l'exécution, des images. Le contenu est écrit en
TypeScript comme celui du glossaire — c'est ce qui garantit qu'il est pré-rendu.
