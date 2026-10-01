# Mise en ligne d'un produit

`npm run lancement -- <slug>` vérifie les points marqués (auto). Les autres se
font à la main, dans l'ordre.

## Avant le premier déploiement

1. Acheter le domaine (ou corriger `produits.json` → `domaine`, puis le
   `produit.json` du produit).
2. Compléter l'éditeur (nom, statut et SIREN, adresse, contact) dans
   `produits.json` → `editeur` et dans chaque `produit.json` déjà créé. (auto)
3. `npm run icones -- <slug>`, vérifier le rendu, commiter `public/icons/`. (auto)
4. Rédiger tout le contenu (`prompts/<slug>/02-contenu-editorial.md`). (auto)
5. Créer le site dans Umami, recopier son identifiant dans `produit.json` →
   `mesure.siteId`. (auto)
6. Créer le projet Vercel sur ce dépôt, **racine `projects/<slug>`**, avec
   l'option « inclure les fichiers hors de la racine » ; installation, build
   et sortie sont lus dans son `vercel.json`. Brancher le domaine.

## Search Console

7. Ajouter la propriété « domaine », ou à défaut « préfixe d'URL » : recopier
   le jeton de la balise dans `produit.json` → `mesure.googleVerification`.
   (auto)
8. Ajouter le compte de service du rapport mensuel en lecture seule.
9. Soumettre `https://<domaine>/sitemap.xml`, inspecter `/` et demander
   l'indexation.

## Une fois pour tout le workspace

- Secrets : `UMAMI_URL`, `UMAMI_TOKEN`, `GSC_SERVICE_ACCOUNT`,
  `CLAUDE_CODE_OAUTH_TOKEN`. L'identifiant Umami et la propriété Search
  Console de chaque produit se lisent dans son `produit.json`.
- Protection de `main` : check « Lint · format · tests · build » requis ;
  « Allow auto-merge » coché ; label `rapport` créé.

## Contrôle final, sur le site en ligne

- Lighthouse mobile : PWA installable, performance ≥ 90.
- L'invite d'installation apparaît (Chrome Android) ; le mode d'emploi iOS
  s'affiche sur Safari iPhone.
- Couper le réseau, recharger : l'accueil s'affiche.
- Umami reçoit une visite depuis le vrai domaine.
