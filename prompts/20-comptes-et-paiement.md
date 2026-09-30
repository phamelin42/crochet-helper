# 20 — Comptes et paiement : cadrage

**Étape d'entonnoir servie : revenu.**

> **Fiche de cadrage : elle ne livre qu'un document.** Phil a levé le gel du
> lot 8 le 30 septembre 2026 (réponses en bas de page). Le livrable est
> `docs/adr-002-comptes-et-paiement.md` et rien d'autre : ni code, ni
> dépendance, ni compte chez un prestataire. L'ADR est une proposition ; la
> mise en œuvre fera l'objet de fiches séparées, après la décision de Phil
> sur cet ADR.

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

## Réponses de Phil (30 septembre 2026)

- **Gel du lot 8 : levé.**
- **Option retenue : C ou D** (comptes + synchronisation), à départager dans
  l'ADR. La raison : que les projets suivent la lectrice d'un appareil à
  l'autre. C'est ce que la clé de licence (B) ne donne pas — elle ne débloque
  que des fonctions, sans déplacer les projets. L'ADR rappelle en une section
  ce que A et B coûteraient en regard, sans rouvrir le choix.
- **Budget d'hébergement : 10 € par mois au plus.** Toute option qui le
  dépasse aux volumes du jalon d'audience retenu est écartée, chiffre à l'appui.

- **Ce qui est payant : la synchronisation entre appareils, et elle seule.**
  Tout le reste reste gratuit et sans compte (lecture, compteurs, glossaire,
  outils, sauvegarde fichier, envoi par lien).
- **Le compte est optionnel et réservé aux abonnées** : pas de compte
  gratuit, pas d'essai gratuit. Sans compte, l'application marche exactement
  comme aujourd'hui. Une abonnée qui arrête de payer garde ses projets sur ses
  appareils ; seule la synchronisation s'arrête.

## Ce que l'ADR doit contenir en plus des cinq points ci-dessus

- Le coût mensuel de C et de D (au moins deux services tiers nommés pour D)
  à trois paliers d'usage, sources et date des tarifs citées.
- Ce que l'option change aux règles de `CLAUDE.md` (règle n° 1, CSP, mesure
  d'audience de l'ADR 001) : chaque règle touchée, et la nouvelle rédaction
  proposée — sans modifier `CLAUDE.md` dans cette fiche.
- La synchronisation chiffrée de bout en bout : ce que le service voit et ne
  voit pas, et ce que devient une lectrice qui perd son mot de passe.
- Une recommandation, et le découpage en fiches de mise en œuvre (titres et
  étape d'entonnoir seulement).

## Critères d'acceptation

- `docs/adr-002-comptes-et-paiement.md` existe, en français soigné, et répond
  à chaque point de cette fiche.
- Aucun autre fichier modifié hors `automation/avancement.md`.
- `npx prettier --check` sur les fichiers touchés, puis `npm run verify` vert.

## Hors périmètre

Tout le reste. En particulier : aucune intégration de paiement, aucune page
tarifaire, aucune bannière, aucun formulaire d'inscription, aucune nouvelle
dépendance, aucune modification de la CSP.
