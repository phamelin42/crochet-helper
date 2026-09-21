# Fiches de tâche pour agents

Chaque fichier `NN-*.md` est une **tâche autoportante** : un agent qui ne connaît
rien au projet peut l'exécuter en lisant `00-contexte.md` puis la fiche, sans
autre explication.

## Comment s'en servir

1. Ouvrir une session sur le dépôt propre (`git status` vide), sur une branche
   dédiée : `git switch -c <numéro>-<slug>`.
2. Donner à l'agent, dans cet ordre :
   - le contenu de `prompts/00-contexte.md` ;
   - le contenu de la fiche choisie.
3. Laisser l'agent boucler jusqu'à ce que `npm run verify` soit vert.
4. Relire le diff avant de fusionner. Les fiches disent explicitement ce qui est
   **hors périmètre** : un diff qui déborde est à renvoyer.

## Pourquoi elles sont écrites ainsi

Ces fiches visent des modèles économiques, qui travaillent bien quand le
périmètre est fermé et mal quand il faut deviner. Chacune donne donc :

- **la liste exacte des fichiers à lire** — pas « explore le dépôt » ;
- **le contrat d'interface** (signatures, noms de fichiers à créer) ;
- **des critères d'acceptation vérifiables**, pas des intentions ;
- **la commande de vérification** et l'obligation de la faire passer ;
- **les non-objectifs**, pour empêcher la dérive.

## Ordre d'exécution

L'ordre ci-dessous découle du plan d'acquisition, pas du confort technique. Les
trois premières sont une chaîne stricte : mesurer avant de changer, changer les
URL avant d'accumuler du référencement.

| #   | Fiche                              | Pourquoi à ce moment                                         |
| --- | ---------------------------------- | ------------------------------------------------------------ |
| 10  | Mesure de l'usage réel             | rien ne se décide à l'aveugle — **à faire en premier**       |
| 11  | Marque et domaine                  | migrer avant d'avoir du référencement à perdre               |
| 12  | Anglais par défaut                 | chantier d'URL, même raison, juste après                     |
| 13  | Import PDF                         | le plus gros trou du produit, et la meilleure requête        |
| 14  | Une page par abréviation           | fait passer la surface indexable de 6 à plus de 100 pages    |
| 15  | Convertisseur US ↔ UK              | requête transactionnelle, données déjà en base               |
| 16  | Projets multiples et sauvegarde    | absorbe la 01 ; c'est ce qui fait revenir les visiteuses     |
| 06  | Partage et impression              | la seule boucle qui amène une deuxième visiteuse             |
| 02  | Tests du lecteur                   | à remonter dès que le parseur bouge (fiche 13)               |
| 03  | Formats de patrons supplémentaires | s'appuie sur les tests de la 02                              |
| 05  | Mode hors ligne (PWA)              | une icône sur l'écran d'accueil vaut mieux qu'un marque-page |
| 07  | Audit d'accessibilité              | **traiter comme du fonctionnel** — public âgé en moyenne     |
| 09  | Performance et Core Web Vitals     | précondition du référencement                                |
| 04  | Pages éditoriales de référencement | après la 14, qui couvre déjà l'essentiel du besoin           |
| 08  | Vitrine du design system           | documente ce qui existe, quand ça a cessé de bouger          |

La fiche `01` est absorbée par la `16` : ne pas l'exécuter séparément.

## Règle d'enchaînement

Une fiche terminée, c'est : `npm run verify` vert, une PR ouverte, le tableau
ci-dessus relu. S'il reste une décision humaine en suspens (le nom du domaine
pour la fiche 11, l'origine du collecteur pour la 10), **s'arrêter et demander**
plutôt que d'inventer — c'est écrit dans chaque fiche concernée.
