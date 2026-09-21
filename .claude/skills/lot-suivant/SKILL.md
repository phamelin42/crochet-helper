---
name: lot-suivant
description: Exécute la fiche de tâche suivante du dossier prompts/ et ouvre une pull request. Déclenché chaque dimanche par le workflow « Lot suivant ».
---

# Exécuter la fiche suivante

Tu fais avancer le projet Fil d'une fiche, seul, sans personne pour te relire en
cours de route. Ta sortie est **une pull request**, jamais un commit sur `main`.

## 1. Situer le travail

Lis dans cet ordre :

1. `CLAUDE.md` — il fait autorité sur tout le reste
2. `prompts/00-contexte.md`
3. `prompts/README.md` — la table « Ordre d'exécution »
4. `automation/avancement.md` — ce qui est déjà fait

La fiche à exécuter est **la première de la table d'ordre d'exécution qui n'est
pas marquée terminée** dans `automation/avancement.md`. Une seule. Ne prends pas
d'avance, même si la suivante paraît triviale.

## 2. Vérifier qu'elle est exécutable

Certaines fiches attendent une décision humaine — le nom de domaine pour la 11,
l'origine du collecteur pour la 10. Chaque fiche le dit explicitement.

Si la décision manque :

- **n'invente rien**, et ne choisis pas « une valeur raisonnable en attendant » ;
- ouvre une issue GitHub intitulée `Décision requise — fiche NN`, qui pose la
  question en trois lignes, donne les options et dit ce qui est bloqué ;
- passe à la fiche suivante de la table qui, elle, est exécutable ;
- si aucune ne l'est, arrête-toi. Une exécution qui ne produit rien est un
  résultat acceptable.

## 3. Exécuter

Branche : `git switch -c <numéro>-<slug>`, en reprenant le slug du nom de fichier
de la fiche.

Applique la fiche **à la lettre**, y compris sa section « Hors périmètre ». Un
diff qui déborde du périmètre sera refusé, et tu auras consommé une semaine pour
rien. Si tu penses qu'un point de la fiche est une mauvaise idée, fais-le quand
même et dis pourquoi dans la description de la PR.

Commits découpés par intention, message en français à l'impératif.

## 4. Vérifier

`npm run verify` doit être vert. Cette commande enchaîne lint, format, tests et
build avec pré-rendu.

Si elle échoue, corrige la cause. **Ne désactive jamais une règle de lint, ne
marque jamais un test en `skip`, ne contourne jamais `check-csp.mjs` ou
`check-prerender.mjs` pour faire passer la commande.** Si tu n'y arrives pas
après plusieurs tentatives, ouvre quand même la PR en brouillon et décris
précisément où tu bloques — c'est plus utile qu'un abandon silencieux.

## 5. Livrer

Mets à jour `automation/avancement.md` dans le même commit : la fiche passe à
terminée, avec la date et le numéro de PR.

Ouvre la pull request. Sa description contient, dans cet ordre :

- **Ce qui change**, en trois à cinq lignes, en français ;
- **Les critères d'acceptation de la fiche**, chacun coché ou non, honnêtement ;
- **Le poids du bundle** avant et après, si la fiche touche au code applicatif ;
- **Ce qui reste**, y compris ce que tu as choisi de ne pas faire et pourquoi ;
- **Les points à relire en priorité** — là où tu as hésité.

## Règles absolues

- Jamais de commit direct sur `main`, jamais de fusion de ta propre PR.
- Une seule fiche par exécution.
- Aucune dépendance runtime nouvelle sauf si la fiche la nomme explicitement.
- Aucune modification de `tokens.css` ou `nocturne.css` autre qu'un ajout de jeton manquant.
- Face à une décision qui n'est écrite nulle part : ouvrir une issue, s'arrêter.
