# Contexte commun aux fiches

À lire avant toute fiche de `prompts/<slug>/`.

- Le workspace, ses contraintes et ses pièges : `CLAUDE.md`. Le périmètre de
  l'agent : `AGENTS.md`. Le produit concerné : `projects/<slug>/PRODUIT.md`.
- Une fiche est autoportante : elle liste les fichiers à lire, ce qu'il faut
  livrer et comment le vérifier. Lire ces fichiers-là, chercher le reste par
  `grep -n`.
- Une fiche nomme, sous son titre, l'étape du tunnel qu'elle sert
  (`docs/tunnel.md`).
- Chaque produit en reçoit deux à sa création : `01-module-metier.md` et
  `02-contenu-editorial.md`.
- Fin de fiche : `npm run verify:ci` vert, commits en français à l'impératif,
  PR avec la checklist de `CONTRIBUTING.md` et le nombre d'échanges consommés.
