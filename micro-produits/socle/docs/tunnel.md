# Tunnel de conversion — @@NOM@@

Seuils de départ, communs aux dix produits, à recalibrer par Phil après le
premier mois de trafic réel. Source unique dans le code :
`tools/tunnel.mjs` ; ce tableau doit dire la même chose
(`tools/tunnel.test.mjs` le vérifie).

## Étapes

| Étape       | Ce qu'on regarde                                   | Où                                               |
| ----------- | -------------------------------------------------- | ------------------------------------------------ |
| Acquisition | impressions, clics et position sur « @@REQUETE@@ » | Search Console                                   |
| Arrivée     | visiteurs                                          | Umami (pages vues)                               |
| Activation  | la fonction principale est utilisée et aboutit     | `outil_commence`, `outil_termine`, `export_fait` |
| Rétention   | on revient, on installe                            | `retour_*`, `app_installee`, `donnees_reprises`  |
| Revenu      | intérêt pour l'offre complète, puis paiement       | `offre_vue`, `offre_cliquee`                     |

## Crans mesurés et seuils

Un cran n'est jugé qu'à partir de **200 visiteurs** sur le mois ; en dessous,
le rapport écrit « insuffisant » et ne conclut rien.

| Cran            | Taux                                                        | Sain   | Alerte  |
| --------------- | ----------------------------------------------------------- | ------ | ------- |
| `activation`    | `outil_commence` / visiteurs                                | ≥ 40 % | < 20 %  |
| `resultat`      | `outil_termine` / `outil_commence`                          | ≥ 50 % | < 25 %  |
| `export`        | `export_fait` / `outil_termine`                             | ≥ 60 % | < 30 %  |
| `retour`        | (`retour_2_7j` + `retour_8_30j` + `retour_31j`) / visiteurs | ≥ 15 % | < 5 %   |
| `installation`  | `app_installee` / visiteurs                                 | ≥ 2 %  | < 0,5 % |
| `interet_offre` | `offre_cliquee` / `offre_vue`                               | ≥ 3 %  | < 1 %   |

Entre les deux seuils : « à surveiller ». Une **fuite** est un cran en alerte,
ou à surveiller deux mois de suite.

## Lecture

- Les taux comptent des occurrences d'événements, pas des personnes : ce sont
  des ordres de grandeur. Un visiteur qui commence deux fois compte deux fois.
- Les chiffres Umami sont un plancher (bloqueurs de traceurs).
- Acquisition : pas de seuil au premier mois (le référencement met 2 à 4 mois
  à se stabiliser). À partir du troisième mois, la requête visée hors des
  20 premières positions est une alerte.
- Revenu : le paiement n'existe pas au lancement. `interet_offre` au-dessus du
  seuil sain trois mois de suite, avec au moins 1 000 visiteurs par mois, est le
  signal pour proposer l'ADR de monétisation (`README` des micro-produits).
