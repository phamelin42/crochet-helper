# 33 — Glossaire lisible sur téléphone

**Étape d'entonnoir servie : acquisition (page d'entrée SEO qu'on quitte sans
trouver son terme).**

## Pourquoi

Audit UX-7 (`docs/audit-ux-acquisition-2026-09.md`) : `/glossary` est un
tableau de quatre colonnes et 51 lignes, dans l'ordre du fichier, sans
regroupement crochet / tricot ni US / UK ; sur téléphone il défile
horizontalement et l'on ne trouve pas son terme.

## Objectif

Un glossaire qu'on parcourt d'un pouce : ordre alphabétique, lettres repères,
filtres (technique, langue du patron), recherche existante conservée, et sur
téléphone une ligne par terme au lieu d'un tableau étroit, sans perdre le HTML
pré-rendu complet.

## Fichiers à lire

- `src/app/features/glossary/glossary-page.ts` — le tableau, `filtered()`,
  `COPY`
- `src/app/features/reader/data/glossary.ts` — `GlossaryEntry` (`craft`,
  `lang`, `region`, `slug`), par `grep -n` ; jamais en entier
- `src/app/shared/ui/segmented/segmented.ts`, `src/app/shared/ui/field/`
- `src/styles/lecteur.css` (`.glossary-filter`, `.glossary-table-scroll`),
  `hanami.css` (`.table`, `.tag`)
- `e2e/a11y.spec.ts` (reflow 320 px déjà audité pour cette route)

## À faire

1. **Ordre et repères.** Entrées triées par `term` (`localeCompare`,
   insensible à la casse), regroupées par première lettre ; chaque groupe est
   un `<tbody>` ouvert par une ligne `<th scope="rowgroup">` avec la lettre ;
   une barre de lettres en haut (liens `#lettre-a`…) qui ne liste que les
   lettres présentes.

2. **Filtres.** Deux `Segmented` au-dessus, « Tout · Crochet · Tricot »
   (`craft`, `commun` toujours inclus) et « Patrons en anglais · en français »
   (`lang`), combinés à la recherche existante ; état local, non persistant.
   « Aucun terme ne correspond » quand la liste est vide, avec un lien qui
   efface les filtres. La convention (`region` US / UK) devient un `.tag` sur
   la ligne.

3. **Téléphone.** Sous 600 px, le tableau garde ses balises mais chaque ligne
   se lit en bloc : `display: grid` sur `tr`, cellules avec `data-label` pour
   les intitulés, `thead` en `visually-hidden` ; plus de défilement
   horizontal ; le terme reste un lien vers sa page. Aucun style local :
   classes dans `lecteur.css`.

4. Le HTML pré-rendu contient les 51 entrées, triées, sans filtre appliqué ;
   le tri et le groupement sont faits dans un `computed`, pas au rendu.

## Mesure

`glossary_filtered` avec `craft` et `lang` (valeurs des filtres, pas la
recherche) ; déclaré dans `AnalyticsEvent` **et** `EVENEMENTS`.

## Tests

- Fonction pure de tri et de groupement
  (`glossary/data/glossary-groups.ts`) : ordre alphabétique sur **toutes** les
  entrées (boucle : chaque entrée ≤ la suivante), lettres présentes exactes,
  filtres combinés (crochet + français, etc.), `commun` toujours présent.
- Page : la recherche « ms » ne garde que les termes qui contiennent « ms » ;
  l'état vide affiche le message.
- e2e : à 360 px, `scrollWidth ≤ innerWidth` sur `/glossary` et `/fr/glossaire`
  avec la liste complète ; cliquer « Tricot » masque « sc » ; le HTML brut
  contient « sc » et « ms ».

## Critères d'acceptation

- `npm run verify:ci` vert ; bundle initial inchangé (page paresseuse).
- axe vert : en-têtes de groupe corrects, `data-label` ne remplacent pas les
  `<th>`.
- Français soigné.

## Hors périmètre

Ajouter des termes (fiche 30 pour le contenu), les pages d'abréviation
elles-mêmes, un index par catégorie en URL propre, la pagination.
