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

## 03 — Formats supplémentaires

- Défauts : liste de matériel numérotée avalée comme étapes (ancien, mais contraire à la fiche) ; nombres en lettres testés sur un échantillon seulement (« douze », « seven » non couverts).
- Coûts : `mutate.sh` lancé sur une base rouge (tout « tué » à tort) ; remplacement Python cassé par Prettier ; `npm ci` en tâche de fond qui vide `node_modules`.
- Amélioration : `mutate.sh` exige une base verte et signale les mutations qui ne compilent pas ; sondage des fonctions pures par esbuild + comparaison avec l'ancienne version ; piège « énumération → test exhaustif ».

## 05 — Mode hors ligne (PWA)

- Défauts : **service worker dégradé en production** (empreintes de `ngsw.json` périmées par `strip-event-dispatch.mjs`) ; icônes d'installation au logo d'Angular ; 110 pages préchargées à l'installation. Agent à 200 échanges sans commit.
- Coûts : fiche périmée (`/lecteur`, « six pages ») et budget 320 kB devenu un plancher (Angular ≈ 305 kB) → l'agent s'est épuisé à grappiller ; premier test hors ligne faux positif (statut 200 sans lire l'état du worker).
- Amélioration : `ngsw.json` régénéré après post-traitement + `tools/check-ngsw.mjs` ; budget 325/335 kB ; fiches 04/08/09 remises à jour ; `lot-suivant` : commits fréquents, fiche contredite → le code fait foi, blocage → brouillon ; relecture : **mettre à jour la fiche suivante avant de lancer le lot**.

## 07 — Accessibilité

- Défauts : audit axe **non branché dans la CI** (l'objectif « empêcher les régressions » n'était pas tenu) ; couverture sans pages FR ni lecteur chargé ; reflow vérifié à la main seulement. Bon point : l'agent a commité au fil de l'eau (consigne de la rétro 05) et relevé une incohérence de `CLAUDE.md` (`core/theme` inexistant).
- Coûts : « six routes » dans la fiche, non détecté par ma vérification de fraîcheur (chemins seulement) ; révision de Chromium de Playwright absente du conteneur.
- Amélioration : a11y dans la CI ; 38 cas (12 pages × 2 thèmes, lecteur chargé, reflow 320 px), reflow vérifié par mutation ; piège « garde-fou non branché » ; fraîcheur des fiches = lecture complète ; `PW_CHROMIUM`.

## 09 — Performance et Core Web Vitals

- Défauts : aucun dans le code. Le rapport est honnête (Lighthouse impossible, méthode Playwright+CDP assumée) et ses chiffres sont reproductibles à l'identique. Manquait le garde-fou : rien n'empêchait le CLS de revenir.
- Coûts : **mes finitions de la fiche 07 n'étaient pas dans `main`** (PR #24 n'a mergé que l'agent) et je l'avais annoncé mergé sans lire la sortie de ma vérification → refait le merge dans `revue-09` ; mutation du `.tool-slot` non reproductible sans API `wakeLock` (fausse API injectée dans le test).
- Amélioration : `e2e/perf.spec.ts` (CLS ≤ 0,05, LCP ≤ 2 s, mobile bridé) dans la CI, vérifié par mutation ; jeton `--control-size` partagé entre `.btn-icon` et sa place réservée ; étape 0 du skill : vérifier que les corrections précédentes sont **dans main**, en lisant la réponse.

## 04 — Pages éditoriales

- Défauts : deux guides anglais sous le minimum de mots de la fiche (626 et 662 pour 700 demandés) ; **violation de contraste** sur la nouvelle section de l'accueil (résumé imbriqué dans le lien) — invisible pour l'audit, qui ne connaissait pas encore ces pages.
- Coûts : la fiche annonçait « 12 routes pré-rendues » (chiffre d'avant les fiches 14/15), non repéré à la préparation malgré la consigne sur les nombres ; Prettier a coupé un mot dans un commentaire de gabarit et cassé la compilation.
- Amélioration : `e2e/a11y.spec.ts` dérive ses routes de `route-paths.json` — toute famille de page ajoutée est auditée d'office (59 cas) ; piège correspondant dans CLAUDE.md ; fiche 08 corrigée (ThemeService et Progress inexistants, sitemap déjà adapté) ; liste des composants de CLAUDE.md corrigée.

## 08 — Vitrine du design system

- Défauts : aucun. L'agent a suivi les consignes ajoutées par les rétros précédentes (commits au fil de l'eau, page ajoutée elle-même à l'audit axe, corrections a11y avant de rendre) et ses deux tests résistent aux mutations.
- Coûts : contrôle d'abord écrit en spec Angular, impossible faute de types Node → déplacé dans `tools/` ; premier contrôle trop permissif (`includes`), repéré par un contrôle négatif.
- Amélioration : `tools/check-showcase.mjs` — le build échoue si un composant de `shared/ui` manque à la vitrine, ce que la fiche faisait vérifier à l'œil ; piège correspondant dans CLAUDE.md ; deux erreurs d'outillage notées.

## Pilote Umami — premier passage réel

- Défauts : secret `UMAMI_URL` mal saisi (`.co`), masqué par « fetch failed » ; le premier rapport attribuait l'entonnoir à des personnes (« aucune n'a fourni de patron »). Événements à 0 sur deux jours : non tranché, à vérifier à la main.
- Coûts : recherche d'un bundle jamais déposé ; trois exécutions pour voir la forme des réponses ; agent sauté sur branche (workflow ≠ `main`) ; une mutation restée en place après `revert` + `reset`.
- Amélioration : cause réseau dans `erreur`, mode `forme` et données lues dans le résumé du job, forme Umami 3 figée en test ; `tools/evenements.test.mjs` ; pièges « événement déclaré deux fois » et « workflow sur branche » ; skill : tester le push avant de livrer en bundle.
