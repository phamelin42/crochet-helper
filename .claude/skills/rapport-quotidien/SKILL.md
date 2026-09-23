---
name: rapport-quotidien
description: Lit les données Umami de la veille, écrit le rapport dans reports/ et ouvre une issue GitHub si quelque chose a changé. Déclenché chaque matin.
---

# Rapport quotidien

Tu écris le rapport d'usage de la veille pour une personne qui a dix minutes par
semaine à y consacrer. Tout ce qui n'aide pas à décider est du bruit.

## 1. Lire les données

Le workflow a déjà interrogé Umami : tout est dans `.pilote/umami.json`, produit
par `tools/umami.mjs`. N'appelle aucune API, n'essaie pas d'en savoir plus que
ce fichier — tu n'as ni réseau ni secret, et c'est voulu : les chiffres restent
comparables d'un jour à l'autre.

- `ok: false` : écris un rapport de deux lignes qui recopie `erreur`, n'ouvre
  pas d'issue, et termine. Ce n'est pas un échec.
- `periode` : la veille (`fin`), heure de Paris. `stats` (visiteurs, sessions,
  pages vues, sessions par visiteur, taux de rebond, durée moyenne de session),
  `pages` et `provenances` (cinq premières), `evenements` (chaque événement
  instrumenté, à 0 s'il n'a pas eu lieu), `entonnoir`.
- `reference` : les 7 jours **précédant** la veille, sans elle.
  Compare `periode.stats` à `reference.moyenne_journaliere`.
- `limites` : à reprendre en pied de rapport, une ligne chacune.

## 2. L'entonnoir

C'est le cœur du rapport :

```
arrivée → patron fourni (collé ou PDF) → découpage réussi → étape franchie
```

Recopie les nombres et `taux_depuis_precedent` de `periode.entonnoir`. Ce sont
des occurrences d'événements, pas des personnes : écris « 30 patrons fournis »,
jamais « 30 visiteuses ont fourni un patron ». L'endroit où ça chute le plus
est l'information la plus utile de la journée.

Pas de taux de retour : Umami identifie une visite par une empreinte technique
qui ne traverse pas fiablement les jours, ce chiffre serait inventé. Donne
`sessions_par_visiteur` à la place, sans l'appeler fidélité (voir
`docs/pilote-automatique.md`, « Ce que les chiffres ne disent pas »).

## 3. Écrire le rapport

Fichier `reports/AAAA-MM-JJ.md`, daté de `fin`. Structure :

1. **Une phrase** qui dit ce qui s'est passé. Pas « voici le rapport du… ».
2. Le tableau des chiffres, avec l'écart à la semaine précédente.
3. L'entonnoir.
4. **Ce qui a changé**, et seulement ce qui a changé. Si rien n'a bougé, écris-le
   en une ligne et arrête-toi là.

Règles d'écriture : français, phrases courtes, chiffres avec leur unité, aucune
adjectivation (« excellente progression », « forte hausse » — donne le chiffre).
N'interprète pas une variation sur moins de 30 visiteuses : à ce volume, c'est
du bruit, et le dire est plus honnête que de broder.

## 4. Décider s'il faut ouvrir une issue

**Ouvre une issue seulement si l'un de ces cas est vrai :**

- le trafic a varié de plus de 40 % par rapport à `reference.moyenne_journaliere`
  (et la référence compte au moins 30 visiteuses par jour) ;
- un `taux_depuis_precedent` de l'entonnoir est inférieur de plus de 20 points
  à celui de `reference` ;
- un événement est à 0 dans `periode` alors qu'il est au-dessus de 0 dans
  `reference` ;
- une erreur est visible dans les données (page 404 en tête, événement absent).

Sinon : écris le rapport, n'ouvre rien. Un rapport quotidien qui notifie tous
les jours pour ne rien dire cesse d'être lu en un mois, et ce jour-là le
dispositif entier ne sert plus à rien.

Tu n'as aucun droit sur GitHub : pour ouvrir l'issue, écris son titre sur une
ligne dans `.pilote/issue-titre.txt` — `Rapport du JJ/MM — <la phrase qui
résume>` — et le rapport en entier dans `.pilote/issue-corps.md`. Le workflow
l'ouvre, y ajoute la liste des PR en attente, et publie le rapport sur la
branche `rapports`. Ne commite rien.

## 5. Ne fais pas

N'écris rien hors de `reports/` et `.pilote/`. Ne propose pas d'améliorations : ça
relève du rapport hebdomadaire, qui a le recul nécessaire. Ne stocke jamais de
donnée personnelle dans le rapport — pas d'adresse IP, pas d'identifiant de
session, pas de contenu de patron.
