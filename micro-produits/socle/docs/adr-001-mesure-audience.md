# ADR 001 — Mesure d'audience sans cookie

**Statut : acceptée par Phil le 1er octobre 2026** (choix commun aux dix
micro-produits).

## Problème

Le canal d'acquisition est le référencement naturel, et l'objectif est un
revenu : sans mesure, impossible de savoir quelle page amène du monde, où le
tunnel fuit, ni si une offre payante intéresse quelqu'un.

## Options

| Option                 | Pour                                                 | Contre                                                                                     |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Google Analytics 4     | gratuit, connu, relié à la Search Console            | bandeau de consentement obligatoire (CNIL), chiffres amputés des refus, script tiers lourd |
| **Umami auto-hébergé** | sans cookie ni identifiant : exempté de consentement | à héberger (déjà fait pour Pattern Reader, sur le VPS existant)                            |

## Décision

Umami, sur l'instance déjà en service pour Pattern Reader, **un site par
produit** (`produit.json` → `mesure.siteId`). La Search Console complète pour
les requêtes et les positions.

## Écart à « aucun back-end », et ses garde-fous

1. Rien de ce que la personne saisit ne sort du navigateur : des noms
   d'événements (`core/analytics/evenements.ts`) et des propriétés courtes.
2. Aucun cookie, aucun identifiant persistant transmis ; la date de première
   visite reste en `localStorage`, seule une tranche d'ancienneté part
   (13 mois au plus, durée de l'exemption CNIL).
3. Une seule origine de collecte, déclarée dans `produit.json` et dans la CSP
   de `vercel.json` (`npm run lancement` vérifie la concordance).
4. Le traceur ne se charge que sur le domaine du produit : ni `localhost`, ni
   la CI, ni les aperçus (`e2e/analytics.spec.ts`).

Vider `mesure.siteId` éteint toute mesure.
