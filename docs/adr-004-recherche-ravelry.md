# ADR 004 — Rechercher des patrons gratuits sur Ravelry

**Statut : Proposé — activation suspendue à l'accord de Ravelry.** Le code est
livré derrière un interrupteur éteint (voir « Licence »). Troisième écart borné à la règle « aucun back-end », après la mesure
d'audience (ADR-001) et la mise en forme par IA (ADR-003).

## Problème

Fil suppose qu'on arrive avec un patron. Beaucoup de lectrices cherchent
d'abord (« un sapin de Noël »). Ravelry est la référence, et son API publique
permet de chercher des patrons.

## Ce que Phil a tranché

- **Patrons gratuits seulement.**
- **L'API ne donne pas le texte des instructions** : « Commencer ce patron » est
  un **import guidé**. On ouvre la source (PDF Ravelry ou site de la créatrice)
  dans un nouvel onglet ; la lectrice dépose le PDF ou colle le texte dans le
  lecteur ; le projet naît relié au patron. Aucun serveur ne récupère un patron.
- **Favoris sur l'appareil** (IndexedDB), sans compte. La connexion Ravelry
  (OAuth, fiche 62) est décrite plus bas.
- **Identifiants « Basic auth, read only »** en secrets du Worker `fil-ia`
  (`RAVELRY_USER`, `RAVELRY_KEY`), jamais dans le code, les tests ou les commits.

## Architecture

```
navigateur ── GET /ravelry/… ──▶ Worker fil-ia ── Basic read-only ──▶ api.ravelry.com
           ◀── JSON réduit à nos champs ──┘
                          │
              KV : compteur du jour par empreinte d'IP salée
```

Le Worker expose `Retry-After` (CORS) pour que la page puisse le lire. Routes du Worker (la route `POST /mise-en-forme` ne change pas) :

| Route                                    | Rôle                                    |
| ---------------------------------------- | --------------------------------------- |
| `GET /ravelry/recherche?q=&craft=&page=` | liste de patrons gratuits (cartes)      |
| `GET /ravelry/patron/:id`                | fiche : texte brut, photos, métadonnées |

- Entrées bornées : `q` de 1 à 100 caractères après `trim`, `craft` dans
  `crochet | knitting`, `page` entier de 1 à 50, `id` entier positif. Sinon 400.
- Tout ce qui dépend des noms de l'API vit dans `worker/src/ravelry.ts` : URL
  construite depuis la requête validée, réponse **réduite** à nos champs. Les
  tests y utilisent des réponses écrites à la main, aucune donnée réelle.
- La réponse amont est bornée (2 Mo), l'appel a un délai (8 s). Ravelry coupe à
  10 s (504) : pages raisonnables.
- Erreurs amont : 429 → `trop-de-demandes` (avec `Retry-After`), 404 →
  `introuvable`, le reste → `indisponible`. Secrets absents → 503.
- Quota : 120 requêtes Ravelry par jour et par personne (`QUOTA_RAVELRY_JOUR`),
  empreinte d'IP salée par jour comme en ADR-003.
- Aucune galerie de projets d'autres personnes sans connexion (fiche 62) : ce sont des contenus
  d'utilisateurs de Ravelry (voir « Licence »).
- Aucun HTML de tiers n'est transmis : la description est du **texte brut**
  (si seule `notes_html` existe, le Worker retire les balises). L'app la rend
  par segments, jamais par `innerHTML`.

## Interrupteur

`RAVELRY_URL` (`src/app/core/ravelry/ravelry-access.ts`) est la base des routes
`/ravelry/…` du Worker. **Vide dans ce lot**, par un `define` d'`angular.json`
(configuration `production`) : aucune page n'est liée et l'adresse directe
affiche « bientôt disponible », sans appeler le Worker. Seul le lien « Chercher
un autre patron » de l'écran de fin (chargé à la demande) existe déjà, et ne
s'affiche que si l'interrupteur est renseigné.

**Non lié dans ce lot, volontairement** : le pied de page, l'en-tête et la barre
d'onglets du mode appli. Mesuré : deux liens dans le pied de page coûtent
0,6 ko de code mort au bundle initial, déjà au-dessus de son budget. La PR
d'activation les ajoute (et retire les deux routes de l'exemption de
`site-footer.spec.ts`).

**Tests de bout en bout** : un second build (`npm run build:ravelry-e2e`, soit
`ng build -c production,ravelry-e2e`) renseigne l'interrupteur par `define` dans
`dist-ravelry`, jamais livré ; le projet Playwright `ravelry` le sert (reconstruit
à chaque lancement) avec le Worker simulé par `page.route`. Le build livré, éteint,
est testé par `e2e/recherche-ravelry-eteinte.spec.ts` (aucun lien, aucun appel).

## Ce qui est établi, et ce qui reste à confirmer

Établi (documentation lue par Phil, 26 octobre 2026) : base `https://api.ravelry.com`,
HTTPS obligatoire ; Basic read-only (`user:clé`) pour les méthodes non marquées
« authenticated » ; `GET /patterns/search.json` paginé (`page`, `page_size`,
`paginator`), `GET /patterns/{id}.json` ;
codes 400, 401, 403, 404, 429 (limite par méthode), 500, 503, 504 (> 10 s) ;
ETags ; tri par `sort`.

**À confirmer (doc non lue)**, isolé dans `worker/src/ravelry.ts` et marqué à
chaque nom : paramètres `query`, `craft`, `availability=free`, `photo=yes`,
`sort` ; champs `id`, `name`, `permalink`, `free`, `pattern_author`,
`first_photo` (`square_url`, `small_url`, `medium_url`), `notes`, `notes_html`,
`photos`, `download_location`, `url`, `ravelry_download`, `craft`, `yarn_weight`,
`difficulty_average` ; section CORS de
la doc (inutile ici : l'app n'appelle que notre Worker).

**La doc collée par Phil s'arrête avant `patterns/search`.** Les noms ci-dessus
restent à confirmer. Choix prudents :

- aucune donnée Ravelry n'est stockée côté Worker ni envoyée à l'IA ;
- cache HTTP court seulement : `Cache-Control: public, max-age=300` ;
- attribution « Données et photos : Ravelry », nom de la créatrice et lien vers
  la page Ravelry du patron sur chaque carte et chaque fiche ;
- patrons gratuits seulement, filtrés aussi par le Worker si le filtre amont échoue ;
- côté appareil, un favori ne garde que l'id, le nom, la créatrice, l'URL de
  la vignette, le lien Ravelry et la date d'ajout.

## Licence

Phil a fourni le « Application Developer and API License Agreement » de Ravelry
(v1.0, 6 novembre 2020). Ce qui pèse sur ce lot, cité ou résumé :

- « Note that we can't give you permission to display content that belongs to
  our users (photos, project notes, forum posts, etc) for any purpose other than
  providing Ravelry users with an alternate interface to Ravelry. »
- « if you are interested in using Ravelry's yarn and pattern data to develop an
  application that is unrelated to Ravelry, please get in touch with us at
  api@ravelry.com. »
- 1c : usage commercial réservé aux applications dont le public principal est
  fait d'utilisateurs de Ravelry, sauf accord exprès.
- 1e : ne jamais laisser croire que l'application vient de Ravelry, lui est
  associée ou approuvée par elle ; dire clairement qui la fournit.
- 1f : ne pas concurrencer ni diminuer le besoin des applications commerciales
  de Ravelry.
- 1h et 2b : cesser d'utiliser et détruire les données sur demande de Ravelry
  ou du propriétaire.
- 1i : ne pas revendre, redistribuer ni syndiquer l'accès à l'API ou aux données.
- 2a : indiquer de façon visible comment l'application collecte, stocke et
  utilise les données et contenus des utilisateurs de Ravelry.
- 2c : ne stocker ces données que le temps nécessaire au service.

**Analyse (une lecture du texte, pas un conseil de juriste).** Le public de Fil
n'est pas principalement fait d'utilisateurs de Ravelry, et la recherche
affiche des photos de patrons, contenus des créatrices (donc d'utilisateurs de
Ravelry), à des visiteuses non connectées. L'activation publique demande donc,
au choix : un **accord écrit de Ravelry** (api@ravelry.com), ou de **réserver la
recherche aux lectrices connectées à leur compte Ravelry** (lot 6, OAuth). Tant
que Phil n'a pas tranché, l'interrupteur reste vide.

Conséquences dans ce lot :

- **Pas de projets d'autres personnes sans connexion** : la galerie (`/patron/:id/projets`)
  n'existe que pour une lectrice connectée (voir « Connexion Ravelry »).
- Sur la recherche, la fiche et Mes favoris : « Pattern Reader n'est ni affilié
  à Ravelry ni approuvé par Ravelry. Données et photos : Ravelry et leurs
  auteurs. » (1e), le nom de la créatrice et le lien vers la page Ravelry ; aucun
  logo Ravelry.
- Section « Ravelry » visible dans la page de confidentialité (2a) : ce que le
  Worker envoie, ce qui n'est pas conservé, ce qui reste sur l'appareil, comment
  l'effacer.
- Un moyen de tout effacer : « Retirer tous mes favoris » (1h, 2c).
- Aucun cache, aucune copie côté Worker (1i, 2c) ; le Worker ne sert que
  l'interface de Fil.

## Connexion Ravelry (OAuth 2.1)

_Fiche 62. Le statut de l'ADR ne change pas : tout reste derrière l'interrupteur
`FIL_RAVELRY_URL`, vide en production._

**Pourquoi.** La licence réserve l'affichage des contenus d'utilisateurs à « une
interface alternative à Ravelry pour ses utilisateurs ». Phil écrit à Ravelry pour
ouvrir la recherche à toutes ; **en parallèle**, la recherche peut être réservée
aux lectrices connectées à **leur** compte Ravelry. Deux modes, `FIL_RAVELRY_ACCES` :
`compte` (défaut) ou `ouvert` (seulement si Ravelry l'accepte par écrit). En mode
`ouvert`, la connexion ne sert qu'à la galerie des ouvrages.

**Flux** (doc officielle lue le 26 octobre 2026 : OAuth 2.1, PKCE obligatoire,
`https://auth.ravelry.com/oauth2/auth` et `/oauth2/token`, une clé OAuth 2.0 n'y
sert pas) :

```
navigateur ── code_challenge S256, state ──▶ auth.ravelry.com/oauth2/auth
           ◀── /ravelry-callback?code=…&state=… ──┘
navigateur ── POST /ravelry/oauth/jeton {code, code_verifier, redirect_uri} ──▶ Worker
Worker ── Basic(id:secret), formulaire ──▶ auth.ravelry.com/oauth2/token
navigateur ◀── {access_token, refresh_token, expires_in} (no-store) ──┘
```

- **Scope** : `offline_access` seulement (jeton de rafraîchissement). Aucun scope
  d'écriture ; la doc lue ne cite pas de scope de lecture minimal, on n'en invente pas.
- **Adresse de retour unique**, indépendante de la langue :
  `https://patternreader.com/ravelry-callback` (origine du site + chemin). Route hors
  `route-paths.json`, `noIndex`, hors sitemap, pré-rendue (« Connexion à Ravelry en
  cours… » dans les deux langues). La langue et la page d'origine sont gardées le temps
  de l'aller-retour (sessionStorage, avec `state` et `code_verifier`, effacés au retour,
  10 minutes au plus) : la lectrice revient où elle était, dans sa langue. La page efface
  `code` et `state` de l'adresse (`history.replaceState`) dès sa création, avant que le
  traceur de mesure ne charge.
- **Ce que le Worker voit** : le code, le `code_verifier`, l'adresse de retour (comparée à
  une liste blanche, `RAVELRY_REDIRECT_URIS`, égalité exacte), puis les jetons, **le temps
  de la réponse**. **Ce qu'il ne garde pas** : rien (aucune écriture KV de jeton ou de code ;
  le seul compteur du jour par empreinte salée, comme pour la recherche), aucun journal.
  Il ne renvoie que `access_token`, `refresh_token`, `expires_in`, avec `Cache-Control:
no-store`. Entrées bornées (corps 4 Ko, code 512, verifier 43 à 128, jeton 2 048), origine
  vérifiée (`ORIGINES`). `invalid_grant` devient 401 `session-expiree` ; le texte d'erreur
  de Ravelry n'est jamais relayé. Secrets `RAVELRY_OAUTH_ID` et `RAVELRY_OAUTH_SECRET` :
  absents, 503.
- **Où sont les jetons** : IndexedDB, base `fil` v4, magasin `ravelry-session` (pas
  `localStorage`), avec l'heure d'expiration. Jamais dans la sauvegarde exportée (qui
  n'écrit que projets, images et favoris), les journaux, la mesure ni une adresse. Jeton
  d'accès : 1 heure ; renouvelé cinq minutes avant l'expiration et sur un 401, **une seule
  fois** ; un renouvellement refusé efface la connexion et le dit.
- **Appels au nom de la lectrice** : `Authorization: Bearer` vers le Worker, qui le
  transmet à Ravelry à la place de la clé en lecture seule. Réponse jamais en cache partagé.
- **Le serveur n'attend pas l'interface** : en mode `compte` (variable `RAVELRY_ACCES`,
  défaut `compte`, toute autre valeur que `ouvert` vaut `compte`), recherche et fiche sans
  jeton répondent 403 `connexion-requise`.
- **Galerie des ouvrages** (`GET /ravelry/patron/:id/projets?page=`, rétablie) : réservée
  aux requêtes portant un jeton, quel que soit le mode ; photo (taille moyenne) et lien
  vers le projet, rien d'autre (ni nom, ni notes), 24 au plus par page.
- **Se déconnecter** efface tout localement (et vide les résultats en mémoire) ; l'accès
  de l'application se retire aussi depuis les réglages du compte Ravelry.

**À confirmer (doc non lue)**, marqué dans `worker/src/ravelry.ts` : le chemin
`/patterns/{id}/projects.json` et ses paramètres `page`, `page_size` ; les champs
`projects`, `permalink`, `user.username` (seulement pour fabriquer le lien) et
`first_photo.medium_url` ; le fait que `api.ravelry.com` accepte `Authorization: Bearer`
avec ce jeton ; l'adresse d'inscription (le lien « Créer un compte » mène à la page
d'accueil de Ravelry).

## CSP

`img-src` reçoit `https://*.ravelrycache.com` et `https://*.ravelry.com` dans
`vercel.json` et `netlify.toml` (`tools/check-csp.mjs` les compare). **Hôtes à
confirmer** sur une vraie réponse. `connect-src` ne change pas : l'app n'appelle
que `fil-ia.hamelinphilippe1.workers.dev`.

## Confidentialité

Le terme cherché passe par notre Worker puis par Ravelry, **sans être conservé**
chez nous. La mesure d'audience ne reçoit ni le terme, ni le nom, ni l'id d'un
patron : seulement le métier, le nombre de résultats par tranche et des
compteurs. La page de confidentialité le dit, en français et en anglais.

## Pour activer (Phil)

1. Trancher : accord écrit de Ravelry, ou recherche réservée aux lectrices connectées (fiche 62). Puis coller les sections de
   documentation utiles (recherche, fiche, CORS, images) : on confirme les noms
   de `ravelry.ts` et les hôtes d'images.
2. Poser les secrets `RAVELRY_USER` et `RAVELRY_KEY` sur le Worker `fil-ia`.
3. Déployer : `npx wrangler deploy` dans `worker/` (aucun workflow ne déploie le Worker).
4. PR d'activation : renseigner `RAVELRY_URL`, lier les pages, ajuster la CSP.

**Pour le mode « compte »** (connexion Ravelry, fiche 62), en plus : enregistrer
l'application OAuth 2.1 chez Ravelry avec l'adresse de retour
`https://patternreader.com/ravelry-callback` ; poser les secrets `RAVELRY_OAUTH_ID` et
`RAVELRY_OAUTH_SECRET` sur le Worker ; renseigner `FIL_RAVELRY_CLIENT_ID` (public) dans
`angular.json` (configuration `production`). `RAVELRY_ACCES` reste `compte` dans
`wrangler.toml` tant que Ravelry n'a pas accepté l'ouverture par écrit ; alors seulement,
`ouvert` ici et `FIL_RAVELRY_ACCES` dans `angular.json`.

## Pas décidé

Favoris synchronisés, patrons payants, tris et filtres
avancés, cache côté Worker (écarté par la licence : 1i et 2c).
