# 60 — Patron terminé : l'écran de fin et la photo de l'ouvrage

**Étape d'entonnoir servie : rétention (la lectrice qui finit un ouvrage et le
montre a une raison de revenir au suivant ; aujourd'hui la fin tient en une
phrase et un bouton grisé).**

## Pourquoi

Quand la dernière étape est cochée, le lecteur affiche seulement « Patron
terminé, bravo ! ». Aucun moment de fierté, aucune trace dans « Mes projets »,
aucune façon de garder ou de montrer le résultat. Décisions de Phil : un écran
de fin, une photo gardée **sur l'appareil**, un partage natif. Aucune photo
hébergée chez nous, aucun appel réseau nouveau. Publication sur Ravelry et
galerie : plus tard, hors périmètre.

## Objectif

Une lectrice qui coche la dernière étape voit un écran de célébration, ajoute
une photo de son ouvrage, la partage ou l'enregistre, et retrouve le projet
marqué « Terminé » avec sa photo dans « Mes projets ».

## Fichiers à lire

- `src/app/features/reader/state/reader-store.ts` (`grep -n "finished"`)
- `src/app/features/reader/components/step-view.ts`, `share-actions.ts`
- `src/app/features/reader/data/project.model.ts`, `project-backup.ts`
- `src/app/core/storage/project-store.service.ts` (`putAll`, `getFiles`)
- `src/app/features/reader/pages/projects-page.ts`
- `src/app/core/analytics/analytics.service.ts`, `tools/umami.mjs`,
  `src/app/features/legal/data/privacy-events.ts`

## À faire

1. **Écran de fin** (`store.finished()`) : titre, nom du patron, temps passé,
   nombre d'étapes, illustration existante, actions « Ajouter une photo »,
   « Partager », « Recommencer ce patron » (après confirmation), « Mes
   projets », lien « Revoir la dernière étape ». Composant de présentation dans
   `shared/ui` (vitrine), logique dans la fonctionnalité, annonce `role="status"`,
   focus sur le titre, animation éteinte par `prefers-reduced-motion`.
2. **Projet terminé** : `finishedAt` posé la première fois, effacé par
   « Recommencer » ou en décochant la dernière étape. « Mes projets » : pastille
   « Terminé » (texte et coche) et vignette de la photo.
3. **Photo** : sélecteur d'image, redimensionnée (1600 px, JPEG 0,85) avant
   stockage, 25 Mo au plus, `ProjectImage` de `kind: 'finished'` écrite dans la
   même transaction que le projet ; une seule par projet, remplacement et retrait
   confirmés ; sauvegarde et suppression du projet la prennent en compte.
4. **Partage** : Web Share (avec le fichier si accepté), repli « Enregistrer la
   photo » et « Copier le message » ; une annulation n'est pas une erreur.
5. **Mesure** : `pattern_finished`, `finished_photo_added`, `finished_shared`
   (canal `natif`, `telechargement` ou `copie`), sans donnée personnelle.

## Tests

Unitaires (passage à terminé, `finishedAt`, recommencer, décocher ; photo relue
par le magasin ; écriture avortée : ancienne photo intacte ; fichier trop gros
ou non image ; sauvegarde aller-retour ; suppression). `e2e/patron-termine.spec.ts`
en EN et FR, axe clair et sombre avec et sans photo.

## Critères d'acceptation

- `npm run verify:ci` vert, bundle initial noté avant et après : l'écran de fin,
  ses textes et le traitement d'image sont paresseux (`import()`).
- Pas de défilement horizontal à 390 × 844 ni 820 × 1180 ; cibles de 48 px.
- Captures relues, clair et sombre, avec et sans photo.

## Hors périmètre

Publication Ravelry, galerie, lien « Chercher un autre patron » (page à venir :
emplacement commenté, pas de lien mort), photos de progression en cours d'ouvrage.
