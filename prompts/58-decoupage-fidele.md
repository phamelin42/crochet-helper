# 58 — Découpage fidèle : rien ne se perd, chaque conseil et chaque photo à sa place

**Étape d'entonnoir servie : activation (le patron collé ou importé doit se lire
d'un bout à l'autre, sans qu'une partie manque, sans conseil égaré ni photo
reléguée à la fin ; c'est l'écart entre « j'ai collé mon patron » et « je le suis
au crochet »).**

## Pourquoi

Demande de Phil : « Trop souvent le découpage est moyen, des parties manquent,
les conseils ne sont pas affichés ou pas au bon endroit, et les images
s'affichent à la fin plutôt qu'à l'étape concernée. » Le parseur
(`pattern-parser.ts`) est le seul découpeur, et les tests de non-régression ne
comparaient que le **nombre** de pièces et d'étapes : aucun ne disait où va un
conseil, une photo, une finition, ni si une ligne disparaissait. Défauts
trouvés en écrivant le test « rien ne se perd » :

- une pièce sans rang numéroté disparaissait avec tout son texte (pompon,
  assemblage, frange) ; un en-tête court sans point (« FO and weave in ends »)
  devenait une fausse pièce vide, supprimée ;
- « Rangs 5 à 8 » était lu « Rang 5 » avec « à 8 : » dans le corps (l'espace
  avant « à » était avalé avant la reconnaissance de l'étendue) : pas de
  répétitions, un libellé faux ;
- les finitions (« Fasten off. Sew the ears… ») finissaient en conseil de la
  dernière étape, ou fondues dans son corps quand elles contenaient un chiffre ;
- une photo posée sous un titre de pièce, avant le texte qu'elle illustre, partait
  sur la dernière étape de la pièce précédente ; avant toute étape, elle restait
  dans un panneau replié ;
- `PatternStep.after` était rempli mais jamais lu ;
- la mise en forme par IA pouvait perdre ou doubler un marqueur `[image N]` sans
  que la garde de fidélité le voie.

## Objectif

Une lectrice qui colle un patron retrouve **chaque ligne** de sa source dans
l'application, les conseils sur l'étape qu'ils commentent, les finitions comme
des choses à faire, et chaque photo sur l'étape qu'elle illustre.

## Fichiers à lire

- `src/app/features/reader/data/pattern-parser.ts` (`grep -n` : `ROW`,
  `ADVICE_LEAD`, `FINISH_LEAD`, `newPiece`, `attachImages`) et
  `pattern.model.ts`
- `src/app/features/reader/data/fixtures/SOURCES.md` et `corpus.ts`
- `src/app/features/reader/components/pattern-photos.ts`
- `worker/src/fidelite.ts`, `worker/src/consigne.ts`
- `CLAUDE.md`, « Pièges » : un test ne fige jamais un comportement douteux,
  énumération testée par boucle, 450 px de `reading-mode`

## À faire

1. **Corpus** : sept patrons écrits pour le dépôt (FR et EN, tricot et crochet,
   trois textes de PDF avec marqueurs), sans droit d'auteur tiers ; provenance
   dans `fixtures/SOURCES.md`.
2. **Invariant « rien ne se perd »** (`pattern-fidelity.spec.ts`) : sur toutes les
   fixtures, chaque ligne non vide de la source (hors marqueurs d'image, rebut de
   mise en page et en-têtes de section) se retrouve dans le patron, à la
   normalisation près (une seule fonction). La fixture 01, une page de blog sans
   rang, ne produit aucun patron : c'est le cas « à passer par l'IA », vérifié à
   part, pas exclu.
3. **Placement** (`pattern-placement.spec.ts`) : par fixture, tel conseil est le
   `tip` de telle étape, telle photo est sur telle étape.
4. **Parseur** : « Rangs 5 à 8 » lu comme une étendue ; finitions et assemblage
   après le dernier rang d'une pièce en étapes sans libellé ; conseil annoncé
   (Astuce, Conseil, Remarque, Attention, N'oubliez pas, Tip, Hint, Note, NB…)
   conservé même chiffré, sur l'étape qu'il suit, ou en `notes` de la première
   étape s'il précède le premier rang ; remarque entre crochets en conseil de
   l'étape qu'elle suit ; pièce sans rang conservée, une étape par paragraphe ;
   `PatternStep.after` supprimé.
5. **Photos** : un marqueur sous un titre de pièce, ou entre deux pièces, va au
   premier rang de la pièce qui commence ; les références explicites (« see
   image 3 ») gardent la priorité ; une photo avant toute étape reste au patron
   et s'affiche **dépliée** à la première étape, sous l'étape.
6. **Worker** : `fidelite.ts` refuse une sortie où un `[image N]` de l'entrée
   manque, est dupliqué, ou n'existe pas dans l'entrée.

## Tests

Voir les deux fichiers ci-dessus, `pattern-parser.spec.ts` (finitions, annonces
et photos, chacune en boucle sur toutes les formes listées) et
`worker/src/fidelite.spec.ts`. Tests inversés : le comptage de 02, 03 et 05, la
photo « Ears » qui était attendue sur « Head », le dessin de la démo et le
disque au crochet (« Fasten off. » est une étape).

## Critères d'acceptation

- `npm run verify:ci` et `npm run test:worker` verts, bundle initial noté.
- Aucune ligne perdue sur le corpus ; aucun test n'en fige une.
- `.step-body` reste sous 450 px à 820 × 1180.

## Hors périmètre

Découper une étape en plusieurs (une finition de deux phrases reste une étape),
déplacer les photos entre étapes par une IA, réécrire les patrons 01 à 05
(licence à confirmer), changer l'affichage des conseils.
