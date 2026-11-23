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
  (OAuth) viendra plus tard, hors de ce lot.
- **Identifiants « Basic auth, read only »** en secrets du Worker `fil-ia`
  (`RAVELRY_USER`, `RAVELRY_KEY`), jamais dans le code, les tests ou les commits.

## Architecture

```
navigateur ── GET /ravelry/… ──▶ Worker fil-ia ── Basic read-only ──▶ api.ravelry.com
           ◀── JSON réduit à nos champs ──┘
                          │
              KV : compteur du jour par empreinte d'IP salée
```

Routes du Worker (la route `POST /mise-en-forme` ne change pas) :

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
- Aucune galerie de projets d'autres personnes : ce sont des contenus
  d'utilisateurs de Ravelry (voir « Licence »).
- Aucun HTML de tiers n'est transmis : la description est du **texte brut**
  (si seule `notes_html` existe, le Worker retire les balises). L'app la rend
  par segments, jamais par `innerHTML`.

## Interrupteur

`RAVELRY_URL` (`features/discover/data/`) est la base du Worker pour Ravelry.
**Vide dans ce lot** : aucune page n'est liée (en-tête, pied, écran de fin, mode
appli) et l'URL directe affiche « bientôt disponible ». Un test e2e le prouve
sur le build de production.

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

- **Pas de projets d'autres personnes** : la route `/patron/:id/projets` et toute
  galerie sont écartées (contenus d'utilisateurs, affichables seulement à des
  utilisateurs connectés, lot 6).
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

1. Trancher : accord écrit de Ravelry, ou recherche réservée aux lectrices connectées (lot 6). Puis coller les sections de
   documentation utiles (recherche, fiche, CORS, images) : on confirme les noms
   de `ravelry.ts` et les hôtes d'images.
2. Poser les secrets `RAVELRY_USER` et `RAVELRY_KEY` sur le Worker `fil-ia`.
3. Déployer : `npx wrangler deploy` dans `worker/` (aucun workflow ne déploie le Worker).
4. PR d'activation : renseigner `RAVELRY_URL`, lier les pages, ajuster la CSP.

## Pas décidé

Connexion Ravelry (OAuth), favoris synchronisés, patrons payants, tris et filtres
avancés, cache côté Worker (écarté par la licence : 1i et 2c).
