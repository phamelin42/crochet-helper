# 20 — Comptes et paiement : cadrage

**Étape d'entonnoir servie : revenu.**

> **Fiche de cadrage. Elle ne s'exécute pas.** La monétisation (lot 8) est gelée
> par décision explicite. Cette fiche décrit le problème et les décisions à
> prendre ; elle n'autorise ni code, ni dépendance, ni compte chez un
> prestataire. Dans `automation/avancement.md`, elle reste « Bloquée » tant
> que Phil n'a pas tranché par écrit les questions du bas de page.

## Pourquoi en parler maintenant

Deux choses que la lectrice demandera tôt ou tard exigent une identité : que
ses projets la suivent d'un appareil à l'autre, et une offre payante qui
finance l'outil. Les deux heurtent la première règle du dépôt (aucun
back-end) et la limite actuelle de la mesure (aucun identifiant persistant,
donc aucun bandeau de consentement). Mieux vaut connaître le prix avant que la
question ne devienne urgente.

## Ce qui existe

- Tout est local : projets dans IndexedDB, sauvegarde en fichier (fiche 16),
  envoi d'une copie par lien (fiche 19).
- Seule sortie réseau : la mesure d'audience, bornée par
  `docs/adr-001-mesure-audience.md`.
- Aucun compte, aucun cookie, aucune donnée personnelle.

## Options à comparer

| Option                                                                                                                    | Ce qu'elle apporte                               | Ce qu'elle coûte                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| A. Rien de plus : sauvegarde fichier + dons (lien externe)                                                                | zéro changement d'architecture                   | pas de synchronisation, revenu incertain                                                                   |
| B. Clé de licence hors ligne : paiement chez un prestataire, clé signée vérifiée dans le navigateur avec une clé publique | fonctions payantes sans compte ni serveur à nous | clé partageable, pas de synchronisation, un prestataire à choisir                                          |
| C. Comptes + synchronisation chiffrée de bout en bout                                                                     | les projets suivent la lectrice                  | un back-end (hébergement, sauvegardes, astreinte), RGPD, bandeau de consentement, écart majeur à l'ADR 001 |
| D. Comptes via un service tiers (authentification et base hébergées)                                                      | moins de code serveur                            | dépendance forte, données chez un tiers, mêmes obligations RGPD que C                                      |

## Ce qu'un ADR devrait trancher

Si le gel est levé, la première tâche n'est pas du code : c'est un
`docs/adr-002-comptes-et-paiement.md` qui répond, chiffres à l'appui :

1. Quel problème paie-t-on : la synchronisation, des fonctions en plus, ou
   seulement l'existence de l'outil ?
2. Le jalon d'audience qui déclenche la décision (visiteuses par mois, taux de
   retour… qu'on ne sait pas mesurer aujourd'hui, voir
   `docs/pilote-automatique.md`).
3. Quelles données personnelles seraient stockées, où, combien de temps, et le
   texte du consentement.
4. Ce qui reste gratuit, pour toujours : la lecture d'un patron, le glossaire,
   le convertisseur.
5. Comment on revient en arrière si l'option ne rapporte rien.

## Questions pour Phil

- Lever le gel du lot 8 : oui / non / à quelle date ?
- Option préférée parmi A–D, ou aucune ?
- Budget mensuel acceptable pour un hébergement (option C) ?

## Hors périmètre

Tout le reste. En particulier : aucune intégration de paiement, aucune page
tarifaire, aucune bannière, aucun formulaire d'inscription, aucune nouvelle
dépendance, aucune modification de la CSP.
