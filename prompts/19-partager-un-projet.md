# 19 — Envoyer un projet à une autre personne

## Pourquoi

Le permalien de la fiche 06 transmet un **patron**, sans la progression. Or on
crochète souvent à deux : une mère et sa fille sur le même plaid, une amie qui
reprend un ouvrage, un atelier où chacune suit le même patron. « Je t'envoie où
j'en suis » est la boucle naturelle qui amène une deuxième personne sur Fil.

Il n'y a pas de serveur, donc pas de synchronisation : on **envoie une copie**,
comme on envoie une photo. Chacune continue ensuite de son côté.

## Objectif

Depuis un projet, « Envoyer ce projet » produit un lien qui, ouvert ailleurs,
crée chez la destinataire **un nouveau projet** : même patron, même pièce, même
étape, mêmes rangs cochés et répétitions.

## Fichiers à lire

- `src/app/features/reader/data/pattern-link.ts` et son `.spec.ts` — encodage,
  compression, plafonds de décodage
- `src/app/features/reader/data/project.model.ts` — `Project`, `parseBackup`,
  `mergeProjects`
- `src/app/features/reader/state/reader-store.ts` — `load`, `importBackup`
- `src/app/features/reader/pages/reader-page.ts` — lecture de `#p=` au démarrage
- `src/app/features/reader/pages/projects-page.ts` — la liste des projets
- `CLAUDE.md`, « Pièges déjà rencontrés » : entrée d'un tiers bornée, charger
  un autre patron ouvre un autre projet, écritures IndexedDB confirmées

## À faire

1. `src/app/features/reader/data/project-link.ts`, fonctions pures :

   ```ts
   export interface SharedProgress {
     readonly source: string;
     readonly name: string;
     readonly pieceIndex: number;
     readonly stepIndex: number;
     readonly done: Readonly<Record<string, boolean>>;
     readonly reps: Readonly<Record<string, number>>;
   }
   export function encodeProject(p: SharedProgress): Promise<string>;
   export function decodeProject(encoded: string): Promise<SharedProgress | null>;
   ```

   Réutilise la compression et les plafonds de `pattern-link.ts` (exporter ce
   qu'il faut plutôt que dupliquer). Le JSON porte un numéro de version.
   `decodeProject` renvoie `null` — jamais d'exception — si l'entrée est trop
   longue, mal formée, d'une version inconnue, ou si un champ a un mauvais
   type. Les index hors du patron sont ramenés dans ses bornes, pas refusés.

   Ne transmettre **ni** l'image, **ni** le chronomètre, **ni** l'identifiant :
   l'image dépasserait la taille d'un lien, le temps est celui de l'expéditrice,
   et l'identifiant ferait fusionner les deux copies (`mergeProjects`), la plus
   récente écrasant l'autre.

2. Lien : fragment `#j=…` (jamais un paramètre de requête, pour la même raison
   que `#p=`). À l'ouverture, `ReaderPage` crée un **nouveau** projet avec un
   identifiant neuf et l'ouvre. Le projet actif reste intact dans la liste.
   Si le même lien est ouvert deux fois, deux projets sont créés : c'est
   acceptable, et plus sûr que de deviner un doublon.

3. Bouton « Envoyer ce projet » (composant `Button` existant) dans le lecteur,
   à côté du partage de patron : copie le lien dans le presse-papiers. Au-delà
   de 8000 caractères d'URL, bouton désactivé et explication, comme pour `#p=`.
   Texte d'aide : « La personne recevra une copie. Vos progressions resteront
   séparées. »

4. Tests : aller-retour sur le patron de démonstration avec une progression non
   nulle ; entrée corrompue, trop longue et de version inconnue → `null` ;
   index hors bornes ramenés ; ouvrir un lien ne modifie pas le projet actif ;
   le projet créé a un identifiant différent de celui de l'expéditrice.

## Mesure

Deux événements, sans propriété de contenu :

- `project_shared` : lien copié ;
- `project_received` : projet créé depuis un lien `#j=`.

Les ajouter à l'union `AnalyticsEvent` **et** à `EVENEMENTS` dans
`tools/umami.mjs`, sinon ils n'apparaissent dans aucun rapport. Le rapport
« reçus / partagés » dira si la boucle fonctionne.

## Critères d'acceptation

- `npm run verify` vert, bundle initial ≤ 335 kB (`project-link.ts` chargé par
  `import()`, comme `pattern-link.ts` aujourd'hui).
- Un lien créé dans un navigateur ouvre, dans un autre profil, un projet à la
  même étape, avec les mêmes rangs cochés.
- Un lien modifié à la main n'affiche pas d'erreur technique : le lecteur
  s'ouvre sur l'état précédent.

## Hors périmètre

Toute synchronisation, compte, ou envoi par serveur ; les liens courts ; la
co-édition ; le partage de l'image ; le partage de plusieurs projets à la fois
(la sauvegarde de la fiche 16 le fait déjà).
