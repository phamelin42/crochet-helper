# Pilote automatique — ce qui tourne (état au 23/09/2026)

Trois workflows GitHub Actions, tous sans fusion automatique. Chaque agent
travaille sans réseau, sans secret et sans droit d'écriture : c'est l'étape
suivante du workflow, hors de sa portée, qui publie. Avant chaque agent, une
**garde** (`tools/pilote.mjs`) décide s'il y a quelque chose à faire ; sinon
l'agent n'est pas appelé et ne coûte rien.

## Calendrier

| Quand (Paris)      | Workflow                  | Produit                                                | Garde : l'agent est sauté si…                                                                |
| ------------------ | ------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Dimanche 5 h       | Lot suivant               | une PR qui exécute la fiche suivante de `prompts/`     | aucune fiche « À faire » sans branche ouverte                                                |
| Tous les jours 5 h | Rapport quotidien         | `reports/AAAA-MM-JJ.md` sur la branche `rapports`      | pas de données, ou moins de 100 visites sur 8 jours (rapport de 2 lignes écrit par la garde) |
| Lundi 6 h          | Amelioration hebdomadaire | une PR de fiches (≤ 3 fichiers `prompts/`) + une issue | pas de données, ou moins de 100 visites en 7 jours **et** déjà 3 fiches en attente           |

Heures d'été ; les `cron` sont en UTC (03 h et 04 h).

## Ce qui attend Phil

- **Toutes les PR** : fiche exécutée (dimanche), fiches proposées (lundi).
  Rien ne fusionne seul ; `main` exige une PR et la CI « Lint · format ·
  tests · build ».
- **Les issues** : rapport quotidien seulement si un seuil est franchi (skill
  `rapport-quotidien`, § 4), point hebdomadaire chaque lundi où l'agent tourne,
  « Décision requise » quand une fiche bloque.
- **Les décisions écrites** : le gel du lot 8 (fiche 20), l'URL de la liste
  d'attente (fiche 22).

## Où lire

- **Rapports** : branche `rapports`, dossier `reports/`. Le rapport de la veille
  est redonné à l'agent chaque matin (sa seule mémoire d'un jour à l'autre).
- **Coûts** : branche `rapports`, `automation/couts.md` — une ligne par
  exécution : date, workflow, tours, coût indicatif (l'abonnement ne facture
  pas à l'unité), raison de la garde.
- **Données brutes d'un matin** : résumé de l'exécution de « Rapport
  quotidien », repliés : le JSON lu par l'agent et la forme des réponses
  d'Umami (`node tools/umami.mjs forme`, clés et types sans valeurs).

## La mesure

Umami 3 auto-hébergé sur `https://analytics.patternreader.com`
(`docs/adr-001-mesure-audience.md`). Seule l'étape `node tools/umami.mjs` voit
les secrets `UMAMI_URL`, `UMAMI_WEBSITE_ID`, `UMAMI_TOKEN` ; elle imprime un
JSON de forme fixe (`tools/fixtures/umami-v3.json` fige la forme relevée).
Sans secrets ou API injoignable : `ok: false`, et le job reste vert.

La veille est comparée aux 7 jours qui la **précèdent**, sans elle. Le traceur
ne se charge que sur `patternreader.com` depuis le 24/09 : **les chiffres
antérieurs sont gonflés par la CI** (7 visites sur 10 le 23/09).

### Ce que les chiffres ne disent pas

- **Le retour**, tant que la fiche 21 n'est pas livrée. Umami identifie une
  visite par une empreinte qui ne traverse pas les jours ; la fiche 21 mesure
  le retour côté navigateur (une date de première visite en `localStorage`,
  seule une tranche d'ancienneté est transmise), dans l'exemption CNIL de la
  mesure d'audience. Un suivi par personne demanderait un identifiant
  persistant et un bandeau de consentement : décision produit, pas réglage.
- **Des personnes, dans l'entonnoir** : les crans comptent des occurrences.
- **Le total exact** : une partie des bloqueurs écarte le traceur (plancher).
- **Rien sous 100 visites par semaine** : c'est le plancher des gardes.

## Économie

Aux volumes actuels (quelques visites par jour), les gardes sautent le rapport
et le point hebdo : le coût se concentre sur « Lot suivant », qui vise moins de
120 échanges par fiche (skill `lot-suivant`, section « Économie de tokens » de
`CLAUDE.md`). Le journal `automation/couts.md` dit si c'est tenu.

## Remise en place

1. `claude setup-token` sur un poste, puis le secret `CLAUDE_CODE_OAUTH_TOKEN`
   (ou `/install-github-app` depuis Claude Code).
2. Les trois secrets Umami ci-dessus ; `UMAMI_TOKEN` s'obtient par
   `POST /api/auth/login` sur l'instance. Un `ok: false` avec « HTTP 401 »
   dans un rapport = jeton expiré, à régénérer.
3. _Settings → Actions → General_ : cocher **Allow GitHub Actions to create
   and approve pull requests** (aucun workflow n'approuve).
4. Protection de `main` : PR obligatoire et check **Lint · format · tests ·
   build** sélectionné. Aucune règle sur `rapports`.
5. Valider : « Rapport quotidien » en exécution manuelle sur `main` ; le
   résumé affiche la garde et, si l'agent tourne, le rapport.

Sur une branche, l'étape de l'agent est toujours sautée (claude-code-action
exige un fichier de workflow identique à celui de `main`) : on n'y valide que
les étapes qui la précèdent.

## Pour arrêter

Désactiver les workflows dans l'onglet Actions. Rien d'autre ne tourne.
