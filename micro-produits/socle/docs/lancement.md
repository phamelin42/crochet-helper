# Mise en ligne — @@NOM@@

`npm run lancement` vérifie les points marqués (auto). Les autres se font à la
main, dans l'ordre.

## Avant le premier déploiement

1. Acheter le domaine `@@DOMAINE@@` (ou corriger `produit.json` → `domaine`).
2. Compléter `produit.json` → `editeur` (nom, statut et SIREN, adresse,
   contact). (auto)
3. `npm run icones`, vérifier le rendu, commiter `public/icons/`. (auto)
4. Créer le site dans Umami, recopier son identifiant dans
   `produit.json` → `mesure.siteId`. (auto)
5. Créer le projet Vercel sur ce dépôt (build et sortie lus dans
   `vercel.json`), brancher le domaine.

## Search Console

6. Ajouter la propriété « domaine » `@@DOMAINE@@`, ou à défaut « préfixe
   d'URL » avec la balise : recopier le jeton dans
   `produit.json` → `mesure.googleVerification`. (auto)
7. Soumettre `https://@@DOMAINE@@/sitemap.xml`.
8. Inspecter l'URL `/` et demander l'indexation.

## Rapport mensuel

9. Secrets du dépôt : `UMAMI_URL`, `UMAMI_TOKEN`, `UMAMI_WEBSITE_ID`,
   `GSC_SERVICE_ACCOUNT` (clé JSON d'un compte de service ajouté en lecture
   seule à la propriété), `GSC_PROPRIETE` (`sc-domain:@@DOMAINE@@`),
   `CLAUDE_CODE_OAUTH_TOKEN`.
10. Lancer « Rapport mensuel » à la main (`workflow_dispatch`) pour valider la
    lecture des deux sources.

## Dépôt GitHub

11. Protection de `main` : check « Lint · format · tests · build » requis.
12. « Allow auto-merge » coché (fusion des mises à jour Dependabot).
13. Créer le label `rapport`.

## Contrôle final, sur le site en ligne

- Lighthouse mobile : PWA installable, performance ≥ 90.
- L'invite d'installation apparaît (Chrome Android) ; le mode d'emploi iOS
  s'affiche sur Safari iPhone.
- Couper le réseau, recharger : l'accueil s'affiche.
- Umami reçoit une visite depuis le vrai domaine.
