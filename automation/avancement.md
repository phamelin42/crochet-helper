# Avancement des fiches

Ce fichier est l'état du pilote automatique. L'agent de construction le lit pour
savoir quelle fiche exécuter, et marque la fiche « Terminée » dans la PR qu'il
ouvre : l'état ne devient vrai sur `main` qu'à la fusion. Une PR refusée ne
touche donc jamais ce tableau.

Une fiche dont la branche existe encore sur le dépôt est considérée en
relecture : l'agent la saute. Pour faire refaire une fiche refusée, supprime sa
branche.

**Ne pas réordonner ce tableau à la main** — l'ordre fait autorité dans
`prompts/README.md`. Ici on ne suit que l'état.

| Fiche                                   | État     | PR  | Date       |
| --------------------------------------- | -------- | --- | ---------- |
| 10 — Mesure de l'usage réel             | Terminée | #11 | 2026-09-21 |
| 11 — Marque et domaine                  | Terminée | —   | 2026-09-21 |
| 12 — Anglais par défaut                 | Terminée | —   | 2026-09-21 |
| 13 — Import PDF                         | Terminée | —   | 2026-09-21 |
| 14 — Une page par abréviation           | Terminée | —   | 2026-09-21 |
| 15 — Convertisseur US ↔ UK              | Terminée | —   | 2026-09-21 |
| 16 — Projets multiples et sauvegarde    | Terminée | —   | 2026-09-22 |
| 06 — Partage et impression              | Terminée | —   | 2026-09-22 |
| 02 — Tests du lecteur                   | Terminée | —   | 2026-09-22 |
| 03 — Formats supplémentaires            | Terminée | —   | 2026-09-22 |
| 05 — Mode hors ligne (PWA)              | Terminée | —   | 2026-09-22 |
| 07 — Audit d'accessibilité              | Terminée | —   | 2026-09-22 |
| 09 — Performance et Core Web Vitals     | Terminée | —   | 2026-09-22 |
| 04 — Pages éditoriales                  | Terminée | —   | 2026-09-22 |
| 08 — Vitrine du design system           | Terminée | —   | 2026-09-22 |
| 17 — Tailles de crochet mm ↔ US         | Terminée | —   | 2026-09-24 |
| 18 — Matériel : en-têtes élargis        | Terminée | —   | 2026-09-24 |
| 19 — Envoyer un projet                  | Terminée | —   | 2026-09-25 |
| 20 — Comptes et paiement (cadrage)      | Terminée | —   | 2026-09-30 |
| 21 — Mesurer le retour et la profondeur | Terminée | —   | 2026-09-23 |
| 22 — Liste d'attente                    | Terminée | —   | 2026-09-24 |
| 23 — Kit pour les créatrices            | Terminée | —   | 2026-09-25 |
| 24 — Mode lecture                       | Terminée | —   | 2026-09-28 |
| 25 — Vue d'ensemble et partage visible  | Terminée | —   | 2026-09-28 |
| 26 — Première visite                    | Terminée | —   | 2026-09-28 |
| 27 — Compteur de rangs en ligne         | Terminée | —   | 2026-09-28 |
| 28 — Calculateur d'échantillon          | Terminée | —   | 2026-09-29 |
| 29 — Page tailles de crochet            | Terminée | —   | 2026-09-29 |
| 30 — Contenu des pages d'abréviation    | Terminée | —   | 2026-09-29 |
| 31 — Lire un patron anglais en français | Terminée | —   | 2026-09-29 |
| 32 — Libellés, pied de page, lastmod    | Terminée | —   | 2026-09-28 |
| 33 — Glossaire sur téléphone            | Terminée | —   | 2026-09-29 |
| 34 — Images du PDF à l'étape            | Terminée | —   | 2026-09-28 |
| 35 — Diagrammes : charger et voir       | Terminée | —   | 2026-09-28 |
| 36 — Diagrammes : transcrire en texte   | Terminée | —   | 2026-09-28 |
| 37 — Reconnaître les symboles (étude)   | Terminée | —   | 2026-09-30 |
| 38 — Mode page pleine                   | Terminée | —   | 2026-09-30 |
| 39 — Installer, hors ligne              | Terminée | —   | 2026-09-30 |
| 40 — Page de confidentialité            | Terminée | —   | 2026-09-30 |
| 41 — Application Android (Play Store)   | Terminée | —   | 2026-09-30 |
| 42 — Taille du texte du système         | Terminée | —   | 2026-10-01 |
| 43 — Mode appli (coquille mobile)       | Terminée | —   | 2026-10-01 |
| 44 — Du texte aux tours                 | Terminée | —   | 2026-10-02 |
| 45 — Affichage diagramme                | Terminée | —   | 2026-10-03 |
| 46 — Choix d'affichage à l'import       | Terminée | —   | 2026-10-03 |
| 47 — Grille de couleurs (tapisserie)    | Terminée | —   | 2026-10-03 |
| 48 — Image en grille de crochet         | À faire  | —   | —          |
| 49 — Page-outil image en grille         | À faire  | —   | —          |

## États possibles

- **À faire** — l'agent peut la prendre, sauf si sa branche existe déjà
- **Bloquée : <raison>** — une décision humaine manque, l'agent passe à la suivante
- **Terminée** — écrit par l'agent dans sa PR, vrai une fois la PR fusionnée
