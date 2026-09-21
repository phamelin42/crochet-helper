# 13 — Ouvrir un PDF de patron

## Pourquoi

La majorité des patrons vendus circulent en PDF. Aujourd'hui Fil demande de
coller du texte : une visiteuse qui arrive avec un PDF n'a rien à coller et
repart. C'est le plus gros trou du produit et, accessoirement, la meilleure
requête de recherche du marché.

`pdf.js` extrait le texte **entièrement dans le navigateur**. La règle 1 est
donc préservée : pas de serveur, et le patron ne quitte jamais l'appareil — ce
qui règle aussi la question du droit d'auteur.

## Objectif

Déposer un PDF, en extraire le texte, le passer au parseur existant, sans
dégrader le pré-rendu ni le poids du bundle initial.

## Fichiers à lire

- `src/app/features/reader/data/pattern-parser.ts` — surtout `parsePattern`
- `src/app/features/reader/data/pattern.model.ts`
- `src/app/features/reader/data/pattern-parser.spec.ts`
- `src/app/features/reader/components/pattern-import.ts`
- `src/app/features/reader/state/reader-store.ts`
- `tools/dump-fixtures.mts`
- `angular.json` — configuration du build et budgets
- `vercel.json` / `netlify.toml` — la CSP, pour le worker

## À faire

1. **Commence par un spike, avant d'écrire la fonctionnalité.** `pdf.js` charge
   un worker séparé : vérifie qu'il fonctionne avec `outputMode: 'static'`, avec
   la CSP actuelle (`script-src 'self'`), et mesure le poids réel. Si le worker
   impose d'assouplir la CSP, **arrête-toi et signale-le** plutôt que d'élargir
   la politique de sécurité de ton propre chef.

2. Créer `src/app/features/reader/data/pdf-extract.ts` :

   ```ts
   export async function extractPdfText(file: File): Promise<string>;
   ```

   Fonction pure au sens du dépôt : aucune dépendance Angular, testable seule.
   Lève une erreur typée `PdfEmptyTextError` si le PDF ne contient aucun texte
   (cas du scan) — ce n'est pas un bug, c'est un cas métier.

3. Normaliser la sortie avant de la donner à `parsePattern`. Les PDF produisent
   des défauts systématiques qu'il faut traiter ici, pas dans le parseur :
   césures en fin de ligne, numéros de page isolés, en-têtes et pieds répétés à
   chaque page, colonnes qui s'entrelacent, espaces insécables.

4. N'adapte `parsePattern` que si les tests montrent un cas qu'il rate vraiment.
   La règle est : la normalisation vit dans `pdf-extract.ts`, le parseur reste
   agnostique de la provenance du texte.

5. Charger `pdf.js` **paresseusement**, au premier dépôt de fichier seulement.
   Un `import()` dynamique, jamais un import statique en tête de fichier.

6. Étendre le composant d'import existant au glisser-déposer et au choix de
   fichier. Réutiliser `shared/ui` — aucun style local, aucun nouveau bouton.

7. État de chargement visible, et message d'erreur explicite sur un PDF scanné,
   avec une porte de sortie vers le collage manuel. Libellé en français, sans
   jargon : la lectrice n'a pas à savoir ce qu'est l'OCR.

8. Constituer des fixtures réalistes via `tools/dump-fixtures.mts` : un patron
   sur une colonne, un sur deux colonnes, un avec en-têtes répétés, un scanné.
   Tests sur chacune.

9. Ajouter les budgets de bundle dans `angular.json` si absents, et faire échouer
   le build au dépassement.

10. Instrumenter `pdf_imported` et `pdf_failed` (fiche 10) — le taux d'échec
    pilotera la suite du travail sur le parseur.

## Critères d'acceptation

- `npm run verify` vert.
- Le bundle **initial** n'augmente pas : `pdf.js` n'apparaît que dans un chunk paresseux.
- Les quatre fixtures passent ; le PDF scanné produit `PdfEmptyTextError` et le
  message prévu, pas une erreur technique.
- Le pré-rendu reste intact : `check-prerender.mjs` vert, aucun accès à
  `window`, `document` ou `FileReader` hors garde.
- La CSP n'a pas été élargie sans que ce soit explicitement signalé dans le diff.

## Hors périmètre

L'OCR des PDF scannés — il demanderait un serveur. La lecture des diagrammes en
image. L'extraction de la mise en page ou des images du PDF. On récupère du
texte, rien d'autre.
