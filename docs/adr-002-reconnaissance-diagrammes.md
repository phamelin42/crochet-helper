# ADR 002 — Reconnaissance automatique des diagrammes

**Statut : décidé le 2026-10-02 — lecture dans le navigateur, en brouillon
relu.** Aucun code serveur, aucune clé, aucune dépendance n'a été ajouté.

## Décision

Phil choisit d'intégrer la lecture du prototype **sans attendre la mesure sur
le réel** (option A sans son préalable), à une condition qui en limite le
risque : la lecture ne fait que **pré-remplir** le composeur de la fiche 36, la
lectrice relit chaque tour avant que le patron soit découpé, et rien n'est
enregistré sans elle.

- « Ouvrir un diagramme » (panneau d'import) marche sans patron chargé : image
  ou pages de PDF → lecture → relecture → nouveau projet découpé en étapes, le
  diagramme épinglé à la première pièce. Le projet actif n'est jamais touché.
- Code : `features/reader/data/chart-recognition.ts` (fonctions pures, port du
  prototype, plus le repérage des répétitions `*…* x N`) et
  `core/platform/image-pixels.ts` (décodage), chargés par `import()` : le
  bundle initial ne bouge pas.
- Bornes : image lue réduite à 1 600 px, au-delà de 600 composantes l'image
  est jugée trop bruitée et la relecture s'ouvre vide, sans exception.
- Mesure : `chart_recognized` (tours et symboles lus, à la dizaine) et
  `chart_transcribed` avec `origine: 'lecture'`. Le rapport entre les deux dit
  si la lecture sert ou si les lectrices la refont à la main.
- Tests : `e2e/chart-open.spec.ts` lit les huit diagrammes nets du jeu
  d'essai dans Chromium (bon nombre de tours, bon compte), sans requête vers
  un autre site.

Ce qui reste vrai : la qualité sur une **photo** est inconnue et sans doute
faible (symboles collés). Déposer des diagrammes réels dans
`tools/fixtures/charts/real/` et relancer `npm run etude:charts` reste la
façon de le savoir ; l'option B ne se rouvre que si les chiffres d'usage
montrent que les lectrices refont la lecture à la main.

## Constat

L'étude (`docs/etude-diagrammes-2026-10.md`) donne un no-go, faute de mesure
sur des diagrammes réels : 90,3 % des symboles sur le synthétique, 0,6 s, 3,4 Ko
compressés, mais un échec net sur les symboles collés et les symboles en
plusieurs morceaux, qui sont le cas ordinaire d'un patron photographié.

La reconnaissance dans le navigateur reste possible : la règle n° 1 est tenue
(aucun réseau, vérifié), le poids est négligeable. Il manque la preuve sur le
réel.

## Options

**A — Mesurer le réel d'abord, sans rien changer à l'architecture.** Phil dépose
cinq à dix diagrammes (patrons libres de droits ou photos de ses ouvrages) avec
leur transcription dans `tools/fixtures/charts/real/`, puis
`npm run etude:charts`. Si le réel passe 70 %, la fiche 38 s'écrit
(reconnaissance qui pré-remplit le composeur de la fiche 36, la lectrice
corrige). Sinon, on passe à B ou on s'arrête là : la transcription assistée de
la fiche 36 reste l'usage.

**B — Un service externe : un modèle de vision appelé depuis un petit serveur.**
L'image du diagramme part vers un serveur qui interroge le modèle et renvoie
les tours. Ce que ça change :

- **Règle n° 1.** Elle pose « aucun back-end, aucun appel réseau, aucune clé
  d'API ». B est un changement d'architecture, pas une fonctionnalité : un
  serveur à héberger, surveiller et sécuriser, avec une clé côté serveur
  jamais dans le navigateur.
- **ADR-001.** Il borne le réseau à des compteurs sans contenu. B envoie l'**image
  d'un patron** : c'est un contenu de la lectrice, souvent un patron acheté, dont
  la diffusion peut être restreinte. Il faudrait un consentement à chaque envoi,
  une durée de conservation nulle, et une mention dans la page de confidentialité.
  La CSP (`connect-src`) et `tools/check-csp.mjs` s'ouvriraient à une deuxième origine.
- **Ce qui quitte l'appareil** : l'image, sa taille, l'adresse IP de la lectrice
  vue du serveur, et chez le fournisseur du modèle, selon ses conditions.
- **Coût par diagramme** : à établir avec un devis réel, non mesuré ici. Il se
  compose du prix de l'appel au modèle (proportionnel à la taille de l'image) et
  d'un hébergement fixe. Sans plafond par lectrice, une lectrice peut le faire
  exploser : il faut une limite par jour, donc une identité, donc le sujet de
  la fiche 20 (comptes) — les deux décisions se tiennent.
- **Qualité** : non mesurée non plus. Un modèle de vision lit mieux une photo
  qu'un gabarit, mais se trompe sans le dire ; le composeur qui laisse la
  lectrice corriger reste nécessaire.
- **Hors ligne** : perdu. Fil marche aujourd'hui sans réseau (service worker).

**C — Ne rien faire de plus.** Fiches 35 et 36 : afficher le diagramme en grand
et transcrire à la main avec le composeur. C'est déjà l'usage promis.

## Recommandation

**A**, parce qu'elle ne coûte que quelques images et tranche avec des chiffres
avant de toucher à l'architecture. B n'a de sens que si A échoue et que la
demande est démontrée par l'usage du composeur de la fiche 36.

## Questions pour Phil

- Déposer cinq à dix diagrammes réels avec transcription pour lancer l'option A :
  oui / non / de quel type de patrons ?
- Si A échoue : étudier B, ou s'en tenir à C ?
- B suppose d'envoyer des images de patrons à un tiers : acceptable, avec
  consentement à chaque envoi ? Budget mensuel maximal ?
- B et la fiche 20 (comptes) : les traiter ensemble, ou B sans comptes, avec un
  plafond global ?
