# 49 — Page-outil « image en grille de crochet », gratuite et sans compte

**Étape d'entonnoir servie : acquisition (« image to crochet pattern free »,
« photo en grille crochet » : des requêtes fréquentes, servies aujourd'hui
par des outils à compte ou payants).**

## Pourquoi

La fiche 48 crée la fonction dans le lecteur, où personne ne la cherche. Une
page dédiée, pré-rendue, indexable en anglais et en français, la rend
trouvable et dit ce qui distingue Fil : gratuit, sans compte, rien n'est
envoyé, ça marche hors ligne, et la grille se suit maille par maille.

## Objectif

`/image-to-crochet-chart` et `/fr/image-en-grille-crochet` : un titre, deux
phrases, l'outil (le dialogue de la fiche 48, ouvert dans la page), trois
étapes illustrées, une courte FAQ, un lien vers le lecteur. Créer la grille
ouvre le projet dans le lecteur.

## Fichiers à lire

- `src/app/features/reader/components/image-grid-dialog.ts` (fiche 48) — si
  elle n'est pas fusionnée, s'arrêter et le dire
- `src/app/core/i18n/route-paths.json` et `src/app/app.routes.ts` — déclarer
  la famille de pages par `page()` (elle charge `pages.css` et entre seule
  dans l'audit axe)
- `src/app/features/tools/pages/row-counter-page.ts` — une page-outil
  existante : structure, SEO, maillage
- `src/app/core/seo/` — titre, description, données structurées
- `CLAUDE.md`, « Pièges » : une nouvelle page est reliée ; CSS d'une page
  dans `pages.css` ; textes d'une page paresseuse dans la page, pas dans
  `translations.ts`

## À faire

1. Route `imageGrid` dans `route-paths.json` (EN et FR), page
   `features/tools/pages/image-grid-page.ts` déclarée par `page()`.
2. Contenu pré-rendu (visible sans JavaScript) : titre H1, chapeau, trois
   étapes (choisir l'image, régler largeur et couleurs, suivre maille par
   maille), FAQ de quatre questions (« Est-ce gratuit ? », « Mon image
   est-elle envoyée ? » — non, tout reste sur l'appareil, « Combien de
   mailles ? », « Quel point utiliser ? » — maille serrée), données
   structurées `HowTo` et `FAQPage` si `core/seo` les sait déjà produire,
   sinon `FAQPage` seule.
3. L'outil : bouton principal « Choisir une image », qui ouvre le dialogue
   de la 48 chargé par `import()` ; à la création, navigation vers le lecteur
   (`/` ou `/fr`) sur le nouveau projet.
4. Maillage : lien depuis les autres pages-outils, depuis la page « lire un
   diagramme » (`reading-chart-page.ts`) et depuis le pied de page s'il liste
   les outils ; lien retour vers le lecteur.
5. Pas de nom de concurrent sur la page.

## Mesure

Aucun événement nouveau : la page vue est comptée par la mesure existante,
la création par `grid_created` (fiche 48) avec `origine: 'page'`.

## Tests

- e2e : les deux URL répondent en HTML pré-rendu contenant le H1 et la FAQ
  (sans JavaScript) ; le parcours image → grille → lecteur marche depuis la
  page ; aucun débordement à 320 px.
- L'audit axe couvre la page d'office (famille déclarée dans
  `route-paths.json`) ; vérifier qu'elle apparaît dans le rapport.
- `npm run test:tools` : le sitemap contient les deux URL.

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé.
- Page reliée depuis au moins deux pages existantes.
- Français soigné ; textes EN et FR relus, pas une traduction mot à mot.

## Hors périmètre

Une galerie d'exemples, un blog, comparer avec d'autres outils, toute
fonction absente de la fiche 48.
