# ADR 002 — Un template, N produits

**Statut : acceptée par Phil le 1er octobre 2026.**

## Problème

Dix produits en dix semaines. Avec un dépôt par produit, copié d'un socle,
chaque correctif partagé (accessibilité, mesure, service worker, CSP) se
reporte dix fois à la main, et les dépôts divergent. Il faut qu'un nouveau
produit se crée en une journée, et qu'une amélioration commune profite à tous
d'un seul coup.

## Décision

Un **workspace Angular unique** :

- `libs/core` (`@mp/core`) : mesure, SEO, stockage local, plateforme (service
  worker, installation, thème), configuration du produit, offre ;
- `libs/ui` (`@mp/ui`, `@mp/ui/sections`, `@mp/ui/legal`) : coquille,
  en-tête, pied de page, invite d'installation, sections de contenu, pages
  légales, styles ;
- une application par produit dans `projects/<slug>`, qui ne contient que sa
  configuration (`produit.json`), son contenu éditorial (`contenu.json`) et
  son **module métier** ;
- un **schematic** (`schematics/produit`) qui crée l'application depuis sa
  ligne de `produits.json` : `npm run nouveau-produit -- <slug>`.

La **thématisation se fait par configuration** : couleurs, typographie
(parmi quatre piles de `tokens.css`), logo, nom, domaine, offre. Aucun fork de
composant pour changer l'apparence. Thème clair par défaut ; sombre en option
explicite, jamais déclenché par le réglage du système.

## Exception : le contenu éditorial

La structure technique est partagée ; le contenu ne l'est jamais. Dix sites
aux textes génériques quasi identiques seraient traités comme du contenu
dupliqué à grande échelle, alors que l'acquisition repose entièrement sur le
référencement. Voir `docs/contenu-unique.md`.

## Écarts au bloc d'architecture du 1er octobre

- **Pas de bannière de consentement** dans `ui`. La mesure est Umami sans
  cookie (ADR 001, choix du même jour) : exemptée de consentement par la CNIL,
  elle n'en demande pas. Une bannière ne reviendrait qu'avec un traceur qui
  l'exige, ce que l'ADR 001 exclut.
- **Pas de module de paiement** dans `core`, seulement le type de l'offre
  (`bientot` ou `active`) et la mesure d'intérêt. Les produits sortent
  gratuits ; un paiement suppose un back-end (webhooks, droits), donc un ADR
  écrit quand un produit montre du trafic (seuil dans `docs/tunnel.md`).

## Conséquences

- Une modification de `libs/` touche tous les produits : elle passe seule en
  PR, relue par Phil, et la CI construit et audite toutes les applications.
- Le déploiement reste un projet Vercel par produit, chacun avec son
  domaine ; la racine du projet Vercel est `projects/<slug>`, dont le
  `vercel.json` construit depuis le workspace.
- Les noms d'événements sont communs : les rapports se comparent d'un produit
  à l'autre.
- Ce workspace vit pour l'instant dans le dépôt de Pattern Reader
  (`micro-produits/`), vérifié par son propre workflow. Il est conçu pour en
  sortir tel quel dans un dépôt dédié (ses `.github/` et `.claude/` sont
  prêts), à faire avant le premier lancement.
