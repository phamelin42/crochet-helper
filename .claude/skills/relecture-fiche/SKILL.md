---
name: relecture-fiche
description: Relire, corriger et livrer la branche d'une fiche produite par le pilote automatique (ou reprendre le projet dans une nouvelle session), puis dire à Phil exactement quoi faire. À utiliser dès que Phil dit qu'une PR de fiche est ouverte ou mergée, ou demande de reprendre où on en était.
---

# Relire une fiche du pilote automatique

Objectif : aucune régression ni perte de données chez la lectrice, au moindre
coût en tokens. Tu lis ciblé, tu lances les contrôles une fois, tu livres en un
fichier, et tu termines **toujours** par la liste d'actions de Phil.

`$SCRATCH` désigne le dossier scratchpad de la session.

## 0. Contexte (2 appels, pas plus)

- Doc projet `claude/etat-du-projet.md` (outil Projects) : état, action en attente.
- `git fetch --prune && git log --oneline -15 origin/main && git branch -r`.
  Branche `origin/<nn>-<slug>` = fiche en relecture ; déjà mergée = relecture après merge.

Pas de `gh` ni d'API GitHub dans le conteneur : l'état des PR se déduit des
branches. Le push direct est refusé (403) tant que Phil n'a pas ajouté le dépôt
aux sources de la session.

## 1. Lire ciblé

1. `prompts/<nn>-*.md` : critères d'acceptation et hors périmètre.
2. `git diff --stat <base>..<tête>` puis seulement les fichiers de code touchés.
   Ne relis pas les specs en entier : `grep -n "it("` suffit pour savoir ce qui
   est couvert.
3. Pendant la lecture, lance `verify` en arrière-plan (voir 2) pour paralléliser.

Grille de relecture — dans cet ordre (sécurité/données > fonctionnel > design) :

- **Pièges connus** : section « Pièges déjà rencontrés » de `CLAUDE.md`.
- **Les tests figent-ils un bug ?** Pour chaque test, se demander si le
  comportement attendu est le bon pour la lectrice.
- **Données** : tout chemin d'échec (quota, IndexedDB absente, JSON invalide,
  concurrence avec un effet) garde la donnée d'origine.
- **Chemins d'entrée multiples** : collage clavier, bouton, dépôt de PDF, exemple.
- **SEO/i18n** : page pré-rendue dans les deux langues, reliée, `noIndex` hors
  sitemap, français correct.
- **Règles `CLAUDE.md`** : pas de style local, dépendances features → shared → core.

## 2. Contrôler

```bash
# Node ≥ 22.22.3 exigé ; le conteneur a 22.22.2 et nodejs.org est bloqué
N=$SCRATCH/node24; [ -x $N/node_modules/node/bin/node ] || (mkdir -p $N && cd $N && npm i --no-save node@24 >/dev/null)
export PATH=$N/node_modules/node/bin:$PATH
npm ci --no-audit --no-fund >/dev/null && npm run verify > $SCRATCH/verify.log 2>&1; echo EXIT $?
grep -E "×|Tests |Initial total|Prerendered|sitemap.xml|Pré-rendu|CSP :" $SCRATCH/verify.log
```

Tests ciblés pendant les corrections : `npx ng test --no-watch --include='<glob>'`
(jamais `npx vitest` directement : l'environnement Angular n'est pas initialisé).

E2E sous CSP de production, à 360 px :

```bash
python3 .claude/skills/relecture-fiche/serve-csp.py &   # depuis la racine du dépôt
E=$SCRATCH/e2e; mkdir -p $E && cd $E && npm i --no-save playwright-core >/dev/null
node <dépôt>/.claude/skills/relecture-fiche/smoke.mjs /chemin1 /fr/chemin1
```

Regarde au moins une capture (Read sur le PNG). Pour un parcours (clics,
IndexedDB), écris un script court dans `$E` sur le modèle de `smoke.mjs`.

## 3. Corriger et livrer

- Travaille sur `revue-<nn>` créée depuis la tête à relire. Commits découpés
  par intention, en français, avec les trailers de session.
- Chaque défaut corrigé a son test. Un test qui figeait un bug est **inversé**,
  pas supprimé.
- Livraison : `git bundle create /mnt/user-data/outputs/finitions-fiche-<nn>.bundle <tête-distante>..revue-<nn>`,
  puis `device_commit_files` à la racine du clone de Phil
  (`C:\Users\phamelin\Desktop\pornhub\Phil-projects\projects\fil-patterns`).
  Le bundle passe aussi pour `.claude/` et `.github/`, que le pont refuse
  d'écrire directement.

## 4. S'améliorer

Avant de conclure, si la relecture a trouvé un défaut **d'un type nouveau** :

- ajoute-le en une ligne à « Pièges déjà rencontrés » de `CLAUDE.md` (c'est ce
  qui empêche l'agent du pilote de le refaire) ;
- si une étape de ce skill a coûté des allers-retours, corrige ce skill ou ses
  scripts dans le même bundle.
  Garde `CLAUDE.md` court : on fusionne des lignes plutôt qu'on n'en ajoute.

Mets à jour `claude/etat-du-projet.md` (outil Projects) : fiche en cours, action en attente.

## 5. Dire à Phil quoi faire — toujours, en liste numérotée

Modèle, à adapter :

1. **Appliquer les corrections** (PowerShell) :
   ```powershell
   cd "C:\Users\phamelin\Desktop\pornhub\Phil-projects\projects\fil-patterns"
   git fetch origin
   git switch <branche-cible>          # branche de la fiche si non mergée, sinon main
   git pull --ff-only
   git pull --ff-only finitions-fiche-<nn>.bundle revue-<nn>
   if ($LASTEXITCODE -eq 0) { Remove-Item finitions-fiche-<nn>.bundle; git push }
   ```
   Si `main` est protégée et la fiche déjà mergée : pousser sur une branche
   `finitions-<nn>` (`git push -u origin HEAD:finitions-<nn>`) et ouvrir la PR.
2. **CI** : Actions → attendre « Lint · format · tests · build » vert (sinon
   workflow **CI** → Run workflow sur la branche). Ignorer l'exécution
   `pull_request` vide.
3. **Merger** la PR.
4. **Nettoyer** les branches restantes (onglet Branches).
5. **Lancer la fiche suivante** : Actions → **Lot suivant** → Run workflow sur `main`.
6. **Revenir** : « relis la fiche <nn+1> » quand sa PR est ouverte (idéalement
   **avant** de la merger : les corrections vont alors dans la même PR).
