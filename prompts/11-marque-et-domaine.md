# 11 — Trancher la marque et migrer le domaine

## Pourquoi

Le code s'appelle `fil-patterns`, le README dit « Fil », le domaine dit
`crochet-helper.phamelin.fr`. Trois noms pour un produit. Et un sous-domaine
personnel est un signal d'amateurisme sur un marché où l'on demandera bientôt de
la confiance.

Cette tâche se fait **maintenant** : changer de domaine après avoir accumulé du
référencement coûte des mois de trafic.

## Décision prise

- **Nom affiché :** « Pattern Reader », partout où une personne le lit.
- **Origine canonique :** `https://patternreader.com`, sans `www`.
- **Ancienne origine à rediriger :** `https://crochet-helper.phamelin.fr`.
- **Identifiant technique inchangé :** `fil-patterns` reste le nom du projet
  Angular, donc aussi le dossier `dist/fil-patterns/browser`. `vercel.json`,
  `netlify.toml` et quatre scripts de `tools/` en dépendent ; le renommer
  casserait le déploiement pour un gain nul.

## Condition de fusion — à écrire en tête de la PR

Le nouveau domaine doit servir le site **avant** que cette PR soit fusionnée.
Sinon les redirections envoient toutes les visiteuses vers un domaine qui ne
répond pas. Écris-le comme premier « point à relire en priorité » : « Ne fusionner
qu'une fois https://patternreader.com affiché correctement. »

## Objectif

Un seul nom partout, un domaine propre, et aucune URL cassée.

## Fichiers à lire

- `src/app/core/seo/site.ts` — le jeton `SITE_ORIGIN`
- `src/app/core/seo/seo.service.ts`
- `tools/generate-sitemap.mjs`
- `vercel.json`, `netlify.toml`
- `package.json`, `README.md`, `public/manifest.webmanifest`

## À faire

1. Remplacer l'origine : jeton d'injection dans `core/seo/site.ts` et variable
   d'environnement `SITE_ORIGIN` au build, sur les deux hébergeurs.
2. Vérifier la régénération de `sitemap.xml`, `robots.txt`, des `canonical` et
   des `hreflang` (dont `x-default`) avec la nouvelle origine.
3. Ajouter les redirections 301 de l'ancien domaine vers le nouveau, dans
   `vercel.json` et `netlify.toml`, en conservant le chemin : une règle filtrée
   sur l'hôte `crochet-helper.phamelin.fr` qui renvoie `/<chemin>` vers
   `https://patternreader.com/<chemin>` convient. Une redirection de toutes les
   pages vers la racine est un échec : chaque URL doit atterrir sur son
   équivalent.
4. Remplacer « Fil » et « Crochet helper » par « Pattern Reader » dans tout ce
   qui s'affiche : `README.md`, `manifest.webmanifest` (`name`, `short_name`),
   les métadonnées Open Graph, les `<title>` par défaut, les traductions. Le
   champ `name` de `package.json` peut devenir `pattern-reader`.
5. Noter dans `docs/` la marche à suivre manuelle, que l'agent ne peut pas
   faire lui-même : garder l'ancien domaine attaché au projet Vercel (les
   redirections passent par lui), puis dans la Search Console créer la nouvelle
   propriété, utiliser l'outil de changement d'adresse et soumettre le nouveau
   sitemap.

## Critères d'acceptation

- `npm run verify` vert.
- `dist/fil-patterns/browser/sitemap.xml` ne contient que des URL du nouveau domaine.
- `check-prerender.mjs` confirme que chaque page annoncée est présente et canonique.
- Aucune occurrence de `phamelin.fr` ni de `vercel.app` ne subsiste dans `src/`,
  hors fichier de redirection.
- Plus aucun texte visible ne dit « Fil » ni « Crochet helper ».
- `fil-patterns` n'apparaît plus que comme identifiant technique : projet
  Angular, dossier `dist/`, scripts de `tools/`.

## Hors périmètre

Refonte visuelle, nouveau logo, changement de charte. On renomme, on ne redessine pas.
Renommer le projet Angular ou le dossier de sortie `dist/fil-patterns`.
