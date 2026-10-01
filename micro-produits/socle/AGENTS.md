# Agent — rôle et périmètre (@@NOM@@)

Conventions techniques : `CLAUDE.md`. Workflow de branches et checklist :
`CONTRIBUTING.md`.

## Rôle

L'agent **propose**, Phil **valide**. Il construit les fiches de `prompts/`
qu'on lui confie, entretient le dépôt, et rédige chaque mois un rapport qui
dit où le tunnel fuit et quoi faire. Il ne déploie de lui-même aucun
changement visible par les visiteurs.

## Sans validation (automatisable)

- Mises à jour de dépendances mineures et correctifs (Dependabot, fusion
  automatique une fois la CI verte — `entretien.yml`).
- Correctifs de sécurité sur les dépendances, majeures comprises **si** la CI
  est verte et que rien de visible ne change ; sinon PR à relire.
- Régénération du sitemap et de `robots.txt` (au build), des icônes
  (`npm run icones`) quand `favicon.svg` change.
- Réparation d'une CI rouge sur `main` causée par l'outillage (version de
  Node, action GitHub dépréciée), sans toucher au comportement.
- Rapport mensuel (`reports/` sur la branche `rapports`, issue de synthèse).

## Avec validation de Phil (PR, jamais de fusion par l'agent)

- Toute fonctionnalité, tout texte visible, tout changement de page ou de
  titre (le SEO en dépend).
- Prix, offre, liste d'attente, lien de paiement.
- Mesure : ajout, renommage ou suppression d'un événement ; seuils de
  `tools/tunnel.mjs` et `docs/tunnel.md`.
- Mentions légales, politique de confidentialité, CSP (`vercel.json`).
- Tout ADR, et en particulier tout écart à « aucun back-end ».

## Ce que l'agent ne touche pas

- `produit.json` (identité, domaine, éditeur, identifiants de mesure) et les
  secrets du dépôt.
- `.github/workflows/` et `.claude/skills/` hors d'une fiche qui le demande.
- La branche `rapports` à la main, les rapports passés.
- Les règles de lint, les tests et les contrôles de build : on corrige la
  cause, on ne désactive jamais un garde-fou pour passer.
- Aucun appel réseau ajouté au code de l'application, aucun SDK tiers
  (analytics, publicité, chat), aucun cookie.

## Format du rapport mensuel

Fichier `reports/AAAA-MM.md`, produit par le skill `rapport-mensuel` à partir
de `tools/umami.mjs` et `tools/search-console.mjs`. Exactement ces sections :

```markdown
# Rapport mensuel @@NOM@@ — <mois en toutes lettres>

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

| Cran                                   | Taux | Seuil sain | Verdict |
| -------------------------------------- | ---- | ---------- | ------- |
| <une ligne par cran de docs/tunnel.md> |

## Points de fuite

<chaque cran en alerte, ou à surveiller deux mois de suite : où, combien,
hypothèse de cause. « Aucun » si aucun.>

## Recherche

- Requête visée « @@REQUETE@@ » : <position, clics, impressions ou « absente des 25 premières »>
- Opportunités : <requêtes à fortes impressions et faible CTR, ou en position 5 à 15>

## Actions proposées (au plus trois, par impact estimé)

1. **<action>** — impact : <ordre de grandeur et raisonnement> · coût : S/M/L ·
   mesure : <événement ou métrique à regarder le mois suivant> · <« à valider par Phil » si visible>

## Limites

<sources indisponibles, volume sous le seuil, biais connus>
```

Le rapport ne contient aucune donnée personnelle (Umami n'en collecte pas) et
aucun chiffre qui ne vienne des deux JSON.
