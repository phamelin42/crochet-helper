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

## Ordre conseillé

| #   | Fiche                                 | Pourquoi à ce moment                           |
| --- | ------------------------------------- | ---------------------------------------------- |
| 01  | Persistance du diagramme en IndexedDB | corrige une limite réelle du stockage actuel   |
| 02  | Tests du lecteur                      | fige le comportement avant de le faire évoluer |
| 03  | Formats de patrons supplémentaires    | s'appuie sur les tests de la 02                |
| 04  | Pages éditoriales de référencement    | valeur organique, sans risque technique        |
| 05  | Mode hors ligne (PWA)                 | découle du « tout est statique »               |
| 06  | Partage et impression                 | s'appuie sur l'état stabilisé                  |
| 07  | Audit d'accessibilité                 | après que l'interface a cessé de bouger        |
| 08  | Vitrine du design system              | documente ce qui existe alors                  |
| 09  | Performance et Core Web Vitals        | mesure une application complète                |
