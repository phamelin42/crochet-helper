# Contribuer

## Branches

- `main` est protégée : le check « Lint · format · tests · build » y est
  requis, on n'y pousse jamais directement.
- Une branche par fiche ou par intention : `<slug>/NN-titre-court` pour une
  fiche de produit, `libs/<sujet>` pour une bibliothèque, `correctif/<sujet>`,
  `entretien/<sujet>`. Dependabot crée les siennes.
- Une PR ne mélange pas un produit et `libs/` : un changement partagé passe
  seul, relu pour tous les produits.
- `rapports` : branche orpheline, écrite seulement par « Rapport mensuel ».
- Une branche en retard se met à jour par **fusion** de `main`.

## Commits

- Découpés par intention ; message en **français, à l'impératif**, première
  ligne ≤ 72 caractères, préfixée du produit quand il y en a un :
  `devis-artisan : ajoute l'export PDF`, `ui : ajoute la section témoignages`.
- Corps facultatif : le pourquoi, pas le quoi.

## Checklist de PR

- [ ] Fiche ou issue citée, et l'étape du tunnel servie.
- [ ] `npm run verify:ci` vert en local.
- [ ] Code propre au produit dans `projects/<slug>/src/app/metier/` ; tout ce
      qui servirait à un autre produit est monté dans `libs/` et figure dans
      la vitrine.
- [ ] Aucun texte rédigé dans `libs/` ; tout texte visible d'un produit est
      dans son `contenu.json`, écrit pour lui seul (`check-contenu` vert).
- [ ] Nouvelle page : pré-rendue, reliée, titre, description et `<h1>`.
- [ ] Aucune valeur brute de style, aucun `innerHTML`, aucun appel réseau.
- [ ] Données de la personne : aucune perte possible ; action destructive
      confirmée.
- [ ] Événement ajouté → `evenements.ts` **et** `tools/umami.mjs`, et
      `docs/tunnel.md` si c'est un cran.
- [ ] Les tests décrivent ce que la personne obtient ; une liste de valeurs
      est parcourue en entier.
- [ ] Avertissement de budget justifié dans la PR, sinon rien à dire.
- [ ] Français soigné (espaces insécables avant `: ; ? !` et dans « »).
- [ ] Changement visible ou touchant `libs/` : **relu par Phil**.

Avant de pousser, même du Markdown seul : `npx prettier --check <fichiers>`.
