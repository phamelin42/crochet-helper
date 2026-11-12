# 59 — Lisible à un mètre : l'apparence de l'audit de novembre 2026

**Étape d'entonnoir servie : activation et rétention (la lectrice qui lit son
patron à un mètre, sur tablette, sans plisser les yeux ni rater une cible, revient
à l'ouvrage suivant ; une étape illisible ou une sortie introuvable la fait
partir au premier rang).**

## Pourquoi

Le lot 1 de l'audit (`docs/audit-front-2026-11.md`) a mesuré ce que la lectrice
voit : une étape de 120 signes à 14 px, une page pleine dont la seule sortie est
un cercle de trois points, des commandes à 44 px, du texte à 13 et 15 px, une
bordure de champ à 1,29:1, un exemple français écrit en anglais. La fiche 57 a
corrigé le comportement (clavier, focus, noms) ; celle-ci applique l'apparence.
Les neuf questions de design de l'audit sont tranchées par Phil : leurs valeurs
par défaut s'appliquent, sauf la bordure et l'en-tête décrits ci-dessous.

## Objectif

Une lectrice de 60 ans, tablette sur le pupitre, lit chaque étape à 28 px au
moins, trouve « Quitter la page pleine » en toutes lettres, touche chaque
commande du premier coup, et ouvre un exemple dans sa langue en un geste.

## Fichiers à lire

- `docs/audit-front-2026-11.md` (B-2, B-3, B-4, I-4, I-5, I-8, I-9, I-6)
- `src/app/features/reader/components/step-view.ts`, `src/styles/lecteur.css`
  (`grep -n "step-body\|step-block\|data-focus"`), `src/styles/tokens.css`
- `src/app/shared/layout/site-header.ts`, `site-footer.ts`
- `src/app/core/platform/display-prefs.service.ts`
- `e2e/reading-mode.spec.ts`, `e2e/page-pleine.spec.ts`, `CLAUDE.md` (pièges)

## À faire

1. **Étape longue** : le texte de l'étape ne descend jamais sous 24 px à 390 px
   ni 28 px à 820 px, quel que soit le réglage A / A+ / A++ (qui ne fait que
   grossir). Plus de paliers `.long` / `.longer` / `.longest`. Une étape qui ne
   tient pas défile dans son cadre (zone focalisable au clavier, indice visuel
   d'une suite) ; « Précédente » et « Suivante » restent ancrées en bas.
2. **Page pleine** : reste le mode par défaut, mais la sortie porte un libellé
   visible (« Quitter la page pleine »), A / A+ / A++ reste utilisable, et une
   phrase d'explication s'affiche la première fois seulement (préférence dans
   `DisplayPrefsService`).
3. **En-tête** : Lire, Mes projets, Glossaire (quatre liens au plus, une place
   prévue pour « Rechercher », sans lien mort). « Préparer un patron » et
   « US ↔ UK » vont au pied de page. Rien ne déborde à 390 px.
4. **Cibles** : 48 px au moins pour tout élément interactif (`--control-size`).
   Liens en ligne et liens du pied de page exemptés de la hauteur, 24 px au
   moins (WCAG 2.5.8).
5. **Texte** : rien sous 16 px ; 14 px seulement pour les étiquettes en
   capitales grasses. La vitrine `/design-system` garde ses légendes.
6. **Bordure de champ** : jeton `--color-field-border` (`#8a7d72` clair,
   `#7a7699` sombre, ≥ 3:1), montré dans la vitrine.
7. **Exemple** : « Voir un exemple » ouvre un patron dans la langue de la page
   (« Petit sapin » sur `/fr`), directement en étapes écrites, sans dialogue.
8. **Rang et étape** : « Rang 5-8 » en grand près de l'étape, « Étape 5 sur 8 »
   en petit ; sans libellé de rang, seule la position. Sur la ligne existante.
9. **Chronomètre** : ne démarre plus au premier « Suivante », seulement par ▶.
10. **Garde-fous e2e** (dans la suite Playwright) : taille du texte d'étape en
    boucle (rangs de 30, 60, 90, 120 et 200 signes × A / A+ / A++ × 390 et 820),
    cibles 48 px en boucle, en-tête sans débordement, boutons visibles avec une
    étape de 200 signes, axe clair et sombre à zéro.

## Tests

Tests inversés : le démarrage automatique du chronomètre, le nombre d'étapes de
la démo, l'ouverture de l'exemple par le dialogue « Texte ou diagramme ».

## Critères d'acceptation

- `npm run verify:ci` vert, bundle initial noté avant et après.
- `.step-body` reste sous 450 px à 820 × 1180 ; la page pleine ne défile pas à
  390 × 844 ni à 820 × 1180.
- Captures relues à 390 et 820 px, clair et sombre.

## Hors périmètre

Page « Rechercher », menu mobile, réglages dans l'en-tête, refonte de la vitrine,
erreur d'import avec issue, regroupement des boutons d'import (I-9 points 4 et 6),
préférences dans `app-mode.js` (C-4).
