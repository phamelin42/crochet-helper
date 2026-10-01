# Agent — rôle et périmètre

Conventions techniques : `CLAUDE.md`. Workflow et checklist : `CONTRIBUTING.md`.

## Rôle

L'agent **propose**, Phil **valide**. Il construit les fiches de
`prompts/<slug>/` qu'on lui confie, entretient le workspace, et rédige chaque
mois, pour chaque produit en ligne, un rapport qui dit où le tunnel fuit et
quoi faire. Il ne déploie de lui-même aucun changement visible.

## Sans validation (automatisable)

- Mises à jour de dépendances mineures et correctifs (Dependabot, fusion
  automatique une fois la CI verte — `entretien.yml`).
- Correctifs de sécurité sur les dépendances, majeures comprises si la CI est
  verte et que rien de visible ne change ; sinon PR à relire.
- Régénération des sitemaps et `robots.txt` (au build) et des icônes
  (`npm run icones -- <slug>`) quand un logo change.
- Réparation d'une CI rouge causée par l'outillage, sans changer de
  comportement.
- Rapports mensuels (branche `rapports`, une issue par produit).

## Avec validation de Phil (PR, jamais de fusion par l'agent)

- Tout texte visible, en particulier tout `contenu.json` : c'est lui qui se
  référence, et il doit rester unique par produit.
- Toute fonctionnalité, toute page, tout titre ou meta description.
- Prix, offre, paiement ; tout ADR, en particulier tout écart à « aucun
  back-end ».
- Mesure : ajout, renommage ou suppression d'un événement ; seuils de
  `tools/tunnel.mjs`.
- Un nouveau produit (`npm run nouveau-produit`) ; toute ligne de
  `produits.json` ; mentions légales, confidentialité, CSP.
- Toute modification de `libs/` : elle touche tous les produits à la fois.

## Ce que l'agent ne touche pas

- `produits.json` → `editeur` et `mesure`, les `produit.json` → `mesure`, les
  secrets du dépôt.
- `.github/workflows/`, `.claude/skills/`, `schematics/` hors d'une fiche qui
  le demande.
- La branche `rapports` à la main, les rapports passés.
- Les règles de lint, les tests et les contrôles de build : on corrige la
  cause, on ne désactive jamais un garde-fou pour passer.
- Aucun appel réseau, aucun SDK tiers (analytics, publicité, chat), aucun
  cookie dans le code des applications.
- Aucun texte copié d'un produit à l'autre, même reformulé à la marge.

## Format du rapport mensuel

Un fichier par produit, `reports/<slug>/AAAA-MM.md`, produit par le skill
`rapport-mensuel` à partir de `tools/umami.mjs` et `tools/search-console.mjs`.
Exactement ces sections :

```markdown
# Rapport mensuel <nom du produit> — <mois en toutes lettres>

## En une phrase

<la chose la plus importante du mois, chiffrée>

## Chiffres clés

| Indicateur                                      | Ce mois | Mois précédent | Écart |
| ----------------------------------------------- | ------- | -------------- | ----- |
| Visiteurs                                       |         |                |       |
| Clics Search Console                            |         |                |       |
| Impressions                                     |         |                |       |
| Position moyenne                                |         |                |       |
| Fonction principale utilisée (`outil_commence`) |         |                |       |
| Exports (`export_fait`)                         |         |                |       |
| Intérêt pour l'offre (`offre_cliquee`)          |         |                |       |

## Tunnel

| Cran | Taux | Seuil sain | Verdict |
| ---- | ---- | ---------- | ------- |

<une ligne par cran de docs/tunnel.md>

## Points de fuite

<chaque cran en alerte, ou à surveiller deux mois de suite : où, combien,
hypothèse de cause. « Aucun » si aucun.>

## Recherche

- Requête visée « <requete> » : <position, clics, impressions, ou « absente des 25 premières »>
- Opportunités : <requêtes à fortes impressions et faible CTR, ou en position 5 à 15>

## Actions proposées (au plus trois, par impact estimé)

1. **<action>** — impact : <ordre de grandeur et raisonnement> · coût : S/M/L ·
   mesure : <événement ou métrique du mois suivant> · <« à valider par Phil » si visible>

## Limites

<sources indisponibles, volume sous le seuil, biais connus>
```

Aucune donnée personnelle, aucun chiffre qui ne vienne des deux JSON. Une
action qui touche `libs/` le dit : elle vaut pour tous les produits.
