---
name: amelioration-hebdo
description: Analyse les données d'usage sur 7 et 28 jours, en tire au maximum trois actions d'amélioration, et ouvre les PR correspondantes. Déclenché chaque lundi.
---

# Amélioration hebdomadaire

Une fois par semaine, tu prends du recul sur les données, tu en tires des
conclusions, et tu mets en œuvre ce qui est sûr. C'est la seule exécution
autorisée à proposer des changements de sa propre initiative.

## 1. Rassembler

- `.pilote/umami.json`, produit par `tools/umami.mjs` : `periode` (7 derniers
  jours), `reference` (les 7 jours d'avant, sans chevauchement) et `mois`
  (28 jours). Tu n'as ni réseau ni secret : n'appelle aucune API. `ok: false`
  → écris-le en une ligne dans l'issue, n'ouvre aucune PR, termine.
- Les rapports quotidiens, recopiés dans `.pilote/reports/`, et les quatre
  derniers points hebdomadaires dans `.pilote/points.json`.
- Les limites listées dans `limites` : pas de taux de retour (Umami ne suit
  pas une visiteuse d'un jour à l'autre), entonnoir en occurrences. Ne conclus
  rien sur la fidélité.
- Le poids du bundle actuel (`npx ng build --stats-json`), comparé à celui
  noté dans le point d'il y a quatre semaines, et au budget d'`angular.json`.
- Le jalon en cours dans le business plan, via `prompts/README.md` et
  `automation/avancement.md`.

S'il y a moins de 14 jours de données : écris-le en une ligne, n'ouvre rien,
termine. Conclure sur deux semaines de bruit est pire que ne rien conclure.

## 2. Conclure

Au maximum **trois** actions. Pas cinq, pas dix. Trois propositions étayées
valent mieux qu'une liste que personne ne traitera.

Classe-les par effet attendu **sur le jalon en cours**, pas par facilité
d'implémentation. Si le jalon est « 500 visiteuses par mois », une amélioration
de design qui ne fait venir personne passe après une page-outil qui se réfère.

Pour chacune, écris quatre choses et rien d'autre :

- **Observé** — le chiffre, avec sa période. Pas une impression.
- **Déduit** — le lien de cause à effet que tu proposes, et son niveau de
  certitude. « Je ne sais pas pourquoi » est une réponse acceptable et utile.
- **Proposé** — le changement, concrètement.
- **Mesuré par** — quel chiffre dira dans deux semaines si ça a marché, et à
  partir de quel seuil.

Une observation sans hypothèse vérifiable ne devient pas une action. Dis-le et
passe à autre chose.

## 3. Écrire des fiches, jamais du code

Tu **n'implémentes rien**. Chaque action retenue devient une fiche dans
`prompts/`, au format des fiches existantes (`prompts/README.md`, une fiche
récente comme modèle), avec sa ligne « Étape d'entonnoir servie ». Phil fusionne
celles qu'il retient ; « Lot suivant » les exécute ensuite, relu comme le reste.

- **Une seule branche** `hebdo-<slug>` partant de `main`, **au plus trois
  fichiers**, tous dans `prompts/` : les fiches, et la table d'ordre de
  `prompts/README.md` si tu y places une fiche. Le workflow refuse une branche
  qui touche autre chose. Numérote après la plus haute fiche existante.
- Titre de PR dans `.pilote/<branche>.titre`, description dans
  `.pilote/<branche>.md` : pour chaque fiche, les quatre points de § 2.
- **Plancher statistique** : sous 100 visites (sessions) sur les 7 jours de
  `periode`, aucune conclusion sur le comportement n'est possible. Ne propose
  alors que des fiches **d'acquisition** qui prolongent le plan (pages
  indexables, canal créatrices, partage), jamais une fiche qui corrige un
  comportement observé.
- Pas de fiche qui double une fiche « À faire » de `automation/avancement.md`.

## 4. Rendre compte

Écris le titre `Point hebdomadaire — semaine du JJ/MM` dans
`.pilote/issue-titre.txt` et le corps dans `.pilote/issue-corps.md` (le
workflow y ajoute la liste des PR ouvertes) :

1. Ce qui a changé cette semaine, en trois lignes.
2. Les trois actions, au format ci-dessus.
3. Les fiches proposées, avec leur étape d'entonnoir.
4. **Les vérifications faites il y a deux semaines** : les seuils annoncés
   alors ont-ils été atteints ? Dire qu'une action n'a rien donné est plus utile
   que d'en proposer une nouvelle.
5. Le poids du bundle, pour la comparaison dans quatre semaines.

Le point 4 est ce qui empêche le dispositif de tourner à vide. Ne le saute pas,
même quand la réponse est décevante.

## Ne fais pas

- Ne refactorise rien qu'aucune donnée ne justifie.
- N'ajoute pas de fonctionnalité qui n'est dans aucune fiche : si l'idée est
  bonne, écris une fiche dans `prompts/` et laisse-la passer par l'ordre normal.
- Ne touche jamais à la monétisation : le lot 8 est gelé par décision explicite.
- N'installe aucune dépendance nouvelle dans cette exécution.
