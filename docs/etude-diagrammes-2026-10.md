# Étude — reconnaître les symboles d'un diagramme dans le navigateur

**Décision : NO-GO.** Le prototype lit 90,3 % des symboles synthétiques en
0,6 s au plus, pour 3,4 Ko compressés, sans réseau ; mais aucun diagramme réel
n'a été déposé, le seuil « ≥ 70 % sur le réel » n'est donc pas atteint faute de
mesure, et les deux cas que le synthétique rate (symboles collés, symboles en
plusieurs morceaux) sont ceux d'un patron photographié. Suite :
`docs/adr-002-reconnaissance-diagrammes.md`.

## Ce qui a été mesuré

Commande : `npm run etude:charts` (Chromium par Playwright, réseau coupé).
Commit du prototype et des chiffres : `eb3a821`. Machine : runner de la CI de
l'étude (Linux, Chromium 153) ; un portable de lectrice sera plus lent, mais la
marge est de un à dix.

| Diagramme  | Type        | Disposition | Symboles justes   | Tours au bon compte | Temps (s) |
| ---------- | ----------- | ----------- | ----------------- | ------------------- | --------- |
| ring-1     | synthétique | radial      | 6 / 6 (100 %)     | 1 / 1               | 0,10      |
| ring-2     | synthétique | radial      | 12 / 12 (100 %)   | 2 / 2               | 0,10      |
| ring-3     | synthétique | radial      | 24 / 24 (100 %)   | 3 / 3               | 0,16      |
| ring-5     | synthétique | radial      | 54 / 54 (100 %)   | 5 / 5               | 0,33      |
| ring-8     | synthétique | radial      | 106 / 106 (100 %) | 8 / 8               | 0,62      |
| flat-1     | synthétique | à plat      | 10 / 10 (100 %)   | 1 / 1               | 0,07      |
| flat-3     | synthétique | à plat      | 24 / 24 (100 %)   | 3 / 3               | 0,15      |
| flat-5     | synthétique | à plat      | 45 / 45 (100 %)   | 5 / 5               | 0,28      |
| ring-mixed | synthétique | radial      | 21 / 28 (75 %)    | 1 / 3               | 0,20      |
| ring-tight | synthétique | radial      | 4 / 30 (13,3 %)   | 0 / 1               | 0,11      |

- **Synthétique** : 90,3 % des symboles (306 sur 339) ; seuil 90 % — atteint de justesse.
- **Réel** : **non mesuré**, aucun diagramme déposé dans
  `tools/fixtures/charts/real/` (seuil 70 %).
- **Temps** : 0,62 s au plus, gabarits compris (seuil 5 s).
- **Poids** : 7,9 Ko minifié, 3,4 Ko compressé, pour le code de reconnaissance ;
  les gabarits sont les SVG de `public/symbols/`, que l'application charge déjà
  (seuil 300 Ko : très large).
- **Réseau** : 0 requête tentée (le test `recognize.test.mjs` l'exige).

## Ce que les chiffres cachent

Le synthétique est **le meilleur cas possible** : les symboles sont ceux des
gabarits, tracés au pixel près, sur fond blanc, sans perspective. Il mesure la
mécanique (regroupement en tours, ordre, orientation), pas la lecture d'une
photo.

Sur les huit diagrammes propres, 100 % : un gabarit par symbole, comparé après
rotation, suffit. Ce qui échoue :

1. **Symboles collés** (`ring-tight`, écart de deux pixels entre voisins) : les
   composantes fusionnent, un bloc de trois symboles est lu comme un seul. 13 %.
   Un diagramme réel a des symboles qui se touchent d'ordinaire ; c'est le
   défaut principal.
2. **Symboles en plusieurs morceaux** (`ring-mixed`, 75 %) : `flo` et `blo`
   (un crochet et un trait séparés) sont coupés en fragments lus comme des
   mailles coulées ; les tours voisins se rejoignent alors dans le regroupement.
   La fusion des morceaux proches règle une partie du cas et en crée un autre
   (deux symboles voisins fusionnés) : le seuil est réglé à la main sur ce jeu.
3. **Ce que le prototype ne fait pas** : les répétitions (`*…* x 6`) sont
   écrites maille par maille, les symboles de taille très différente dans un
   même tour ne sont pas gérés, aucune perspective ni rotation d'ensemble, pas
   de texte (numéros de tours, légendes), pas de grille de fond à ôter, pas de
   tricot.

Le regroupement se règle sur la médiane de taille des symboles et sur un pas
régulier ; un diagramme dessiné à la main ou une photo penchée le mettront à
l'épreuve avant la classification.

## Méthode, pour la refaire

1. `node tools/charts/generate.mjs` régénère les dix diagrammes et leurs
   transcriptions attendues (`tools/fixtures/charts/`). Déterministe : graine
   fixe par diagramme.
2. `npm run etude:charts` mesure ; les images annotées (boîte, classe, score)
   sont écrites dans `tools/charts/out/`, ignoré par git.
3. Un « symbole juste » a la bonne classe **à la bonne place** (tour, rang dans
   le tour) ; un tour est « au bon compte » si `stitchCount` de la sortie égale
   celui de l'attendu, comme la fiche 36 l'affiche entre parenthèses.
4. Un diagramme réel se mesure en le déposant avec sa transcription :
   voir `tools/fixtures/charts/real/README.md`.

Convention de lecture supposée : tours du centre vers l'extérieur, de midi dans
le sens horaire ; rangs du bas vers le haut, de gauche à droite. Un diagramme
qui alterne le sens des rangs n'est pas géré.

## Décision

Règle de la fiche : go si ≥ 90 % en synthétique **et** ≥ 70 % en réel, moins de
5 s, chunk ≤ 300 Ko.

| Critère             | Seuil    | Mesure     | Verdict         |
| ------------------- | -------- | ---------- | --------------- |
| Synthétique         | ≥ 90 %   | 90,3 %     | atteint         |
| Réel                | ≥ 70 %   | non mesuré | **non atteint** |
| Temps par diagramme | < 5 s    | 0,62 s     | atteint         |
| Chunk paresseux     | ≤ 300 Ko | 3,4 Ko     | atteint         |

Trois critères sur quatre sont tenus, mais le quatrième est celui qui compte, et
le seul motif de ne pas le mesurer est l'absence d'images. **No-go**, donc :
pas de fiche 38. Ce n'est pas un échec de la technique : le poids et la vitesse
laissent beaucoup de marge. C'est l'absence de la preuve sur le cas réel. Deux
sorties, à choisir par Phil (ADR-002) : déposer des diagrammes réels et relancer
la commande (la fiche 38 s'écrit alors si le réel passe 70 %), ou étudier
l'option d'un service externe.
