# 57 — Clavier, focus et noms accessibles (audit front, lot 2a)

**Étape d'entonnoir servie : activation (la première minute au clavier, au
lecteur d'écran ou à la tablette ne casse plus le patron) et rétention (la
lectrice retrouve ses réglages et son rang sans perdre le focus). Comportement
seulement : tailles, couleurs, en-tête et page pleine visuelle sont le lot 2b.**

## Pourquoi

`docs/audit-front-2026-11.md` (11/11/2026) a mesuré ce qu'axe ne voit pas :
Espace sur « Précédente » fait avancer l'étape, Espace sur « Annuler » laisse
le dialogue ouvert et avance le patron derrière, l'accueil ne défile plus au
clavier, Échap dans un dialogue quitte aussi la page pleine, le focus tombe sur
`body` après un chargement ou un changement de page, rien n'annonce la page
suivante, deux boutons « Remettre à zéro » portent le même nom, `/reglages`
n'est lié nulle part sur le web, et le fond sombre choisi apparaît 0,3 s trop
tard. Le public (50 à 70 ans, tablette, parfois lecteur d'écran) ne les
contourne pas : il part.

## Objectif

Dix corrections de comportement, chacune écrite test d'abord : raccourcis
clavier limités à ce qui ne porte pas déjà un geste ; focus et annonce à
chaque changement de page ; noms accessibles distincts ; un `h1` dans le
lecteur ; préférences d'affichage avant le premier rendu ; réglages reliés ;
erreur d'import avec une issue ; infobulles fermables à Échap ; `wcag22aa` dans
l'audit axe.

## Fichiers à lire

- `docs/audit-front-2026-11.md` : B-1, I-1, I-3, I-6, I-7, I-9, C-2, C-4
- `src/app/features/reader/pages/reader-page.ts` (`grep -n "keydown"`),
  `components/step-view.ts` (`grep -n "Escape"`), `reader-counters.ts`,
  `projects-page.ts`
- `src/app/core/platform/` (service à ajouter ici), `core/i18n/`
- `src/app/shared/layout/site-header.ts`, `site-footer.ts` et leurs specs
- `src/app/shared/ui/tooltip.service.ts`
- `public/app-mode.js`, `src/index.html`, `display-prefs.service.ts`
- `e2e/a11y.spec.ts` (`grep -n "withTags"`), `e2e/reading-mode.spec.ts`

## À faire

1. Cette fiche, sa ligne dans `prompts/README.md` et `automation/avancement.md`.
2. Raccourcis : aucun quand le focus est sur un élément interactif (`button`,
   `a`, `summary`, `input`, `textarea`, `select`, `[role=button]`,
   `[contenteditable]`) ni quand un `<dialog>` est ouvert ; aucun, et aucun
   `preventDefault`, sans patron chargé ; Échap dans un dialogue ne ferme que
   lui ; Espace sur un `summary` l'ouvre.
3. Service de `core/platform` : après une navigation réussie (ni premier
   chargement, ni simple changement de fragment), focus sur `main#main` et titre
   annoncé dans une région `aria-live="polite"` masquée. Après chargement d'un
   patron et après fermeture d'un dialogue, le focus ne tombe plus sur `body`.
4. Noms : « − » et « + » des répétitions, deux « Remettre à zéro » distincts,
   boutons de carte de projet avec le nom du projet, repère de navigation de
   l'en-tête, bouton de sortie de la page pleine sans `aria-pressed` ni libellé
   changeant.
5. Un `h1` une fois le patron chargé (visuellement masqué si besoin, garde de
   450 px de `reading-mode.spec.ts` respectée) ; titres sans saut.
6. `public/app-mode.js` pose `data-dim` et la taille de texte avant le premier
   rendu (mêmes clés que `display-prefs.service.ts`, `try/catch`).
7. Lien « Réglages » dans le pied de page ; libellés visibles des deux groupes.
8. Erreur « aucun rang numéroté » : `role="alert"` et une issue concrète ; l'aide
   de l'état vide cite « les grands boutons » avant le clavier.
9. Infobulles : Échap ferme l'infobulle ouverte sans autre effet ; pas de double
   annonce.
10. `wcag22aa` dans les étiquettes axe de `e2e/a11y.spec.ts`.

## Tests

- Unitaires : boucle sur les types d'éléments focalisés × les touches
  (Espace, PageHaut, PageBas, flèches) ; patron absent ; dialogue ouvert.
- `e2e/clavier.spec.ts` : les mêmes cas dans le navigateur, plus Échap dans un
  dialogue et Espace sur un `summary`.
- e2e : focus et annonce après navigation, focus après chargement et après
  fermeture d'un dialogue, première image sombre avec préférences posées.

## Critères d'acceptation

- `npm run verify:ci` vert.
- Aucun raccourci ne vole un geste natif ; aucune perte de focus vers `body`.
- Textes FR et EN soignés (espaces insécables), textes d'une page paresseuse
  dans la page.

## Hors périmètre

Tailles et cibles (48 px, texte 16 px), contraste des bordures de champ, étape
longue, page pleine visuelle, exemple traduit, en-tête mobile (lot 2b).
