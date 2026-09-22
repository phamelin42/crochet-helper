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
