# 26 — Première visite : dire ce que fait l'outil avant de le montrer vide

**Étape d'entonnoir servie : activation, et acquisition par l'argument qui
distingue l'outil.**

## Pourquoi

Audit UX-2, A-4 et UX-8 (`docs/audit-ux-acquisition-2026-09.md`) : l'accueil
montre un lecteur vide (Suivante grisé, trois compteurs à zéro) avant toute
valeur ; « Exemple » est le troisième bouton, secondaire ; rien ne dit
« gratuit, sans compte, rien ne quitte votre appareil » ni ce qui distingue
l'outil des applications à compte : il marche avec n'importe quel patron, PDF
acheté, blog ou magazine. Pas de « comment ça marche », pas de FAQ, 283 mots
dans le HTML de l'accueil. Une visiteuse venue de Pinterest ne comprend pas et
repart : `pattern_parsed` reste à zéro. Enfin, le `<h2>` du dialogue « Ouvrir
ce patron partagé ? » figure dans le HTML pré-rendu de l'accueil : un bruit de
plan pour Google.

## Objectif

Une visiteuse qui ne connaît pas l'outil comprend en dix secondes ce qu'il
fait, à qui il s'adresse et ce qu'il ne fait pas de ses données, et a deux
gestes évidents : voir l'exemple, ou coller son patron. L'accueil gagne du
contenu réel (≥ 500 mots propres dans chaque langue).

## Fichiers à lire

- `src/app/features/reader/pages/reader-page.ts` — `HERO`, `SEO`, `guides`,
  le dialogue `linkConfirmOpen`
- `src/app/features/reader/components/reader-counters.ts`, `pattern-import.ts`
  (bouton « Exemple », `store.loadDemo()`), `waitlist-banner.ts`
- `src/app/core/seo/seo.service.ts` — `jsonLd`
- `src/app/shared/ui/tile/`, `disclosure/`, `button/`
- `src/styles/lecteur.css` (`.home-hero`, `.grid-cards`, `.cta-row`)
- `e2e/perf.spec.ts` (LCP ≤ 2 s : l'image du bandeau est l'élément LCP),
  `e2e/a11y.spec.ts`
- `CLAUDE.md`, « Pièges » : `NgOptimizedImage`, `@defer`, textes d'une page
  paresseuse dans la page, `noIndex`

## À faire

1. **Bandeau.** Sous le `<h1>` et l'accroche, trois preuves en liste (`<ul>`,
   une icône et un texte court) : « Gratuit, sans compte », « Vos patrons
   restent sur votre appareil », « N'importe quel patron : PDF acheté, blog,
   magazine ». Puis deux boutons : **« Voir un exemple »** (primaire, appelle
   `store.loadDemo()` et fait défiler jusqu'à l'étape) et « Coller mon patron »
   (secondaire, amène le focus dans la zone de texte). Le bouton « Exemple » du
   panneau d'import peut rester.

2. **Sans patron, pas de lecteur vide.** Les compteurs (`fil-reader-counters`)
   et la ligne liste d'attente ne s'affichent qu'avec un patron
   (`@if (store.step())`). À leur place, une section « Comment ça marche » :
   trois `Tile` numérotées (1. Collez, ou déposez un PDF · 2. Découpez en
   étapes · 3. Avancez d'un geste, les répétitions se comptent), pré-rendue. La
   zone de texte du panneau d'import reste ouverte et visible ; le collage
   n'importe où dans la page continue de marcher.

3. **Démonstration.** Une `<figure>` « À quoi ça ressemble » avec un
   **storyboard SVG statique** de trois vignettes (coller → découper → lire en
   grand), `public/illustrations/demo-storyboard.svg`, ≤ 12 Ko, balise `<img>`
   native avec `width` et `height`, sans `fetchpriority="high"` (ni
   `NgOptimizedImage`, ni `@defer`). Pas de vidéo : Phil l'a écartée le
   27/09 ; l'image statique est la démonstration.

4. **FAQ.** Six questions pré-rendues, chacune dans un `Disclosure` (le texte
   est dans le HTML même replié) : est-ce gratuit ? faut-il un compte ? où vont
   mes patrons ? ça marche avec un PDF acheté sur Etsy ? et pour le tricot ?
   quelle différence avec une application de patrons ? Réponses courtes,
   vraies, sans nommer de concurrent. JSON-LD `FAQPage` ajouté au `jsonLd` de
   la page à côté du `WebApplication` existant (`@graph`).

5. **UX-8.** Le dialogue « Ouvrir ce patron partagé ? » n'est rendu que
   lorsqu'il s'ouvre (`@if (linkConfirmOpen())` autour de `<fil-dialog>`) :
   plus aucun `<h2>` de dialogue dans le HTML pré-rendu.

6. **SEO.** La description garde « Gratuit, sans compte » ; `<title>`
   inchangé. Les textes restent dans `reader-page.ts` (page paresseuse), pas
   dans `translations.ts`.

## Mesure

`home_cta` avec `cta: 'example' | 'paste'`, émis dans le gestionnaire du clic ;
à déclarer dans `AnalyticsEvent` **et** `EVENEMENTS`. `pattern_parsed`
(origine `exemple`) mesure déjà la suite.

## Tests

- `reader-page.spec.ts` : sans patron, « Comment ça marche » et la FAQ sont
  rendus et les compteurs ne le sont pas ; l'exemple chargé, l'inverse ; le
  dialogue n'est pas dans le DOM tant que `linkConfirmOpen()` est faux.
- e2e, nouveau `e2e/home.spec.ts` : le HTML brut de `/` et `/fr`
  (`request.get`, sans JavaScript) contient la première question de la FAQ et
  les trois preuves, et **ne contient pas** « Open this shared pattern? » ni
  « Ouvrir ce patron partagé ? » ; le clic sur « Voir un exemple » amène
  `.step-body` dans la fenêtre et le remplit.
- `perf.spec.ts` reste vert : LCP ≤ 2 s.
- Compter les mots du HTML pré-rendu de `/` et `/fr` (script jetable dans
  `tools/` ou test node) : ≥ 500 mots propres à la page dans chaque langue,
  chiffres notés dans la PR.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial sous le budget (page paresseuse,
  storyboard statique).
- Aucun texte inventé : pas de témoignage, pas de nombre d'utilisatrices, pas
  de comparaison nominative.
- Français soigné : « la lectrice », espaces insécables avant `: ; ? !` et
  dans « » dans les textes affichés.

## Hors périmètre

Toute vidéo de démonstration (écartée par Phil le 27/09) ; un blog ; une page « à propos » ; des
captures d'écran bitmap ; tout changement du parseur ; le mode lecture
(fiche 24) ; le pied de page (fiche 32).
