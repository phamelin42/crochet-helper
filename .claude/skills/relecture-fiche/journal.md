# Journal de relecture

Une entrée par fiche relue : défauts livrés · ce qui a coûté · amélioration faite.
Sert à repérer les défauts qui reviennent (→ contrôle automatique) et les étapes
coûteuses (→ script). Élaguer les entrées de plus de dix fiches.

## 14 — Pages d'abréviation

- Défauts : langue des définitions, titre différent du H1, voisins en doublon, bundle > 320 kB.
- Coûts : correctifs livrés sur une branche jamais fusionnée, retrouvée deux sessions plus tard.
- Amélioration : livraison par bundle avec liste d'actions explicite pour Phil.

## 15 — Convertisseur US ↔ UK

- Défauts : `dtr` non converti **et test qui figeait le bug** ; formes `sc2tog`/`FPdc` ignorées ; page orpheline ; bouton sans effet visible ; styles inline.
- Coûts : Node trop ancien (≈3 appels) ; `npx vitest` ; locator Playwright ambigu.
- Amélioration : piège « test qui fige un bug » dans `CLAUDE.md`.

## 16 — Projets multiples

- Défauts : **coller un autre patron écrasait le projet actif** (test qui figeait le bug, 2e fois) ; écriture IndexedDB réputée réussie sur échec/quota ; import non atomique ; noindex au sitemap ; styles locaux.
- Coûts : fiche mergée avant relecture (PR de correction séparée) ; serveur/E2E réécrits à la main ; `pkill` qui tue son shell ; résolution ESM de playwright.
- Amélioration : `CLAUDE.md` corrigé + section pièges ; skill `relecture-fiche`, `serve-csp.py`, `smoke.mjs` ; sitemap exclut noindex automatiquement ; auto-vérification ajoutée au skill `lot-suivant`.

## 06 — Partage et impression

- Défauts : **bombe de décompression** via permalien (entrée tierce non bornée) ; bundle initial à 321 kB (piège connu, simple avertissement ignoré) ; impression « Round 1in », pointillés imprimés ; style local et valeurs brutes (3e fois) ; copie de lien sans gestion d'échec.
- Coûts : finitions de la 16 pushées mais non mergées, découvert en cours de route ; PDF d'une page après séparation de print.css (cascade) ; `innerText` trompeur ; recherche du poids du bundle à tâtons avant `--stats-json`.
- Amélioration : budget 320 kB passé en **erreur** de build ; `tools/check-styles.mjs` au build (style local, couleurs brutes) ; piège « entrée tierce bornée » ; étape 0 du skill vérifie les `finitions-*` non mergées ; 3 erreurs d'outillage ajoutées.

## 02 — Tests du lecteur

- Défauts : aucun. Six mutations (sens de `move`, remise à zéro de `load`, garde `<textarea>`, nouveau projet au chargement, plancher des répétitions, arrêt du chrono) toutes tuées.
- Coûts : 2e fiche lancée alors que `finitions-16` n'était pas mergée → relecture sur base fusionnée, livraison repoussée.
- Amélioration : garde-fou dans `lot-suivant.yml` (refus si une branche `finitions-*` a des commits hors `main`) ; `mutate.sh` ajouté au skill pour vérifier des tests sans les relire.
