# Mise en place du pilote automatique

Ordre à suivre. Les étapes 1 à 6 tiennent en une soirée.

## 1. Déposer les fichiers

Tout est dans l'archive, déjà rangé aux bons chemins. Décompresse-la à la racine du dépôt :

```
prompts/10-mesure-audience.md
prompts/11-marque-et-domaine.md
prompts/12-anglais-par-defaut.md
prompts/13-import-pdf.md
prompts/14-pages-abreviations.md
prompts/15-convertisseur-us-uk.md
prompts/16-projets-multiples.md
prompts/README.md                    (remplace l'existant)

.github/workflows/claude.yml
.github/workflows/lot-suivant.yml
.github/workflows/rapport-quotidien.yml
.github/workflows/amelioration-hebdo.yml

.claude/skills/lot-suivant/SKILL.md
.claude/skills/rapport-quotidien/SKILL.md
.claude/skills/amelioration-hebdo/SKILL.md

automation/avancement.md
```

Commite et pousse sur `main`. Les workflows programmés ne se déclenchent que
depuis la branche par défaut.

## 2. Générer le jeton d'authentification

Sur ton poste, dans Claude Code :

```bash
claude setup-token
```

Le jeton obtenu est lié à ton abonnement : les exécutions consomment ton forfait.

## 3. Installer l'app GitHub et enregistrer le secret

Le plus simple, depuis Claude Code dans le dépôt :

```bash
/install-github-app
```

Sinon, à la main : installe l'app Claude sur le dépôt, puis ajoute le secret

- `CLAUDE_CODE_OAUTH_TOKEN` = le jeton de l'étape 2

Droits d'administration du dépôt requis.

## 4. Protéger la branche principale

Réglages du dépôt, protection de `main` :

- pull request obligatoire avant fusion
- vérifications de statut obligatoires, **en sélectionnant** le job
  `Lint · format · tests · build` dans la liste : cocher la case sans choisir de
  job n'exige rien

C'est ce qui rend tout le reste sûr. Ne saute pas cette étape.

## 5. Vérifier que la chaîne fonctionne

Lance « Lot suivant » à la main (exécution manuelle du workflow). Attendu : une
PR qui exécute la fiche 10, ou une issue « Décision requise » si quelque chose
manque. Dans les deux cas, la chaîne marche.

L'agent travaille sans aucun droit d'écriture sur GitHub : il modifie, vérifie
et commite en local sur le runner, puis laisse son titre et sa description dans
`.pilote/`. C'est l'étape suivante du workflow, hors de sa portée, qui pousse la
branche, lance la CI dessus et ouvre la PR avec le jeton du workflow — celui de
l'app Claude est révoqué dès la fin de son étape. Elle refuse une branche au nom
inattendu ou qui modifie `.github/` ou `.claude/`. Si la publication échoue, le
travail de l'agent reste téléchargeable depuis la page de l'exécution
(artefact `travail-agent`, gardé 14 jours).

Un réglage est nécessaire pour que le workflow puisse ouvrir la PR : _Settings →
Actions → General → Workflow permissions_, cocher **Allow GitHub Actions to
create and approve pull requests**. Aucun workflow du dépôt n'approuve de PR.

## 6. La décision à débloquer

- **Nom et domaine** (fiche 11) — réponds dans l'issue que l'agent ouvrira

Tant qu'elle n'est pas prise, l'agent saute la fiche 11 et continue. La fiche 10
n'attend rien : elle livre une mesure inerte, activée plus tard par une constante.

## 7. Brancher Umami

Umami tourne sur `https://analytics.patternreader.com`
(`docs/adr-001-mesure-audience.md`). Ajoute trois secrets au dépôt
(_Settings → Secrets and variables → Actions_) :

- `UMAMI_URL` — `https://analytics.patternreader.com`
- `UMAMI_WEBSITE_ID` — `ANALYTICS_SITE_ID` de `analytics.config.ts`
- `UMAMI_TOKEN` — le jeton renvoyé par `POST /api/auth/login` sur l'instance

Puis lance « Rapport quotidien » à la main pour valider la chaîne : le résumé
de l'exécution affiche `ok: true` et le rapport.

Les phases 2 et 3 suivent le modèle de la phase 1. Seule l'étape
`node tools/umami.mjs` voit les secrets ; elle imprime un JSON de forme fixe
dans `.pilote/umami.json`, que l'agent lit sans réseau ni droit d'écriture.
C'est le seul fichier à corriger quand Umami change de version majeure, et
c'est ce qui rend les chiffres comparables d'un jour à l'autre. Sans secrets
ou API injoignable, le script sort `ok: false` et le rapport le dit : le job
ne passe jamais au rouge pour ça.

- Les rapports quotidiens sont publiés sur la branche `rapports` (pas de PR :
  `main` est protégée, et une PR par jour noierait les relectures). Une issue
  n'est ouverte que si quelque chose a bougé.
- Le point hebdomadaire prépare une branche `hebdo-<slug>` par action ; le
  workflow les pousse, lance la CI et ouvre une PR par branche, plus l'issue
  du point. Aucune n'est fusionnée automatiquement.

Le résumé de chaque exécution de « Rapport quotidien » montre, repliés, le
JSON lu par l'agent et la **forme** des réponses brutes d'Umami (clés et
types, sans valeurs, `node tools/umami.mjs forme`). Après une mise à jour
d'Umami, c'est là qu'on voit ce qui a changé ; `tools/fixtures/umami-v3.json`
fige la forme relevée sur l'instance (Umami 3, `type=path` et non `url`).

La veille est comparée aux 7 jours qui la **précèdent**, sans elle — une
moyenne qui contient le jour mesuré atténue l'écart qu'on cherche.

### Ce que les chiffres ne disent pas

- **La fidélité.** Umami identifie une visite par une empreinte technique
  (sans cookie) qui ne traverse pas fiablement les jours : un taux de retour à
  7 jours serait inventé. Le rapport donne `sessions / visiteurs`, qui n'en est
  pas un. Mesurer le retour demanderait un identifiant persistant, donc un
  bandeau de consentement : c'est une décision produit, pas un réglage.
- **Des personnes, dans l'entonnoir.** Les crans comptent des occurrences
  d'événements ; les taux sont des ordres de grandeur.
- **Le total exact.** Une partie des bloqueurs écarte le traceur : plancher.

## Ce qui se passe ensuite

| Quand             | Quoi                                                     | État  |
| ----------------- | -------------------------------------------------------- | ----- |
| Dimanche 5h       | Une fiche exécutée, une PR ouverte                       | Actif |
| Tous les jours 5h | Rapport écrit ; issue seulement si quelque chose a bougé | Actif |
| Lundi 6h          | Point hebdomadaire et jusqu'à trois propositions         | Actif |

Aucune fusion automatique n'est câblée : toutes les PR attendent ta relecture.

Toi : lire, fusionner ou refuser, et répondre `@claude` dans une issue quand tu
veux qu'une proposition soit mise en œuvre.

## Pour arrêter

Désactive les workflows dans l'onglet Actions du dépôt. Rien d'autre ne tourne.
