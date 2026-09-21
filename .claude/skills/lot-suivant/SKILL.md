---
name: lot-suivant
description: Exécute la fiche de tâche suivante du dossier prompts/ et prépare une branche prête à publier. Déclenché chaque dimanche par le workflow « Lot suivant ».
allowed-tools: Read, Glob, Grep, Edit, MultiEdit, Write, Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(git:*), Bash(ls:*)
---

# Exécuter la fiche suivante

Tu fais avancer le projet Fil d'une fiche, seul, sans personne pour te relire en
cours de route.

## Ce que tu peux faire, et ce que le workflow fait après toi

Tu travailles **en local sur le runner**, sans accès en écriture à GitHub :
lire et modifier les fichiers, lancer `npm`, `npx`, `node`, `git` et `ls`. Tu ne
pousses rien et tu n'ouvres ni PR ni issue — tu n'en as pas les droits, et c'est
voulu.

Quand tu as fini, l'étape suivante du workflow lit ce que tu as laissé et :

- pousse ta branche et ouvre la pull request, avec le titre et la description
  que tu as écrits dans `.pilote/` ;
- ouvre l'issue de question si tu en as rédigé une.

Le dossier `.pilote/` sert uniquement à ces échanges. Il est ignoré par git :
ne l'ajoute jamais à un commit.

## 1. Situer le travail

Lis dans cet ordre :

1. `CLAUDE.md` — il fait autorité sur tout le reste
2. `prompts/00-contexte.md`
3. `prompts/README.md` — la table « Ordre d'exécution »
4. `automation/avancement.md` — ce qui est déjà fait

La fiche à exécuter est **la première de la table d'ordre d'exécution qui n'est
ni terminée ni bloquée** dans `automation/avancement.md`. Une seule. Ne prends
pas d'avance, même si la suivante paraît triviale.

## 2. Vérifier qu'elle est exécutable

Une seule fiche attend aujourd'hui une décision humaine : la **11**, tant que le
nom de domaine n'est pas choisi. La fiche **10**, elle, est exécutable : elle
prévoit une constante d'origine vide qui rend la mesure inerte en attendant.

Si une fiche exige une décision qui n'est écrite nulle part :

- **n'invente rien**, et ne choisis pas « une valeur raisonnable en attendant » ;
- écris le titre de la question sur une ligne dans `.pilote/issue-titre.txt`,
  sous la forme `Décision requise — fiche NN` ;
- écris la question dans `.pilote/issue-corps.md` : trois lignes, les options,
  et ce qui est bloqué ;
- passe à la fiche suivante de la table qui, elle, est exécutable ;
- si aucune ne l'est, arrête-toi. Une exécution qui ne produit rien est un
  résultat acceptable.

## 3. Exécuter

Pars de `main`, puis crée la branche : `git switch -c <numéro>-<slug>`, en
reprenant exactement le nom du fichier de la fiche sans l'extension
(`10-mesure-audience`, `13-import-pdf`). Le workflow refuse de publier toute
autre forme de nom.

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
après plusieurs tentatives, commite quand même ce qui est fait, crée le fichier
`.pilote/brouillon` et décris précisément où tu bloques dans la description :
la PR sera ouverte en brouillon, ce qui est plus utile qu'un abandon silencieux.

## 5. Préparer la publication

Mets à jour `automation/avancement.md` dans ton dernier commit : la fiche passe
à « En cours », avec la date. Laisse le numéro de PR vide, il n'existe pas
encore.

Puis écris :

- `.pilote/pr-titre.txt` — une ligne, en français, à l'impératif ;
- `.pilote/pr-corps.md` — la description de la PR, dans cet ordre :
  - **Ce qui change**, en trois à cinq lignes ;
  - **Les critères d'acceptation de la fiche**, chacun coché ou non, honnêtement ;
  - **Le poids du bundle** avant et après, si la fiche touche au code applicatif ;
  - **Ce qui reste**, y compris ce que tu as choisi de ne pas faire et pourquoi ;
  - **Les points à relire en priorité** — là où tu as hésité.

Termine sur ta branche, pas sur `main` : c'est la branche courante que le
workflow publie.

## Règles absolues

- Aucun commit sur `main`, aucune tentative de `git push`.
- Une seule fiche par exécution.
- Aucune dépendance runtime nouvelle sauf si la fiche la nomme explicitement.
- Aucune modification de `tokens.css` ou `nocturne.css` autre qu'un ajout de jeton manquant.
- Aucune modification de `.github/` ni de `.claude/`.
- Face à une décision qui n'est écrite nulle part : rédiger la question dans `.pilote/`, s'arrêter.
