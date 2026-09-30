# ADR 002 — Comptes, synchronisation et paiement

**Statut : acceptée par Phil le 30 septembre 2026.** Ce document est le seul
livrable de la fiche 20. Aucun code, aucune dépendance, aucun compte chez un
prestataire, aucune modification de `CLAUDE.md` ni de la CSP n'ont été faits :
rien ne se construit avant le jalon du §2.

## Ce que Phil a déjà tranché (30 septembre 2026)

- Le gel du lot 8 est levé.
- Option retenue : **C ou D** (comptes et synchronisation), à départager ici.
  La raison : que les projets suivent la lectrice d'un appareil à l'autre.
- Budget d'hébergement : **10 € par mois au plus**. Toute option qui le dépasse
  au jalon d'audience retenu est écartée, chiffre à l'appui.
- Ce qui est payant : **la synchronisation entre appareils, et elle seule**.
- Le compte est **optionnel et réservé aux abonnées** : pas de compte gratuit,
  pas d'essai gratuit. Sans compte, l'application marche comme aujourd'hui.

## Avertissement sur les chiffres

Cette exécution n'avait pas accès au réseau : **les tarifs ci-dessous viennent
des grilles publiques telles que je les connaissais, sans relecture le
30 septembre 2026.** Ils sont marqués « à confirmer » et chacun cite la page où
le vérifier. Avant de décider, il faut ouvrir ces pages et corriger le tableau
si un tarif a bougé. Les ordres de grandeur, eux, ne changent pas la
conclusion : voir « Sensibilité » plus bas.

## 1. Quel problème paie-t-on ?

Trois candidats :

| Ce qu'on fait payer                    | Verdict                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| L'existence de l'outil                 | Écarté : c'est un don (option A), sans lien avec un besoin de la lectrice.                                                           |
| Des fonctions en plus                  | Écarté par Phil : une clé de licence (B) débloque des fonctions sans déplacer les projets.                                           |
| **La synchronisation entre appareils** | **Retenu.** C'est le seul service qui coûte réellement à faire tourner (stockage, serveur, sauvegardes) : le prix suit un coût réel. |

Autrement dit : le compte n'existe que pour synchroniser, et l'abonnement paie
l'hébergement de cette synchronisation. Le prix n'est pas fixé ici (il dépend du
coût réel au jalon, voir §7 et « Ce que Phil doit trancher »).

### Ce que coûteraient A et B, en regard (sans rouvrir le choix)

- **A — sauvegarde fichier et dons** : aucun changement d'architecture, mais la
  lectrice de 60 ans qui change de tablette doit savoir exporter un fichier, le
  transférer et l'importer. C'est déjà possible (fiche 16) et cela reste le
  filet de sécurité de toute option ci-dessous.
- **B — clé de licence hors ligne** : ni compte ni serveur à nous, mais la clé
  se partage et rien ne suit la lectrice d'un appareil à l'autre : elle ne
  répond pas à la demande.

## 2. Le jalon d'audience qui déclenche la décision

Ce qu'on mesure aujourd'hui (rapports quotidiens de la branche `rapports`,
25–28 septembre 2026) : **35 visites sur 8 jours**, 1 à 2 visiteuses par jour,
sous le seuil de 100 visites que le pilote fixe pour analyser
(`docs/pilote-automatique.md`). Le retour est mesuré depuis la fiche 21
(tranches d'ancienneté, sans identifiant), mais l'échantillon est trop petit
pour porter un taux.

À ce niveau, un service de synchronisation coûterait plus de travail que de
revenu : même 5 % de visiteuses payantes à 2 € par mois ne couvriraient rien.

**Jalon proposé** (à valider par Phil) : construire seulement quand les trois
conditions tiennent **sur 30 jours glissants** :

1. **au moins 1 000 visiteuses par mois** (ordre de grandeur du premier palier
   de coûts ci-dessous) ;
2. **au moins 20 % de visites de retour** (tranche `returning_visit_*` de la
   fiche 21) : sans habitude, personne ne synchronise ;
3. **au moins 50 inscriptions à la liste d'attente** (fiche 22), avec la
   question « voulez-vous retrouver vos projets sur un autre appareil ? » : le
   seul signal de demande qui ne soit pas une supposition.

Tant que le jalon n'est pas atteint, la décision reste « ne rien construire » ;
l'ADR sert à savoir quoi faire le jour venu, pas à démarrer.

## 3. Options C et D, coûts mensuels

### Hypothèses de volume

Trois paliers de **lectrices actives par mois** (visiteuses qui ouvrent un
projet synchronisé) : **1 000**, **10 000**, **100 000**.

Stockage : on ne synchronise que le **texte et la progression** des projets,
chiffrés. Ordre de grandeur : 200 Ko par lectrice (une dizaine de projets
de 20 Ko), soit 0,2 Go, 2 Go et 20 Go aux trois paliers. Les images de patron
(fiche 34) **restent locales** : elles feraient passer le palier 10 000 à
plusieurs dizaines de Go et sortiraient du budget. À écrire dans la fiche de
mise en œuvre.

Trafic : quelques synchronisations par jour, quelques Ko chacune : négligeable
devant le stockage.

### C — back-end à nous

Un seul petit service (base SQLite ou PostgreSQL, API de dépôt et de lecture de
blocs chiffrés, envoi de courriels de confirmation) sur un VPS européen, avec
sauvegardes.

| Palier  | Machine indicative                    | Coût mensuel estimé                           |
| ------- | ------------------------------------- | --------------------------------------------- |
| 1 000   | 1 vCPU, 2 Go, 20 Go de disque         | **≈ 4 à 5 €** (serveur + sauvegardes)         |
| 10 000  | 2 vCPU, 4 Go, 40 Go de disque         | **≈ 7 à 10 €** (serveur + sauvegardes)        |
| 100 000 | 4 vCPU, 8 Go, volume de 40 Go et plus | **≈ 20 à 30 €** — **écarté** (budget dépassé) |

Sources, à confirmer : grille Hetzner Cloud
(<https://www.hetzner.com/cloud>, gamme CX/CPX, sauvegardes à environ 20 % du
prix du serveur) et grille OVHcloud VPS (<https://www.ovhcloud.com/fr/vps/>).
Courriels de confirmation : offre gratuite de Brevo (<https://www.brevo.com/pricing/>,
300 courriels par jour) : 0 € aux deux premiers paliers.

Le VPS OVH existant (celui d'Umami, ADR 001) **ne doit pas** héberger la
synchronisation : il partage la machine du serveur de jeu, et des données de
lectrices n'ont pas à dépendre de ses plafonds mémoire ni de ses pannes.

À ajouter, hors facture : **du temps d'astreinte** (mises à jour de sécurité,
restauration testée, surveillance). C'est le vrai coût de C, et il ne se chiffre
pas en euros.

### D — service tiers d'authentification et de base

| Service                                                                           | 1 000                                                                                                                                 | 10 000                                          | 100 000                                                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Supabase** (<https://supabase.com/pricing>)                                     | 0 € en offre gratuite, mais projet mis en pause après une semaine d'inactivité ; **offre Pro ≈ 25 $ (≈ 23 €)** pour un service fiable | ≈ 25 $ (≈ 23 €)                                 | ≈ 25 $ + dépassement de stockage, ≈ 30 à 40 $                                              |
| **Firebase** (Authentication et Firestore, <https://firebase.google.com/pricing>) | ≈ 0 € (quotas gratuits)                                                                                                               | ≈ 0 à 5 €                                       | Authentification payante au-delà de 50 000 comptes actifs : plusieurs centaines de dollars |
| **Clerk** (authentification seule, <https://clerk.com/pricing>)                   | 0 € (10 000 comptes actifs gratuits)                                                                                                  | 0 €, mais **ne stocke rien** : une base en plus | ≈ 25 $ + 0,02 $ par compte au-delà de 10 000, soit ≈ 1 800 $                               |

Lecture :

- **Supabase** respecte le budget seulement en offre gratuite, dont la mise en
  pause d'un projet inactif est incompatible avec une promesse de
  synchronisation. En offre Pro il dépasse 10 €, quel que soit le palier :
  **écarté**.
- **Firebase** tient le budget aux deux premiers paliers (le suivi de la
  consommation est à charge de Phil, la facture étant à l'usage) mais met les
  données chez Google, avec un verrouillage fort et un modèle de données
  propriétaire. C'est la seule option D qui reste dans le budget.
- **Clerk** ne résout que l'authentification : il faut de toute façon une base,
  donc un second service. **Écarté.**

### Départage : C ou D ?

| Critère                            | C — à nous                                        | D — Firebase                                  |
| ---------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Coût aux paliers 1 000 et 10 000   | ≈ 4 à 10 €, prévisible                            | ≈ 0 à 5 €, à l'usage (facture variable)       |
| Données chez un tiers              | non, en Europe chez un hébergeur choisi           | oui, chez Google (région européenne possible) |
| Chiffrement de bout en bout        | oui, le serveur ne stocke que des blocs opaques   | oui, mais le service est conçu pour lire      |
| Travail à écrire et à tenir        | un petit service, des sauvegardes, de l'astreinte | moins de serveur, plus de règles de sécurité  |
| Sortie si l'offre ne rapporte rien | on éteint un serveur                              | on exporte une base propriétaire              |

**Recommandation : C**, dans sa forme la plus petite (voir §9). Elle coûte à
peine plus cher que D au jalon proposé, garde les données hors d'un géant, et
l'astreinte reste modeste parce que le serveur ne comprend rien à ce qu'il
stocke : pas de recherche, pas de fusion côté serveur, seulement des blocs
chiffrés et des versions.

### Sensibilité

Si les tarifs cités ont bougé de ±50 %, C reste sous 15 € au palier 10 000 et
sous 10 € au palier 1 000 ; Supabase Pro reste au-dessus de 10 € ; Firebase
reste dépendant de l'usage. Le classement ne change pas. Ce qui le
changerait : un palier d'audience supérieur à 10 000 lectrices actives, auquel
cas C dépasse le budget et il faut soit augmenter le prix, soit rediscuter le
budget.

## 4. Données personnelles

| Donnée                                                           | Où                                                                 | Durée                                                        | Pourquoi                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------ |
| Adresse électronique                                             | base du service                                                    | tant que le compte existe                                    | identifier le compte, écrire à la lectrice |
| Empreinte de dérivation du mot de passe (jamais le mot de passe) | base du service                                                    | idem                                                         | authentifier sans connaître le secret      |
| Blocs chiffrés (projets)                                         | base du service                                                    | idem                                                         | la synchronisation elle-même               |
| Dates de création et de modification, taille des blocs           | base du service                                                    | idem                                                         | résoudre les conflits, mesurer le stockage |
| Adresse IP                                                       | journaux du serveur                                                | 7 jours, puis effacée                                        | sécurité, limitation des abus              |
| Identifiant d'abonnement et statut de paiement                   | base du service ; les données de carte restent chez le prestataire | durée légale de conservation comptable pour la seule facture | facturation                                |
| Jeton de session                                                 | `localStorage` de l'appareil                                       | jusqu'à déconnexion                                          | rester connectée                           |

Conservation (proposition) : le compte n'existant qu'avec l'abonnement, la
fin de l'abonnement ouvre un **délai de 30 jours** (le temps de se réabonner
sans rien renvoyer), annoncé par courriel ; ensuite l'adresse, les blocs
chiffrés et l'identifiant d'abonnement sont supprimés, les sauvegardes purgées
sous 30 jours de plus. Rien ne se perd pour la lectrice : ses projets sont sur
ses appareils. Sur demande, la suppression est immédiate. Hébergement dans
l'Union européenne ; responsable de traitement : Phil ; un registre des
traitements est tenu. _Cette note n'est pas un avis juridique : un relecteur
compétent doit valider le texte avant mise en service._

### Texte du consentement

Affiché à la création du compte, avec une case à cocher, jamais pré-cochée.

**Français** :

> Je crée un compte Pattern Reader pour retrouver mes projets sur mes appareils. Pattern Reader
> conserve mon adresse électronique et mes projets **chiffrés sur mon
> appareil** : Pattern Reader ne peut pas les lire. Si j'oublie mon mot de passe et que je
> n'ai pas ma clé de récupération, personne ne pourra les récupérer depuis le
> service. Je peux supprimer mon compte à tout moment, et mes projets
> restent sur mes appareils.

**English** :

> I'm creating a Pattern Reader account so my projects follow me across devices. Pattern Reader
> stores my email address and my projects **encrypted on my device**: Pattern Reader
> cannot read them. If I forget my password and have no recovery key, nobody
> can recover them from the service. I can delete my account at any time, and
> my projects stay on my devices.

Ni bandeau ni consentement n'est nécessaire pour le jeton de session (strictement
nécessaire au service demandé), mais la case ci-dessus l'est pour le compte.

## 5. Chiffrement de bout en bout

**Principe.** La clé de chiffrement est dérivée du mot de passe **dans le
navigateur** (Argon2id ou PBKDF2 avec sel propre à la lectrice, via l'API
`crypto.subtle`, sans dépendance). Le serveur reçoit un secret d'authentification
**distinct**, dérivé séparément : connaître l'un ne donne pas l'autre. Chaque
projet est chiffré (AES-GCM) avant l'envoi.

| Le service voit                              | Le service ne voit pas                      |
| -------------------------------------------- | ------------------------------------------- |
| l'adresse électronique                       | le titre d'un patron                        |
| le nombre de blocs, leur taille, leurs dates | le texte, les notes, les rangs              |
| l'adresse IP (7 jours)                       | la progression, les images, le mot de passe |
| le statut d'abonnement                       | ce que contient un bloc                     |

Fuite résiduelle assumée : la taille des blocs et leur nombre. Un remplissage
à taille fixe est possible mais inutile pour cet usage.

### Mot de passe perdu

Sans le mot de passe, la clé est perdue : **le service ne peut rien restituer**,
c'est le prix du chiffrement de bout en bout. Trois protections :

1. À la création, une **clé de récupération** (une phrase de mots courants) est
   affichée et proposée à l'impression : c'est une seconde façon de retrouver la
   clé. C'est le geste le plus difficile pour ce public, donc il est
   obligatoire et testé sur tablette avant livraison.
2. **Les projets restent aussi en local** sur chaque appareil : la lectrice qui
   perd son mot de passe garde ses projets là où ils sont déjà, crée un nouveau
   compte et les renvoie. Elle ne perd que l'historique côté serveur.
3. Le courriel sert à réinitialiser l'accès au compte et à l'abonnement, jamais
   à lire les données : le texte de la page de réinitialisation le dit.

## 6. Ce qui reste gratuit, pour toujours

- Lire un patron, en très grand, avec compteurs, chronomètre et abréviations.
- Le glossaire, les pages d'abréviation, les guides.
- Les convertisseurs et les tailles de crochet.
- Les projets en local, autant qu'on veut, l'import PDF, l'impression.
- La sauvegarde et la restauration par fichier (fiche 16) et l'envoi d'une
  copie par lien (fiche 19).

Seule la **synchronisation automatique entre appareils** est payante. Aucune
fonction existante ne passe derrière un compte : c'est écrit ici pour qu'une
fiche future ne puisse pas l'oublier.

## 7. Paiement

Un prestataire qui **porte la TVA et l'encaissement** (marchand officiel) évite
à Phil de déclarer la TVA dans chaque pays de l'Union. Candidats, tarifs à
confirmer : Paddle (<https://www.paddle.com/pricing>) et Lemon Squeezy
(<https://www.lemonsqueezy.com/pricing>), environ 5 % + 0,50 $ par paiement ;
Stripe (<https://stripe.com/fr/pricing>), environ 1,5 % + 0,25 € pour une carte
européenne, mais la TVA reste à la charge de Phil.

- **Le compte naît du paiement** : « Synchroniser mes appareils » mène à la
  page du prestataire ; le compte (adresse, mot de passe, clé de récupération)
  se crée au retour, une fois le paiement confirmé par le webhook. Pas de
  compte sans abonnement, pas d'essai gratuit (décision de Phil).
- Aucune donnée de carte chez nous : la lectrice paie sur la page du
  prestataire (redirection, pas d'iframe : la CSP ne change pas pour cela).
- Le prestataire notifie le service (webhook signé) qui met à jour le statut
  d'abonnement. C'est le seul lien entre paiement et compte.
- Prix : la liste d'attente (fiche 22) annonce déjà **29 € par an** ; c'est
  l'hypothèse retenue ici, à confirmer par Phil. Net des frais d'un marchand
  officiel (≈ 5 % + 0,50 $), il reste ≈ 27 € par an et par abonnée : à
  1 000 lectrices actives, **trois abonnées couvrent le serveur** (≈ 5 € par
  mois). Le service est viable à très faible conversion, mais il ne rémunère
  pas le travail avant quelques centaines d'abonnées.
- Une lectrice dont l'abonnement s'arrête garde **toutes ses données en local**
  et peut les exporter : la synchronisation s'arrête, rien ne disparaît de ses
  appareils (délai de 30 jours côté serveur, voir §4).

## 8. Ce que l'option change aux règles de `CLAUDE.md`

Chaque règle touchée, avec la rédaction proposée. **`CLAUDE.md` n'est pas
modifié par cette fiche** : ce sera fait par la fiche de mise en œuvre, après la
décision.

### Règle n° 1 — Aucun back-end

Rédaction actuelle : « Aucun back-end. […] Seule exception, discutée et bornée :
la mesure d'audience. »

Proposition : « **Aucun back-end pour lire et suivre un patron.** Tout se passe
dans le navigateur. Deux exceptions, discutées et bornées : la mesure d'audience
(`docs/adr-001-mesure-audience.md`) et la synchronisation des projets
(`docs/adr-002-comptes-et-paiement.md`), qui n'envoie que des blocs chiffrés,
inerte tant que `SYNC_ORIGIN` est vide et jamais requise pour lire. »

### Contrainte des données de la lectrice

Ajout : « La synchronisation n'écrase jamais une copie locale sur la foi d'une
réponse non confirmée ; en cas de conflit, les deux versions sont gardées et la
lectrice choisit. Toute réponse du service est bornée en taille avant
traitement. »

### CSP

Ajout d'une origine (celle du service) à `connect-src` seulement, identique dans
`vercel.json` et `netlify.toml`. `tools/check-csp.mjs` doit exiger cette
origine quand `SYNC_ORIGIN` est renseignée, comme il le fait pour Umami.
Aucune origine de prestataire de paiement : redirection, pas d'iframe ni de
script tiers.

### Mesure d'audience (ADR 001)

L'ADR 001 pose : « aucun cookie, aucun identifiant persistant, donc aucun
bandeau de consentement ». Un jeton de session est un identifiant persistant.
Il reste compatible à trois conditions, à écrire dans l'ADR 001 :

1. il n'est **jamais** transmis à Umami, ni sous forme d'événement ni de
   propriété ;
2. il n'est créé qu'à l'action « créer un compte » ou « se connecter » ;
3. aucun événement de mesure ne porte l'adresse électronique, l'identifiant de
   compte ou le statut d'abonnement.

Nouveaux événements : `signup_started`, `signup_completed`,
`sync_enabled`, `sync_conflict`, déclarés à la fois dans `AnalyticsEvent` et
dans `EVENEMENTS` (`tools/umami.mjs`).

### Architecture

- Nouveau dossier `core/sync/` (client du service, chiffrement) ; toute API
  navigateur passe par `core/platform` ou `core/storage`.
- `localStorage` : la règle « le seul pointeur du projet actif » devient « le
  pointeur du projet actif et le jeton de session ».
- Pages de compte : `noIndex`, absentes du sitemap, reliées depuis l'en-tête.
  Leur contenu dépend de la session, donc **elles ne sont pas pré-rendues avec
  des données** : le pré-rendu produit la coquille, l'état apparaît après
  `afterNextRender`. La page de présentation de l'offre, elle, est pré-rendue
  et indexable.
- La langue vient toujours de l'URL, y compris pour les courriels : la langue
  est choisie à l'inscription depuis l'URL de la page.

### Règles inchangées

Règles n° 2 (hors pages de compte, voir plus haut), n° 3, n° 4 (le texte des
patrons reste rendu en segments, déchiffré en mémoire) et n° 5.

## 9. Retour en arrière si l'option ne rapporte rien

1. **Mettre `SYNC_ORIGIN` à vide** : le client redevient inerte comme l'est la
   mesure sans origine, aucun appel réseau ne part. Un test le fige.
2. **Aucune donnée n'est prisonnière** : les projets sont aussi en local sur
   chaque appareil, et l'export en fichier reste disponible (fiche 16).
3. **Avertir 90 jours avant l'arrêt** par courriel, avec la marche à suivre pour
   exporter.
4. Rembourser au prorata les abonnements en cours, résilier chez le prestataire
   de paiement, éteindre le serveur, supprimer la base et les sauvegardes
   (purge sous 30 jours).
5. Retirer l'origine de la CSP et les événements de mesure ; ranger les pages de
   compte. Le reste du produit n'a pas bougé : c'est la raison de la règle
   « rien n'est jamais derrière un compte ».

Coût de sortie estimé : quelques jours de travail et un mois de serveur.

## 10. Recommandation et découpage en fiches

**Recommandation : ne rien construire avant le jalon du §2. Le jour venu,
option C, au plus petit, avec synchronisation chiffrée de bout en bout du texte
et de la progression, sans les images.** Si Phil préfère ne pas exploiter de
serveur, l'option D se réduit à Firebase, à condition d'en surveiller la
facture ; les autres services testés dépassent le budget.

Fiches de mise en œuvre, **titres et étape d'entonnoir seulement**, à numéroter
et à écrire après la décision :

| Fiche                                                                          | Étape d'entonnoir |
| ------------------------------------------------------------------------------ | ----------------- |
| Mesurer la demande : question sur la synchronisation dans la liste d'attente   | revenu            |
| Chiffrer un projet dans le navigateur (`core/sync`, sans réseau) et l'exporter | rétention         |
| Service de dépôt de blocs chiffrés (serveur, sauvegardes, journaux à 7 jours)  | rétention         |
| Comptes : création, connexion, clé de récupération, réinitialisation           | rétention         |
| Synchroniser les projets et résoudre les conflits sans perte                   | rétention         |
| Abonnement : paiement chez le prestataire et statut du compte                  | revenu            |
| Mettre à jour `CLAUDE.md`, l'ADR 001 et la CSP                                 | revenu            |
| Page de présentation de l'offre et de ce qui reste gratuit                     | acquisition       |

## Décision (30 septembre 2026)

Phil a validé l'ensemble :

1. le jalon du §2 (1 000 visiteuses par mois, 20 % de retour, 50 inscriptions
   à la liste d'attente, sur 30 jours glissants) ;
2. l'option C, au plus petit ;
3. les images de patron restent locales ;
4. le prix de 29 € par an ;
5. le délai de 30 jours après la fin de l'abonnement (§4).

Reste à faire **avant toute mise en œuvre**, le jour où le jalon est atteint :
vérifier les tarifs sur les pages citées (voir « Avertissement sur les
chiffres ») et faire relire le texte de consentement et le traitement des
données par une personne compétente.
