# Audit UX et acquisition — 27 septembre 2026

Audit du site en production et du dépôt (`main`, 41bd336), croisé avec les
rapports Umami (branche `rapports`) et le business plan. Les fiches qui en
découlent sont `prompts/24-*.md` à `prompts/33-*.md` ; l'ordre est dans
`prompts/README.md`. Effort : S < ½ j, M ≈ 1–2 j, L > 3 j de Claude Code.

## Verdict

Le produit est techniquement au-dessus de ce qu'on voit d'habitude sur un
projet solo (pré-rendu, i18n par URL, axe en CI, PWA, mesure), mais il rate son
moment d'usage et personne ne le trouve. Sur tablette, l'écran qu'on regarde
crochet en main est enfoui sous 470 px d'en-tête et de bandeau, l'étape fait
36 px, et rien ne permet d'agrandir le texte. Côté audience, 28 visites en huit
jours, presque toutes de Phil : les 118 URL du sitemap n'ont pas encore de quoi
se classer (60 mots propres par page d'abréviation), et rien n'existe hors du
site.

L'ordre qui en découle : d'abord le mode lecture et la première visite (ce qui
fait rester), en même temps que les pages-outils et le contenu (ce qui fait
venir), puis une heure par semaine de distribution hors code. Les lots
précédents ont mis 80 % de l'effort dans l'infrastructure ; les suivants
doivent le mettre dans le contenu et la diffusion.

## Où on en est

L'entonnoir n'a pas encore d'entrée : le seuil d'analyse du pilote (100 visites
sur huit jours) est loin, et les deux derniers rapports comptent zéro événement.

| Mesure                                              | Valeur                                                                                                                     | Source                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Visites sur huit jours (19–26/09)                   | 28                                                                                                                         | rapport Umami du 26/09, branche `rapports` |
| Journées avec des événements                        | 1 sur 5 (24/09 : 9 visiteuses, 58 événements, le test de Phil)                                                             | rapports du 22 au 26/09                    |
| URL au sitemap                                      | 118 (102 pages d'abréviation, 2 index de glossaire, 6 guides, 8 autres, EN + FR ; 121 routes pré-rendues dont 3 `noindex`) | `sitemap.xml` en production                |
| `lastmod` du sitemap                                | la date du build, identique sur les 118 URL                                                                                | `tools/generate-sitemap.mjs`               |
| Mots par page (HTML pré-rendu, navigation comprise) | accueil 283 · page d'abréviation 206 (≈ 60 propres à la page) · guide 812                                                  | build local de `main`                      |
| Taille de l'étape affichée                          | 28 px sur téléphone, 36 px sur tablette 820 px, 48 px sur grand écran                                                      | `--reader-step: clamp(28px, 4.4vw, 48px)`  |
| Position de l'étape sur tablette                    | à 650 px du haut, sous l'en-tête, le bandeau et le panneau d'import                                                        | capture 820 × 1180                         |
| Réglage de taille de texte, mode sombre             | absents de l'interface (`data-dim` n'existe que sur `/design-system`)                                                      | `grep` du dépôt                            |
| Liens dans le pied de page                          | 1                                                                                                                          | `site-footer.ts`                           |
| Bundle initial                                      | 322 kB pour un budget en erreur à 328 kB                                                                                   | `docs/audit-2026-09.md`                    |

## Audit UX

Huit constats, classés par ce qu'ils coûtent à une lectrice de 60 ans sur
tablette. Les trois premiers décident à eux seuls si elle revient.

| #    | Constat (vérifié sur le build de `main`)                                                                                                                                                                                                                                                                                                                     | Ce que ça coûte                                                                                                                            | Effort | Fiche  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ |
| UX-1 | **Pas de mode lecture.** Patron chargé, l'en-tête, le bandeau d'accueil et le panneau replié restent au-dessus de l'étape (470 px sur tablette). L'étape fait 36 px, le compteur de répétitions, la commande la plus utilisée crochet en main, est sous la ligne de flottaison, séparé de l'étape par un filet. Aucun réglage de taille, pas de mode sombre. | La promesse (« une étape à la fois, en très grand ») n'est pas tenue sur l'appareil cible ; le soir, le fond clair éblouit.                | M      | 24     |
| UX-2 | **Première visite muette.** L'accueil montre un lecteur vide : bouton Suivante grisé, trois compteurs à zéro, avant toute valeur. « Exemple » est le troisième bouton, secondaire. Rien ne dit « gratuit, sans compte, rien ne quitte votre appareil », aucune image du produit en marche, pas de « comment ça marche » ni de FAQ.                           | Une visiteuse qui arrive de Pinterest ne comprend pas ce que fait l'outil et repart sans coller de patron : `pattern_parsed` reste à zéro. | M      | 26     |
| UX-3 | **Aucune vue d'ensemble du patron.** Pas de liste des étapes, pas de saut à un rang (`goTo` existe dans le magasin, sans interface), pas de barre de progression près de l'étape ; la case « Étape terminée » fait doublon avec Suivante.                                                                                                                    | Retrouver le rang 34 après une pause = 33 clics ; on ne sait jamais où on en est dans la pièce.                                            | M      | 25     |
| UX-4 | **Partage et impression cachés.** « Copier le lien » et « Envoyer ce projet » ne sont visibles qu'en rouvrant le panneau d'import ; la vue d'impression existe mais aucun bouton ne l'appelle.                                                                                                                                                               | La seule boucle qui amène une deuxième lectrice (`project_shared`) est introuvable.                                                        | S      | 25     |
| UX-5 | **Libellés.** « Formatting » / « Bien formater » en navigation ne dit pas de quoi ; l'œil (garder l'écran allumé) et Discord sont des icônes seules ; en français le lecteur dit « Le pattern », « Texte du pattern », « aucun pattern chargé » alors que le bandeau dit « patron ».                                                                         | Public de 50–70 ans : une icône sans mot n'est pas cliquée ; l'anglicisme décrédibilise la version FR.                                     | S      | 32     |
| UX-6 | **Pied de page vide** : un seul lien (créatrices). Ni glossaire, ni guides, ni convertisseur, ni Discord, ni langue, ni « à propos / données ».                                                                                                                                                                                                              | Maillage interne faible pour Google, et aucune preuve de sérieux pour la visiteuse.                                                        | S      | 32     |
| UX-7 | **Glossaire sur téléphone** : tableau à trois colonnes de 51 lignes, sans ordre alphabétique ni regroupement crochet / tricot / US / UK.                                                                                                                                                                                                                     | Page d'entrée SEO qu'on quitte sans trouver son terme.                                                                                     | S      | 33     |
| UX-8 | **Détails visuels** : sur tablette l'illustration de pelote passe sous le bouton Suivante ; le `<h2>` du dialogue « Ouvrir ce patron partagé ? » est dans le HTML pré-rendu de l'accueil.                                                                                                                                                                    | Cosmétique ; le second est un bruit de plan pour Google.                                                                                   | S      | 24, 26 |

Ce qui est bon et à garder tel quel : le découpage en pièces (Tree / Trunk /
Star), les abréviations soulignées avec infobulle, le collage n'importe où sur
la page, la confirmation avant tout remplacement, la ligne liste d'attente
discrète à la troisième étape, et le design Hanami, cohérent d'une page à
l'autre.

## Audit acquisition

Personne n'arrive parce que rien, sur le site ni hors du site, ne répond encore
à une requête ou à une recommandation. Le socle technique (pré-rendu,
`hreflang`, canoniques, JSON-LD, robots, sitemap) est correct ; le contenu et
la diffusion manquent.

### Sur le site

| #   | Constat                                                                                                                                                                                                                                                           | Pourquoi ça bloque                                                                                                                                                                                                          | Fiche      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| A-1 | Les 102 pages d'abréviation sont un gabarit : définition d'une ligne, un rang d'essai, une note US/UK, des liens. ≈ 60 mots propres à chaque page.                                                                                                                | « what does sc mean in crochet » est occupé par des tutoriels de 1 500 mots avec photos et vidéo (Sarah Maker, Craft Yarn Council, Bella Coco). Un gabarit de 60 mots n'y entrera jamais, quel que soit le nombre de pages. | 30         |
| A-2 | Les pages-outils prévues au business plan n'existent pas : compteur de rangs en ligne, calculateur d'échantillon, page dédiée aux tailles de crochet (aujourd'hui une section du convertisseur).                                                                  | Ce sont les requêtes où un petit site peut gagner : intention précise, concurrence faible, et chaque page renvoie vers le lecteur. « crochet hook sizes chart » est l'une des requêtes les plus fréquentes du crochet.      | 27, 28, 29 |
| A-3 | Le marché francophone est vide et c'est l'avantage de Phil : « compteur de rangs crochet », « abréviations crochet anglais français », « traduire un patron de crochet anglais ». L'outil sait déjà écrire un patron anglais en clair mais aucune page ne le dit. | Une page « Lire un patron anglais en français » transforme une fonction existante en porte d'entrée sans concurrent.                                                                                                        | 31         |
| A-4 | L'accueil ne dit pas ce qui distingue l'outil de Ribblr, cromu, Yarnzy ou knitCompanion : il marche avec n'importe quel patron (PDF Etsy, blog, magazine), sans compte, sans rien envoyer.                                                                        | C'est l'argument qui décide une lectrice qui compare, et celui qu'on peut poster sur Reddit sans passer pour une pub.                                                                                                       | 26         |
| A-5 | `lastmod` = date du build sur les 118 URL.                                                                                                                                                                                                                        | Google le documente : un `lastmod` toujours égal à aujourd'hui est ignoré, et le signal de fraîcheur des vraies mises à jour est perdu.                                                                                     | 32         |
| A-6 | Guides à ≈ 800 mots, sans image ni schéma.                                                                                                                                                                                                                        | Corrects, mais les pages qui se classent sur « how to read a crochet pattern » font 2 000 mots avec des exemples annotés. À enrichir après les pages-outils, pas avant.                                                     | plus tard  |

### Hors du site

| Canal (classement du business plan) | État au 27/09                          | Ce qui manque                                                                                                                                   |
| ----------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Créatrices de patrons               | page et badge livrés (fiche 23)        | aucune créatrice contactée ; le lien de patron refuse au-delà de 8 000 caractères, ce qui exclut la plupart des patrons vendus (voir Décisions) |
| SEO outil                           | convertisseur et abréviations en ligne | compteur, échantillon, tailles de crochet, contenu réel sur les abréviations                                                                    |
| Pinterest                           | visuel épinglable produit (fiche 23)   | aucun compte, aucune épingle ; c'est le canal n° 1 du public de 58 ans                                                                          |
| Groupes Facebook, Reddit, Ravelry   | rien                                   | zéro message ; zéro lien entrant vers patternreader.com                                                                                         |
| Discord                             | lien en en-tête                        | inutile tant qu'il n'y a pas d'utilisatrices ; ne pas y investir                                                                                |
| Vidéo                               | écartée par Phil le 27/09              | rien : des captures d'écran du mode lecture (fiche 24) servent l'accueil, Pinterest et les messages                                             |

Repère à garder en tête : un site neuf met trois à six mois à se classer même
avec du bon contenu. Les canaux hors site (Reddit, Ravelry, créatrices) sont
les seuls qui amènent des lectrices dès la semaine prochaine, et donc les seuls
qui alimentent les rapports du pilote.

## Ordre proposé

Les numéros sont ceux des fiches 24 à 33, à la suite des fiches 17–23. La
fiche 24 passe avant la 26 parce qu'une visiteuse qui arrive par une future
page-outil doit trouver un lecteur qui tient sa promesse ; la 27 est la
première page-outil parce que c'est la plus simple et la mieux placée
(compteur → lecteur). L'ordre exécutable est la table de `prompts/README.md`.

## Deux décisions pour Phil

1. **Liens courts, donc un micro-service.** Le lien de patron porte tout le
   texte dans l'URL et refuse au-delà de 8 000 caractères. Un patron
   d'amigurumi vendu sur Etsy fait couramment 6 000 à 15 000 caractères, un
   vêtement 20 000 et plus : le canal « créatrices », classé premier au
   business plan, est donc fermé pour la majorité des patrons réels. La seule
   issue est un stockage côté serveur (clé courte → texte), ce qui contredit la
   règle n° 1 du dépôt. Options : (a) rester sans serveur et assumer que les
   créatrices ne relient que des patrons courts ; (b) un worker gratuit
   (Cloudflare Workers + KV, ou une route Vercel + Vercel KV) qui ne stocke que
   des textes bornés, sans compte ; (c) attendre le lot 8. La (b) reste à 0 €
   aux volumes des deux prochaines années, mais c'est un changement
   d'architecture à documenter (ADR-002) et à sécuriser (taille, quota par IP,
   expiration). Aucune fiche ne la présuppose ; la fiche 25 place les boutons
   de partage, pas le service.
2. **La vidéo de démonstration : écartée.** Décision de Phil du 27/09 : pas de
   vidéo, sur le site ni ailleurs. L'accueil montre une image statique du
   produit en marche (fiche 26) ; Reddit, Pinterest et les messages utilisent
   des captures d'écran du mode lecture (fiche 24).

## Hors code : une heure par semaine

Aucune ligne de code n'amène une lectrice la semaine prochaine ; ces gestes,
si. Le plan, les textes de départ et le journal des messages sont dans
`docs/diffusion.md`.

## Ce que Phil fait lui-même, dans l'ordre

1. Laisser le pilote lancer la fiche 24 (ou Actions → Lot suivant → Run
   workflow), relire la PR, merger.
2. Search Console : vérifier la couverture (Pages → indexées / non indexées)
   et l'affichage des `hreflang` ; noter le nombre de pages indexées dans
   `docs/diffusion.md`. Claude n'y a pas accès.
3. Semaine 1 de diffusion : le message Reddit, avec une capture prise après la
   fiche 24.
4. Trancher la décision 1 (liens courts) ; elle n'empêche pas la fiche 25.
5. Prendre deux captures d'écran du mode lecture sur tablette après la
   fiche 24 : elles servent Reddit, Pinterest et l'accueil (pas de vidéo,
   décision 2).
6. Laisser les fiches s'enchaîner dans l'ordre du README (26, 32, 27, 25, 29,
   28, 31, 30, 33), une PR chacune.
7. Tenir `docs/diffusion.md` à jour : une ligne par message posté.

Rétro de cette session : l'audit du site en production a dû passer par un
build local (le conteneur n'atteint pas patternreader.com) ; c'est plus fiable
qu'une capture distante puisqu'on lit `main`, et ça coûte trois minutes.
