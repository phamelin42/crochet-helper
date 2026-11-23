# 61 — Rechercher un patron gratuit sur Ravelry

**Étapes d'entonnoir servies : acquisition (une personne qui n'a pas encore de
patron arrive avec une envie, « un sapin de Noël », pas avec un PDF) et
activation (elle repart avec un patron ouvert dans le lecteur, sans chercher
ailleurs).**

## Pourquoi

Aujourd'hui, Fil suppose qu'on arrive avec un patron. Beaucoup de lectrices
cherchent d'abord. Phil veut une recherche de patrons **gratuits** via l'API
Ravelry, une fiche par patron, des favoris et un bouton « Commencer ce patron ».
Décisions de Phil (à appliquer sans les rediscuter) : l'API ne donne pas le texte
des instructions, donc l'import est **guidé** ; favoris **sur l'appareil**, sans
compte ; identifiants « Basic auth, read only » en secrets du Worker `fil-ia`
(`RAVELRY_USER`, `RAVELRY_KEY`). Connexion Ravelry (OAuth) : plus tard.

## Objectif

Derrière un interrupteur (URL du Worker vide dans ce lot), une lectrice cherche
« christmas tree », voit des cartes, ouvre une fiche, ajoute le patron à ses
favoris, ouvre la source dans un nouvel onglet puis dépose le PDF ou colle le
texte : le projet naît relié au patron Ravelry.

## Fichiers à lire

- `docs/adr-003-mise-en-forme-ia.md` (précédent), `docs/adr-004-recherche-ravelry.md`
- `worker/src/index.ts` (`grep -n "export"`), `worker/src/quota.ts`
- `src/app/features/reader/data/ai-format.ts`, `src/app/core/ai/format-client.ts`
- `src/app/core/storage/project-store.service.ts` (`grep -n "onupgradeneeded"`)
- `src/app/features/reader/data/project-backup.ts`, `project.model.ts`
- `src/app/features/reader/pages/projects-page.ts`, `components/pattern-import.ts`
- `src/app/core/analytics/analytics.service.ts`, `tools/umami.mjs`,
  `src/app/features/legal/data/privacy-events.ts`

## À faire

1. ADR-004 et règle n° 1 de `CLAUDE.md` (trois exceptions).
2. Worker : routeur par chemin ; `GET /ravelry/recherche`, `/ravelry/patron/:id`,
   `/ravelry/patron/:id/projets`. Tout ce qui dépend des noms de l'API vit dans
   `worker/src/ravelry.ts`, chaque nom non confirmé marqué « à confirmer (doc
   non lue) ». `POST /mise-en-forme` ne change pas.
3. CSP : hôtes d'images de Ravelry dans `img-src` (`vercel.json`, `netlify.toml`).
4. Front `features/discover/` : pages « Rechercher un patron » et « Mes
   favoris » (`noIndex`), client `core/ravelry/`, composants de `shared/ui`
   (champ de recherche, carte de patron, bouton favori, icône cœur) dans la vitrine.
5. Favoris : magasin IndexedDB `favorites` (`fil` v3, migration sans perte),
   sauvegarde rétro-compatible.
6. Import guidé : source en nouvel onglet, bandeau dans le panneau d'import,
   `Project.origin`, mention dans « Mes projets ».
7. Mesure : `pattern_searched` (sans le terme), `pattern_viewed`,
   `favorite_added`, `pattern_started`.
8. Page de confidentialité (FR et EN) : le terme cherché passe par notre Worker
   vers Ravelry, sans être conservé.

## Tests

Worker avec `Deps` simulées (entrées invalides et codes amont en boucle, réponses
d'exemple écrites à la main). Unitaires : migration v2 → v3 sur une base remplie,
sauvegarde ancienne et nouvelle. `e2e/recherche-ravelry.spec.ts` (Worker simulé
par `page.route`, interrupteur posé pour le test seulement) ; preuve que, URL
vide, aucun lien n'existe.

## Critères d'acceptation

- `npm run verify:ci` et `npm run test:worker` verts ; bundle initial noté avant
  et après (rien de ce lot au premier affichage).
- Aucun secret ni donnée réelle de Ravelry dans le dépôt.
- Captures relues à 390 × 844 et 820 × 1180, clair et sombre.

## Hors périmètre

Connexion Ravelry (OAuth), patrons payants, récupération du texte d'un patron par
un serveur, activation (URL non vide : PR d'activation après lecture des
conditions de l'API et déploiement du Worker), tri et filtres avancés.
