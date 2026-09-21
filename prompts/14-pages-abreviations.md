# 14 — Une page par abréviation

## Pourquoi

Le socle de référencement du projet est excellent et ne sert presque à rien :
six pages indexables au total. Les 51 abréviations du glossaire sont regroupées
sur une seule page, alors que chacune correspond à une requête distincte et
récurrente (« what does sc mean in crochet », « ms crochet signification »).

Attention au piège : une page qui **répond seulement** à la question se fait
absorber par les réponses générées de Google, et le clic n'arrive jamais. Chaque
page doit donc **faire quelque chose**, pas seulement définir.

## Objectif

Plus de 100 pages pré-rendues, générées depuis `glossary.ts`, chacune embarquant
un lecteur utilisable.

## Fichiers à lire

- `src/app/features/reader/data/glossary.ts` — la structure `GlossaryEntry`
- `src/app/features/glossary/glossary-page.ts` — le balisage `DefinedTermSet` existant
- `src/app/core/i18n/route-paths.ts` et `route-paths.json`
- `src/app/app.routes.ts` — comment l'arbre est construit par langue
- `src/app/app.routes.server.ts` — comment les routes à pré-rendre sont déclarées
- `src/app/core/seo/seo.service.ts`
- `tools/generate-sitemap.mjs`, `tools/check-prerender.mjs`

## À faire

1. Ajouter à `GlossaryEntry` un `slug` stable, dérivé du terme, et le figer par
   un test : un slug qui change casse une URL indexée.

2. Générer une route par entrée et par langue, dans les deux arbres. La
   génération doit dériver de `GLOSSARY` — aucune liste écrite à la main.

3. Déclarer ces routes au pré-rendu dans `app.routes.server.ts`. Sans cela elles
   existent mais ne sont pas dans le HTML servi, ce qui est un bug de
   référencement au sens de la règle 2.

4. Créer la page d'abréviation. Elle contient, dans cet ordre :
   - le terme, sa traduction en clair, la langue et le métier concernés ;
   - **un lecteur réduit mais réellement fonctionnel** : on colle un rang, il est
     découpé et les abréviations sont explicitées. C'est ce qui justifie le clic ;
   - les termes voisins et la variante US/UK quand elle existe ;
   - un lien vers le lecteur complet et vers le glossaire.

5. JSON-LD `DefinedTerm` par page, rattaché au `DefinedTermSet` du glossaire.
   Les `hreflang` relient les deux langues d'un même terme.

6. Vérifier que `generate-sitemap.mjs`, qui dérive déjà de la table de routes,
   les reprend sans modification. S'il faut le modifier, c'est que la génération
   de routes n'est pas au bon endroit.

7. **Mesurer le temps de build.** Passer de 6 à plus de 100 routes pré-rendues
   peut faire exploser la CI. Si le build dépasse cinq minutes, signale-le avec
   le chiffre avant/après plutôt que de contourner.

## Critères d'acceptation

- `npm run verify` vert.
- Plus de 100 pages dans `dist/fil-patterns/browser`, toutes listées au sitemap.
- Le texte de chaque page est présent dans le HTML servi, JavaScript désactivé.
- Le lecteur réduit fonctionne sur chaque page, sans naviguer ailleurs.
- `check-prerender.mjs` vert : toutes présentes, toutes canoniques.
- Un test fige les slugs existants.

## Hors périmètre

Rédiger du contenu éditorial long par abréviation. Illustrations et vidéos.
Ajouter des termes au glossaire — on publie les 51 qui existent.
