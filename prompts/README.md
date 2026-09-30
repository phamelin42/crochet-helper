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

Chaque fiche nomme, sous son titre, l'étape d'entonnoir qu'elle sert
(acquisition, activation, rétention, revenu).

L'ordre ci-dessous découle du plan d'acquisition, pas du confort technique. Les
trois premières sont une chaîne stricte : mesurer avant de changer, changer les
URL avant d'accumuler du référencement.

| #   | Fiche                              | Pourquoi à ce moment                                           |
| --- | ---------------------------------- | -------------------------------------------------------------- |
| 10  | Mesure de l'usage réel             | rien ne se décide à l'aveugle — **à faire en premier**         |
| 11  | Marque et domaine                  | migrer avant d'avoir du référencement à perdre                 |
| 12  | Anglais par défaut                 | chantier d'URL, même raison, juste après                       |
| 13  | Import PDF                         | le plus gros trou du produit, et la meilleure requête          |
| 14  | Une page par abréviation           | fait passer la surface indexable de 6 à plus de 100 pages      |
| 15  | Convertisseur US ↔ UK              | requête transactionnelle, données déjà en base                 |
| 16  | Projets multiples et sauvegarde    | absorbe la 01 ; c'est ce qui fait revenir les visiteuses       |
| 06  | Partage et impression              | la seule boucle qui amène une deuxième visiteuse               |
| 02  | Tests du lecteur                   | à remonter dès que le parseur bouge (fiche 13)                 |
| 03  | Formats de patrons supplémentaires | s'appuie sur les tests de la 02                                |
| 05  | Mode hors ligne (PWA)              | une icône sur l'écran d'accueil vaut mieux qu'un marque-page   |
| 07  | Audit d'accessibilité              | **traiter comme du fonctionnel** — public âgé en moyenne       |
| 09  | Performance et Core Web Vitals     | précondition du référencement                                  |
| 04  | Pages éditoriales de référencement | après la 14, qui couvre déjà l'essentiel du besoin             |
| 08  | Vitrine du design system           | documente ce qui existe, quand ça a cessé de bouger            |
| 21  | Mesurer le retour et la profondeur | le critère d'arrêt du plan n'est pas mesuré — rétention        |
| 18  | Matériel : en-têtes élargis        | activation : le premier découpage fait rester ou partir        |
| 22  | Liste d'attente                    | revenu : le signal qui décide du lot 8 (formulaire Tally)      |
| 23  | Kit pour les créatrices            | acquisition : le canal le mieux noté n'a aucun support         |
| 17  | Tailles de crochet mm ↔ US         | acquisition : requête fréquente, page qui reçoit ce public     |
| 19  | Envoyer un projet                  | acquisition : boucle de recommandation, progression comprise   |
| 20  | Comptes et paiement (cadrage)      | revenu : l'ADR-002 seul, gel levé par Phil le 30 septembre     |
| 24  | Mode lecture                       | activation : la promesse « en très grand » tenue sur tablette  |
| 26  | Première visite                    | activation : dire ce que fait l'outil avant de le montrer vide |
| 32  | Libellés, pied de page, lastmod    | activation et maillage : chaque commande a un mot              |
| 27  | Compteur de rangs en ligne         | acquisition : première page-outil, requête précise             |
| 34  | Images du PDF à l'étape            | activation : un PDF acheté sans ses photos ne sert à rien      |
| 35  | Diagrammes : charger et voir       | activation : les patrons en symboles entrent dans le lecteur   |
| 36  | Diagrammes : transcrire en texte   | activation : le pont diagramme → patron lisible, sans magie    |
| 25  | Vue d'ensemble et partage visible  | rétention : retrouver son rang ; la boucle de partage visible  |
| 29  | Page tailles de crochet            | acquisition : « crochet hook sizes chart », requête fréquente  |
| 28  | Calculateur d'échantillon          | acquisition : troisième page-outil                             |
| 31  | Lire un patron anglais en français | acquisition : marché francophone sans concurrent               |
| 30  | Contenu des pages d'abréviation    | acquisition : 60 mots par page ne se classent pas              |
| 33  | Glossaire sur téléphone            | acquisition : page d'entrée SEO utilisable d'un pouce          |
| 37  | Reconnaître les symboles (étude)   | **une décision, pas une fonction** : go / no-go chiffré        |
| 38  | Mode page pleine par défaut        | activation : l'étape seule à l'écran, comme promis             |
| 39  | Installer, marcher hors ligne      | rétention : une icône sur l'écran d'accueil ramène la lectrice |
| 40  | Page de confidentialité            | acquisition : exigée par le Play Store ; confiance             |
| 41  | Application Android (Play Store)   | acquisition : la boutique est un canal de recherche            |

Les fiches 38 à 41 répondent à la demande de Phil du 30 septembre (mode page
pleine comme l'application Filo, hors ligne mis en avant, Play Store ; pas
d'App Store pour l'instant). La 41 suppose la 40 (URL de confidentialité).

La fiche `01` est absorbée par la `16` : ne pas l'exécuter séparément.

Les fiches 24 à 33 découlent de l'audit du 27 septembre
(`docs/audit-ux-acquisition-2026-09.md`). Une décision de Phil y reste en
attente, sans bloquer de fiche : les liens courts (la 25 place les boutons de
partage, pas le service). La vidéo de démonstration est écartée (décision du
27/09) : la 26 s'appuie sur une image statique.

Les fiches 34 à 37 répondent à la demande de Phil du 28 septembre (images des
PDF, diagrammes de crochet). Elles s'enchaînent : la 35 s'appuie sur le
stockage d'images de la 34, la 36 sur les symboles de la 35, la 37 sur les
deux. La reconnaissance automatique d'un diagramme n'est pas promise : la 37
la mesure et tranche, sans serveur ni clé d'API (règle n° 1).

## Règle d'enchaînement

Une fiche terminée, c'est : `npm run verify` vert, une PR ouverte, le tableau
ci-dessus relu. S'il reste une décision humaine en suspens, **s'arrêter et
demander**
plutôt que d'inventer — c'est écrit dans chaque fiche concernée.
