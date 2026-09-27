# 32 — Libellés clairs, pied de page complet, `lastmod` vrai

**Étape d'entonnoir servie : activation (comprendre l'interface) et
acquisition (maillage interne, signaux propres pour Google).**

## Pourquoi

Audit UX-5, UX-6 et A-5 (`docs/audit-ux-acquisition-2026-09.md`) :
« Formatting » / « Bien formater » en navigation ne dit pas de quoi ; l'œil
(garder l'écran allumé) et Discord sont des icônes seules, qu'un public de 50
à 70 ans ne clique pas ; en français le lecteur dit « Le pattern », « Texte du
pattern », « aucun pattern chargé » alors que le bandeau dit « patron ». Le pied
de page n'a qu'un lien : maillage interne faible et aucune preuve de sérieux.
Le sitemap donne la date du build en `lastmod` sur les 118 URL : Google
ignore un `lastmod` toujours égal à aujourd'hui, et le signal des vraies mises
à jour est perdu.

## Objectif

Chaque commande a un mot ; le français dit « patron » partout ; le pied de page
relie toutes les pages publiques et dit en une phrase ce que l'outil fait des
données ; le sitemap ne donne une date que lorsqu'elle est vraie.

## Fichiers à lire

- `src/app/core/i18n/translations.ts` — `nav.*`, `ui.wake`, `ui.discord`,
  `footer.*` (par `grep -n`)
- `src/app/shared/layout/site-header.ts`, `site-footer.ts`
- `src/app/features/reader/data/reader-copy.ts` — les chaînes FR qui
  contiennent « pattern »
- `src/app/core/i18n/route-paths.json`, `i18n.service.ts` (`link()`, `t()`)
- `tools/generate-sitemap.mjs`, `.github/workflows/ci.yml` (profondeur du
  checkout)
- `src/styles/lecteur.css` (`.site-footer`, `.nav-links`), `hanami.css`
  (`.btn-icon`, `.visually-hidden`)
- `CLAUDE.md`, « Pièges » : budget du bundle initial (l'en-tête, le pied et
  `translations.ts` en font partie), français soigné, vitrine à jour

## À faire

1. **Libellés.** `nav.format` → FR « Préparer un patron », EN « Prepare a
   pattern » ; le `<h1>` de la page peut rester. Les boutons « écran allumé »
   et Discord affichent leur texte à côté de l'icône à partir de 600 px
   (« Écran allumé » / « Screen awake », « Discord ») ; sous 600 px le texte
   est `visually-hidden` et l'`aria-label` reste. Si `Button` ne permet pas
   icône + texte sans style local, étendre la directive dans `shared/ui` et
   la vitrine `/design-system`.

2. **« Patron » partout en français.** Remplacer « pattern » dans toutes les
   chaînes FR de `reader-copy.ts`, `translations.ts` et des pages
   (`grep -rn "pattern" src/app --include=*.ts`, puis ne toucher que les textes
   français). « Pattern Reader », nom du site, reste.

3. **Pied de page.** Trois colonnes générées depuis `ROUTE_PATHS` : « Outils »
   (lecteur, convertisseur, et les pages-outils des fiches 27 à 29 si elles
   existent), « Apprendre » (glossaire, les guides, la fiche 31 si elle
   existe), « Le projet » (créatrices, Discord, autre langue). Une phrase sous
   les colonnes : « Gratuit, sans compte. Vos patrons restent sur votre
   appareil ; seule une mesure d'audience anonyme est collectée. » Libellés
   dans `translations.ts` (clés `footer.*`) ; **≤ 600 octets** ajoutés au
   bundle initial, mesurés avant et après, notés dans la PR. Un test échoue si
   une clé publique de `ROUTE_PATHS` (hors `reader` et `projects`) n'a pas de
   libellé `footer.*` : toute page future entre au pied d'elle-même.

4. **`lastmod` vrai ou absent.** `generate-sitemap.mjs` donne pour chaque
   route la date du dernier commit qui a touché ses sources
   (`git log -1 --format=%cs -- <chemins>`), avec une correspondance route →
   chemins par famille (lecteur → `features/reader` ; abréviations →
   `glossary.ts`, `term-page.ts`, `term-articles.ts` ; guides → leur page ;
   etc.). Si le dépôt est superficiel (`git rev-parse --is-shallow-repository`,
   cas des builds Vercel et de la CI) ou si `git` manque, **omettre**
   `<lastmod>` : une date fausse est pire qu'aucune. Retirer `<changefreq>`,
   ignoré par Google. Documenter en tête du script.

5. Vitrine `/design-system` relue si `Button` change (`check-showcase.mjs`).

## Mesure

Aucun nouvel événement. L'effet se lit dans les pages vues des pages
secondaires et, plus tard, dans Search Console.

## Tests

- `reader-copy.spec.ts`, nouveau : aucune chaîne FR de `READER_COPY` ni de
  `translations.ts` ne contient le mot « pattern » (`/\bpattern\b/i`), sauf
  « Pattern Reader ».
- `site-footer.spec.ts` : chaque clé publique de `ROUTE_PATHS` a son lien dans
  les deux langues (boucle).
- `tools/sitemap.test.mjs` (node, comme `pilote.test.mjs`) : la fonction qui
  décide de `lastmod` renvoie une date quand l'historique est complet et rien
  quand il est superficiel ; le sitemap ne contient jamais la date du jour par
  défaut.
- e2e : à 360 px l'en-tête n'affiche pas les textes des icônes mais axe trouve
  leur nom ; à 1024 px les textes sont visibles.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial sous le budget, écart mesuré
  ≤ 600 octets.
- `sitemap.xml` de `dist/` sans `lastmod` en CI (dépôt superficiel) et sans
  `changefreq` ; avec dates en build local sur un clone complet.
- Français soigné.

## Hors périmètre

Une page « à propos » ou « confidentialité » (la phrase du pied suffit pour
l'instant), un menu déroulant, la refonte de l'en-tête, la traduction de
`/design-system`.
