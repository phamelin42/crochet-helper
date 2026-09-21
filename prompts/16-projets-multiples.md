# 16 — Plusieurs projets, et une sauvegarde qu'on emporte

## Pourquoi

Fil ne retient qu'un patron à la fois, dans `localStorage`. Or les personnes qui
crochètent mènent en moyenne dix-neuf projets par an et en ont souvent deux ou
trois en cours. Pire : vider son navigateur, ou changer de téléphone, efface la
progression sans avertissement.

La synchronisation automatique demanderait un serveur, ce qui est exclu. Le
meilleur équivalent sans back-end, c'est plusieurs projets en local et un
fichier de sauvegarde que l'on déplace soi-même.

## Objectif

Une liste de projets, une reprise en un clic, et un export/import de sauvegarde.

## Fichiers à lire

- `src/app/core/storage/local-storage.service.ts`
- `src/app/features/reader/state/reader-store.ts`
- `src/app/features/reader/data/pattern.model.ts`
- `prompts/01-persistance-diagramme-indexeddb.md` — cette fiche la remplace et
  l'absorbe ; lis-la, elle contient l'analyse du stockage
- `src/app/shared/ui/dialog/dialog.ts`

## À faire

1. Migrer le stockage vers IndexedDB. `localStorage` plafonne autour de 5 Mo,
   ce qui est déjà juste avec un diagramme importé en `data:` URL, et intenable
   avec plusieurs projets.

2. Écrire une **migration** depuis l'état `localStorage` existant, exécutée une
   seule fois. Personne ne doit perdre son patron en cours à la mise à jour.
   C'est le point le plus sensible de la fiche : un test dédié l'exige.

3. Modèle de projet : identifiant, nom (dérivé du titre du patron, modifiable),
   patron, progression, compteurs, chronomètre, date de dernière ouverture.

4. Écran de liste : projets triés par dernière ouverture, reprise en un clic,
   renommage, suppression avec confirmation via `Dialog`.

5. Export : un fichier `.json` contenant tous les projets, avec un numéro de
   version de schéma. Import : relecture du fichier, **fusion** et non
   écrasement, avec résolution des doublons par date la plus récente.

6. Un fichier d'import d'une version de schéma inconnue est refusé avec un
   message clair, jamais importé partiellement.

7. Vérifier que `wake-lock.service.ts` se comporte correctement quand on change
   de projet sans recharger la page.

8. Instrumenter `project_resumed`, `project_created`, `backup_exported`,
   `backup_imported`.

## Critères d'acceptation

- `npm run verify` vert.
- Un test prouve que la migration depuis `localStorage` préserve intégralement
  un patron en cours, compteurs et chronomètre compris.
- Un export réimporté sur un profil vide restitue tous les projets à l'identique.
- Un import sur un profil non vide fusionne sans perdre de projet existant.
- Un fichier de version inconnue est refusé proprement.
- Tout accès à IndexedDB est gardé : `check-prerender.mjs` vert.

## Hors périmètre

Synchronisation automatique, comptes utilisateurs, stockage en ligne — règle 1.
Photos d'avancement. Partage d'un projet entre deux personnes : c'est la fiche 06.
