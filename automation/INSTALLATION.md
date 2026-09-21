# Mise en place du pilote automatique

Ordre à suivre. Les étapes 1 à 6 tiennent en une soirée.

## 1. Déposer les fichiers

Depuis la racine du dépôt :

```
prompts/10-mesure-audience.md        (livrées séparément)
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
- vérifications de statut obligatoires : le job `verify` de la CI

C'est ce qui rend tout le reste sûr. Ne saute pas cette étape.

## 5. Vérifier que la chaîne fonctionne

Lance « Lot suivant » à la main (exécution manuelle du workflow). Attendu : une
PR qui exécute la fiche 10, ou une issue « Décision requise » si quelque chose
manque. Dans les deux cas, la chaîne marche.

## 6. Les deux décisions à débloquer

- **Nom et domaine** (fiche 11) — réponds dans l'issue que l'agent ouvrira
- **Origine du collecteur** (fiche 10) — Umami auto-hébergé, ou service managé

Tant qu'elles ne sont pas prises, l'agent saute ces fiches et continue.

## 7. Umami, quand tu es prêt

Une fois Umami installé et le site créé dans son interface, ajoute trois secrets
au dépôt :

- `UMAMI_URL` — l'origine de ton instance
- `UMAMI_TOKEN` — un jeton d'API en lecture
- `UMAMI_WEBSITE_ID` — l'identifiant du site

Le rapport quotidien s'allume tout seul trois jours après.

## Ce qui se passe ensuite

| Quand | Quoi |
| --- | --- |
| Dimanche 5h | Une fiche exécutée, une PR ouverte |
| Tous les jours 5h | Rapport écrit ; issue seulement si quelque chose a bougé |
| Lundi 6h | Point hebdomadaire et jusqu'à trois propositions |

Toi : lire, fusionner ou refuser, et répondre `@claude` dans une issue quand tu
veux qu'une proposition soit mise en œuvre.

## Pour arrêter

Désactive les workflows dans l'onglet Actions du dépôt. Rien d'autre ne tourne.
