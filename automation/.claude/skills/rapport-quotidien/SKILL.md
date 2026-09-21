---
name: rapport-quotidien
description: Lit les données Umami de la veille, écrit le rapport dans reports/ et ouvre une issue GitHub si quelque chose a changé. Déclenché chaque matin.
---

# Rapport quotidien

Tu écris le rapport d'usage de la veille pour une personne qui a dix minutes par
semaine à y consacrer. Tout ce qui n'aide pas à décider est du bruit.

## 1. Récupérer les données

Les variables d'environnement `UMAMI_URL`, `UMAMI_TOKEN` et `UMAMI_WEBSITE_ID`
sont disponibles. L'API d'Umami est documentée sur `docs.umami.is` — lis la
référence avant d'appeler, les chemins changent entre versions majeures.

Si les variables sont absentes ou l'API injoignable : écris un rapport qui le dit
en deux lignes, n'ouvre pas d'issue, et termine. Ce n'est pas un échec de job.

Récupère, pour la journée d'hier :

- visiteuses uniques, sessions, pages vues ;
- durée moyenne de session et taux de rebond ;
- les cinq pages les plus vues, et leur provenance ;
- **tous les événements nommés**, avec leur nombre.

Puis les mêmes chiffres sur les 7 jours précédents, pour comparer.

## 2. Reconstituer l'entonnoir

C'est le cœur du rapport. À partir des événements :

```
arrivée → patron fourni (collé ou PDF) → découpage réussi → 3 étapes franchies
```

Donne le nombre et le taux de passage à chaque cran. L'endroit où ça chute le
plus est l'information la plus utile de la journée.

Ajoute le **taux de retour à 7 jours** — la part des visiteuses revenues au
moins une fois dans la semaine. C'est le seul indicateur qui prédise un futur
abonnement ; traite-le comme le chiffre principal, pas comme un bonus.

## 3. Écrire le rapport

Fichier `reports/AAAA-MM-JJ.md`. Structure :

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

- le trafic a varié de plus de 40 % par rapport à la moyenne des 7 jours ;
- un cran de l'entonnoir a chuté de plus de 20 points ;
- une fonctionnalité instrumentée n'a été utilisée aucune fois alors qu'elle
  l'avait été les jours précédents ;
- une erreur est visible dans les données (page 404 en tête, événement absent) ;
- c'est lundi — un point hebdomadaire part de toute façon.

Sinon : commite le rapport, n'ouvre rien. Un rapport quotidien qui notifie tous
les jours pour ne rien dire cesse d'être lu en un mois, et ce jour-là le
dispositif entier ne sert plus à rien.

Titre de l'issue : `Rapport du JJ/MM — <la phrase qui résume>`. Corps : le
rapport en entier, plus la liste des PR ouvertes en attente de relecture.

## 5. Ne fais pas

Ne modifie aucun code dans cette exécution. Ne propose pas d'améliorations : ça
relève du rapport hebdomadaire, qui a le recul nécessaire. Ne stocke jamais de
donnée personnelle dans le rapport — pas d'adresse IP, pas d'identifiant de
session, pas de contenu de patron.
