# 62 — Se connecter à son compte Ravelry (OAuth 2.1)

**Étapes d'entonnoir servies : activation (une lectrice connectée trouve un
patron et le lance sans quitter Fil) et rétention (elle revient chercher le
prochain ouvrage, sa connexion l'attend).**

## Pourquoi

La licence de l'API Ravelry (citée dans l'ADR-004) réserve l'affichage des
contenus d'utilisateurs à « une interface alternative à Ravelry pour ses
utilisateurs ». Décision de Phil : il écrit à Ravelry pour ouvrir la recherche à
toutes ; **en parallèle**, on prépare une version où la recherche est réservée
aux lectrices connectées à **leur** compte Ravelry. Si Ravelry accepte : mode
« ouvert » ; sinon : mode « compte ».

## Objectif

Derrière l'interrupteur `FIL_RAVELRY_URL` (vide en production), une lectrice se
connecte à Ravelry (OAuth 2.1 avec PKCE, lecture seule), cherche, ouvre une
fiche et voit les ouvrages réalisés avec ce patron. Ses jetons restent sur son
appareil ; le Worker ne conserve rien.

## Décisions déjà prises (à appliquer sans les rediscuter)

- Flux OAuth 2.1, PKCE S256 obligatoire, scope `offline_access` seulement (aucun
  scope d'écriture, aucun scope de lecture inventé).
- Adresse de retour unique, indépendante de la langue :
  `https://patternreader.com/ravelry-callback` (hors des paires de langues,
  `noIndex`, hors sitemap).
- Le Worker échange le code et rafraîchit le jeton (le secret client reste chez
  lui), compare le `redirect_uri` à une liste blanche, ne garde rien et ne
  renvoie que `access_token`, `refresh_token`, `expires_in`.
- Jetons dans IndexedDB, jamais dans la sauvegarde, l'URL, les journaux ni la
  mesure.
- Mode d'accès `FIL_RAVELRY_ACCES` : `compte` (défaut) ou `ouvert`. Le Worker
  applique aussi le mode (`RAVELRY_ACCES`) : l'interface seule ne protège rien.
- Galerie des ouvrages : réservée aux requêtes portant un jeton, quel que soit
  le mode ; photo et lien du projet, rien d'autre.

## Fichiers à lire

- `docs/adr-004-recherche-ravelry.md`, `prompts/61-recherche-ravelry.md`
- `worker/src/ravelry.ts`, `ravelry-routes.ts`, `index.ts`, `quota.ts`
- `src/app/core/ravelry/`, `src/app/features/discover/`, `core/storage/`
- `e2e/ravelry-simule.ts`, `e2e/recherche-ravelry*.spec.ts`, `e2e/a11y.spec.ts`
- `tools/umami.mjs`, `src/app/features/legal/data/privacy-events.ts`

## À faire

1. Worker : `POST /ravelry/oauth/jeton` et `/ravelry/oauth/rafraichir` ;
   `Authorization: Bearer` transmis à Ravelry ; 403 `connexion-requise` selon le
   mode ; `GET /ravelry/patron/:id/projets` réservée aux jetons. Tout nom non
   confirmé marqué « à confirmer (doc non lue) » dans `worker/src/ravelry.ts`.
2. Navigateur (`core/ravelry/`) : PKCE, `state`, aller-retour borné à 10 min,
   échange via le Worker, jetons en IndexedDB, rafraîchissement avant
   expiration et sur un 401 (une fois), déconnexion.
3. Page `/ravelry-callback` (hors `route-paths.json`, ajoutée à l'audit axe).
4. Recherche et fiche derrière la connexion en mode `compte` ; favoris locaux
   toujours consultables ; galerie sur la fiche.
5. Composant d'état de connexion dans `shared/ui` (vitrine), dans la recherche
   et dans Réglages.
6. ADR-004 (section « Connexion Ravelry »), confidentialité FR et EN,
   événements `ravelry_connected` et `ravelry_disconnected` (sans donnée).

## Tests

Unitaires : PKCE (vecteur de la RFC 7636), `state`, aller-retour expiré, jetons
relus en IndexedDB après `vi.waitFor`, rafraîchissement, 401, sauvegarde.
Worker en boucle (redirect_uri, tailles, secrets, `invalid_grant`, réponse
réduite, `no-store`, Bearer, 403, journaux). `e2e/connexion-ravelry.spec.ts`
avec Ravelry et le Worker simulés, axe clair et sombre, 48 px, reflow 320 px.
L'interrupteur éteint ne lie ni n'appelle rien.

## Critères d'acceptation

- `npm run verify:ci` et `npm run test:worker` verts ; bundle initial noté avant
  et après.
- Aucun secret ni jeton réel dans le dépôt.
- Captures relues à 390 × 844 et 820 × 1180, clair et sombre.

## Hors périmètre

Activation (URL non vide), scopes d'écriture, synchronisation des favoris,
patrons payants, enregistrement de l'application chez Ravelry (Phil).
