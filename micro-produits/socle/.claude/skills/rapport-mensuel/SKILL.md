---
name: rapport-mensuel
description: Lit les données Umami et Search Console du mois, écrit le rapport mensuel dans reports/AAAA-MM.md (format d'AGENTS.md) et propose des actions classées par impact. Déclenché le 4 de chaque mois par le workflow « Rapport mensuel ».
---

# Rapport mensuel

Argument : le mois couvert, `AAAA-MM`.

Tu n'as ni réseau ni droit d'écriture sur le dépôt : tu écris **un seul
fichier**, `reports/<mois>.md`, et facultativement `.pilote/issue-titre.txt`.
Tu ne modifies aucun autre fichier, tu n'ouvres aucune PR. Les actions que tu
proposes, c'est Phil qui les valide (AGENTS.md, « Ce que l'agent ne décide
pas »).

## 1. Lire, dans cet ordre

1. `.pilote/umami.json` — visites, événements, tunnel déjà évalué
   (`periode.tunnel[].verdict`), pages, provenances ; `reference` = mois d'avant.
2. `.pilote/search-console.json` — totaux, 25 premières requêtes et pages.
3. `.pilote/rapport-precedent.md` s'il existe — pour dire si une fuite dure.
4. `docs/tunnel.md` — définition des crans et seuils.
5. `produit.json` — la requête visée (`requete`).

Rien d'autre : ni le code, ni l'historique git.

## 2. Si une source manque

`ok: false` → le rapport le dit en tête (« Umami indisponible : <erreur> »)
et travaille avec l'autre source. Les deux absentes → rapport de trois lignes,
titre d'issue « Rapport mensuel <mois> : données indisponibles ».

## 3. Écrire `reports/<mois>.md`

Suivre **exactement** le format d'AGENTS.md (§ « Format du rapport mensuel »).
Règles :

- Chaque chiffre vient d'un des deux JSON ; pas d'extrapolation. Un taux
  `null` s'écrit « — », un verdict `insuffisant` se dit tel quel, sans
  conclusion.
- Une **fuite** est un cran en `alerte`, ou en `a_surveiller` deux mois de
  suite (rapport précédent). Pas de fuite inventée sous `VISITEURS_MIN`.
- Côté Search Console : la requête visée (`produit.json`) est-elle dans les
  25 ? Requêtes à fortes impressions et CTR < 2 % ou position 5–15 =
  opportunités de titre ou de contenu.
- **Au plus trois actions**, classées par impact estimé (visiteurs ou
  conversions gagnés par mois, ordre de grandeur et raisonnement en une
  ligne), chacune avec son coût (S/M/L) et ce qui la mesurera le mois suivant.
  Une action qui change le produit, le prix ou le contenu porte
  « à valider par Phil ».
- Français soigné, espaces insécables avant `: ; ? !`.

## 4. Titre de l'issue

Écrire `.pilote/issue-titre.txt` (une ligne) seulement si une fuite ou une
opportunité justifie l'attention de Phil :
`Rapport <mois> : <la fuite ou l'opportunité principale>`. Sinon ne rien
écrire : l'issue prendra le titre par défaut.
