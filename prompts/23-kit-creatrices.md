# 23 — Kit pour les créatrices de patrons

**Étape d'entonnoir servie : acquisition.**

## Pourquoi

Les créatrices de patrons sont le canal le mieux noté du plan : une créatrice
qui renvoie vers Fil depuis sa boutique apporte des lectrices qui ont déjà un
patron en main. Rien ne leur est destiné aujourd'hui : pas de page, pas de
badge, et le permalien (`#p=`, fiche 06) est peu découvrable.

## Objectif

Une page `/for-designers` (EN) et `/fr/pour-les-creatrices` (FR), pré-rendue et
reliée, qui explique en trois écrans comment offrir « Ouvrir dans Pattern
Reader » à ses clientes, avec un badge prêt à copier et un visuel à épingler.

## Fichiers à lire

- `src/app/core/i18n/route-paths.json` et `src/app/app.routes.ts`
- une page éditoriale existante comme modèle : `src/app/features/guides/pages/`
  (`ls`, puis une seule page)
- `src/app/features/reader/data/pattern-link.ts` — le permalien
- `src/app/shared/layout/` — en-tête et pied, pour relier la page
- `tools/generate-sitemap.mjs`, `e2e/a11y.spec.ts` (la page y entre d'elle-même
  via `route-paths.json`)

## Contrat

1. Route `forDesigners` dans `route-paths.json` :
   `{ "fr": "/pour-les-creatrices", "en": "/for-designers" }`. Page dans
   `src/app/features/designers/pages/`, textes dans la page (pas dans
   `translations.ts`), SEO complet (titre, description, canonique, `hreflang`,
   JSON-LD `WebPage`).

2. Contenu, dans cet ordre : ce que la cliente voit (une étape à la fois, en
   grand) ; comment créer le lien (coller le patron dans Fil, « Copier le
   lien ») ; le badge et son code HTML à copier ; la limite honnête (un lien
   de patron très long est refusé au-delà de 8000 caractères, voir fiche 06).

3. Badge : `public/badges/open-in-pattern-reader.svg` et `…-fr.svg`, texte
   vectorisé ou police système, contraste AA, ≤ 3 Ko chacun. Le code à copier
   est un `<a href="…#p=…"><img alt="Open in Pattern Reader" …></a>` affiché
   comme **texte** (jamais injecté en HTML), avec un bouton « Copier ».

4. Visuel épinglable : `public/pin/pattern-reader-pin.svg`, 1000 × 1500, et sa
   version PNG produite par `tools/render-pin.mjs` (Playwright, déjà en
   dépendance de développement). Si Chromium n'est pas disponible pendant
   l'exécution, livrer le SVG seul et le dire dans la PR.

5. Relier la page : lien dans le pied de page et depuis la page du lecteur
   (« Vous créez des patrons ? »).

## Tests

- e2e : **permalien testé sur un vrai PDF**. Le test fabrique un PDF avec
  `page.pdf()` depuis un patron réel de `src/app/features/reader/data/fixtures/`,
  l'importe par le bouton « Open a PDF », copie le lien, l'ouvre dans une
  nouvelle page et vérifie que la première et la dernière étape sont
  identiques.
- Pré-rendu des deux langues (`check-prerender.mjs`), présence au sitemap.

## Critères d'acceptation

- `npm run verify` vert ; audit axe et reflow 320 px verts sur les deux pages.
- Le badge s'affiche sans JavaScript (HTML pré-rendu).
- Français soigné : « la créatrice », espaces insécables.

## Hors périmètre

Un programme d'affiliation, un tableau de bord créatrice, des liens courts
(serveur), un générateur de badge personnalisé, tout contact automatisé.
