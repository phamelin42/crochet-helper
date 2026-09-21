# 15 — Convertisseur d'abréviations US ↔ UK

## Pourquoi

C'est la douleur numéro un du crochet anglophone : `dc` désigne une bride aux
États-Unis et une maille serrée au Royaume-Uni. Se tromper ruine un ouvrage
entier. La requête est fréquente, transactionnelle — donc peu exposée aux
réponses générées — et les données sont déjà dans le dépôt.

## Objectif

Une page autonome qui convertit un patron entier d'une convention à l'autre, et
un enrichissement du glossaire qui servira aussi aux pages d'abréviations.

## Fichiers à lire

- `src/app/features/reader/data/glossary.ts`
- `src/app/features/reader/data/glossary.spec.ts`
- `src/app/features/reader/data/pattern-parser.ts` — la tokenisation existante
- `src/app/features/glossary/glossary-page.ts` — modèle d'une page simple
- `src/app/core/seo/seo.service.ts`

## À faire

1. Enrichir `GlossaryEntry` d'un champ :

   ```ts
   readonly region?: 'US' | 'UK';
   ```

   et ajouter les paires manquantes. Le cœur du sujet est le décalage d'un cran
   entre les deux conventions : `sc`(US)↔`dc`(UK), `dc`(US)↔`tr`(UK),
   `hdc`(US)↔`htr`(UK), `tr`(US)↔`dtr`(UK). Complète le reste.

2. Créer `src/app/features/converter/data/convert-terms.ts` :

   ```ts
   export function convertTerms(text: string, from: 'US' | 'UK', to: 'US' | 'UK'): ConversionResult;
   ```

   `ConversionResult` expose le texte converti **et** la liste des remplacements
   effectués : la lectrice doit pouvoir vérifier, pas faire confiance.

   Contraintes de correction, à couvrir par des tests :
   - ne remplacer que des jetons entiers — `dc` dans « dcs » ou « abcdc » ne se
     touche pas ;
   - préserver la casse d'origine (`DC` reste majuscule) ;
   - ne jamais convertir deux fois le même jeton ;
   - laisser intacts les nombres, la ponctuation et les termes sans équivalent,
     et les signaler dans le résultat.

3. Créer la page `features/converter/`, avec sa route dans les deux langues et
   son pré-rendu. Interface : un champ, un sélecteur `Segmented` US/UK
   (composant existant), le résultat, et la liste des remplacements.

4. Aucun style local : `shared/ui` uniquement.

5. SEO complet : `title`, description, JSON-LD, Open Graph, `hreflang`.

6. Instrumenter `conversion_run` avec `from`, `to` et le nombre de remplacements.

7. Afficher la variante sur la page d'abréviation
   (`src/app/features/glossary/pages/term-page.ts`, livrée par la fiche 14) :
   sur `/glossary/dc`, dire en tête qu'un patron britannique emploie `dc` pour
   la maille serrée, et lier la page de l'équivalent. La fiche 14 l'a laissé
   faute de données ; c'est le champ `region` qui les apporte.

   Chaque nouvelle entrée du glossaire devient une page : lui donner un
   `example` (un rang réaliste dans sa propre notation) et une `lang`, et
   ajouter son slug à `PUBLISHED_SLUGS` dans `glossary.spec.ts`. Ne jamais
   modifier un slug déjà publié.

## Critères d'acceptation

- `npm run verify` vert.
- Tests couvrant : jeton partiel non converti, casse préservée, double
  conversion impossible, terme sans équivalent signalé.
- La page est pré-rendue dans les deux langues et présente au sitemap.
- Le résultat affiche les remplacements faits, pas seulement le texte final.

## Hors périmètre

Convertir les unités (crochets en mm ou en lettres américaines) — c'est une
autre fiche. Traduire le patron d'une langue à l'autre. Deviner la convention
d'origine automatiquement : c'est la lectrice qui la choisit.
