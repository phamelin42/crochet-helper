# 11 — Trancher la marque et migrer le domaine

## Pourquoi

Le code s'appelle `fil-patterns`, le README dit « Fil », le domaine dit
`crochet-helper.phamelin.fr`. Trois noms pour un produit. Et un sous-domaine
personnel est un signal d'amateurisme sur un marché où l'on demandera bientôt de
la confiance.

Cette tâche se fait **maintenant** : changer de domaine après avoir accumulé du
référencement coûte des mois de trafic.

## Décision préalable — bloquante

Le nom et le domaine sont une décision du propriétaire du projet, pas de l'agent.
**Si le domaine cible n'est pas fourni dans la consigne, arrête-toi et demande-le.**
N'invente pas de nom.

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
3. Ajouter les redirections 301 de l'ancien domaine vers le nouveau, route par
   route, dans `vercel.json` et `netlify.toml`. Une redirection globale vers la
   racine est un échec : chaque URL doit atterrir sur son équivalent.
4. Aligner le nom dans `package.json`, `README.md`, `manifest.webmanifest`
   (`name`, `short_name`), les métadonnées Open Graph et les `<title>` par défaut.
5. Noter dans `docs/` la marche à suivre Search Console : nouvelle propriété,
   outil de changement d'adresse, soumission du nouveau sitemap. L'agent ne peut
   pas le faire lui-même.

## Critères d'acceptation

- `npm run verify` vert.
- `dist/fil-patterns/browser/sitemap.xml` ne contient que des URL du nouveau domaine.
- `check-prerender.mjs` confirme que chaque page annoncée est présente et canonique.
- Aucune occurrence de `phamelin.fr` ni de `vercel.app` ne subsiste dans `src/`,
  hors fichier de redirection.
- Les trois noms sont réduits à un seul dans tout le dépôt.

## Hors périmètre

Refonte visuelle, nouveau logo, changement de charte. On renomme, on ne redessine pas.
