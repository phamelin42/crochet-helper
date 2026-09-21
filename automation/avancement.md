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

| Fiche                                | État                                | PR  | Date       |
| ------------------------------------ | ----------------------------------- | --- | ---------- |
| 10 — Mesure de l'usage réel          | Terminée                            | #11 | 2026-09-21 |
| 11 — Marque et domaine               | Bloquée : nom de domaine à trancher | —   | —          |
| 12 — Anglais par défaut              | À faire                             | —   | —          |
| 13 — Import PDF                      | À faire                             | —   | —          |
| 14 — Une page par abréviation        | À faire                             | —   | —          |
| 15 — Convertisseur US ↔ UK           | À faire                             | —   | —          |
| 16 — Projets multiples et sauvegarde | À faire                             | —   | —          |
| 06 — Partage et impression           | À faire                             | —   | —          |
| 02 — Tests du lecteur                | À faire                             | —   | —          |
| 03 — Formats supplémentaires         | À faire                             | —   | —          |
| 05 — Mode hors ligne (PWA)           | À faire                             | —   | —          |
| 07 — Audit d'accessibilité           | À faire                             | —   | —          |
| 09 — Performance et Core Web Vitals  | À faire                             | —   | —          |
| 04 — Pages éditoriales               | À faire                             | —   | —          |
| 08 — Vitrine du design system        | À faire                             | —   | —          |

## États possibles

- **À faire** — l'agent peut la prendre, sauf si sa branche existe déjà
- **Bloquée : <raison>** — une décision humaine manque, l'agent passe à la suivante
- **Terminée** — écrit par l'agent dans sa PR, vrai une fois la PR fusionnée
