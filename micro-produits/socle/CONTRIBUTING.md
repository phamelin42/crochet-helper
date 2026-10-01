# Contribuer à @@NOM@@

## Branches

- `main` est protégée : on n'y pousse jamais directement. Le check
  « Lint · format · tests · build » y est requis.
- Une branche par fiche ou par intention : `fiche/NN-titre-court`,
  `correctif/<sujet>`, `entretien/<sujet>`. Dependabot crée les siennes.
- `rapports` : branche orpheline, écrite seulement par le workflow
  « Rapport mensuel ».
- Une branche en retard sur `main` se met à jour par **fusion** de `main`
  (jamais de réécriture d'historique sur une branche partagée).

## Commits

- Découpés par intention : un commit = une raison de changer.
- Message en **français, à l'impératif**, première ligne ≤ 72 caractères :
  `Ajoute l'export iCal du planning`, `Corrige le total TTC arrondi`.
- Corps facultatif : le pourquoi, pas le quoi.

## Checklist de PR

Le corps de la PR reprend cette liste, cochée.

- [ ] La fiche ou l'issue d'origine est citée, et l'étape du tunnel servie
      (acquisition, activation, rétention, revenu).
- [ ] `npm run verify:ci` est vert en local (le hook `pre-push` le lance).
- [ ] Chaque nouvelle page est pré-rendue, reliée depuis une autre page,
      avec titre, description et `<h1>` ; une page `noIndex` est voulue.
- [ ] Aucune valeur brute de style, aucun `innerHTML`, aucun appel réseau
      ajouté.
- [ ] Données de la personne : aucune perte possible en cas d'échec
      d'écriture ; action destructive confirmée.
- [ ] Événement ajouté → déclaré dans `evenements.ts` **et**
      `tools/umami.mjs`, et placé dans `docs/tunnel.md` si c'est un cran.
- [ ] Les tests décrivent ce que la personne obtient ; une liste de valeurs
      est parcourue en entier.
- [ ] Bundle initial : avertissement de budget justifié dans la PR, sinon
      rien à dire.
- [ ] Français soigné dans l'interface (espaces insécables avant `: ; ? !` et
      dans « »).
- [ ] Changement visible (texte, page, prix, mesure) : **relu par Phil**
      avant fusion (`AGENTS.md`).

Avant de pousser, même du Markdown seul : `npx prettier --check <fichiers>`.
