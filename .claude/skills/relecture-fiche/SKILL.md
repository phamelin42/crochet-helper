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
- **Mes corrections précédentes sont-elles bien dans `main` ?** Vérifier le
  dernier commit de la relecture précédente, pas la branche (elle est supprimée
  au merge) : `git merge-base --is-ancestor <sha> origin/main && echo DANS MAIN || echo ABSENT`
  — lire la réponse, ne pas la supposer. Absent = les corrections ont été
  perdues au merge de la fiche : les remettre dans `revue-<nn>` (`git merge`)
  et le dire à Phil. C'est arrivé à la fiche 07.
- Idem pour toute branche `finitions-*` encore présente :
  `git log --oneline origin/main..origin/finitions-<nn>`.

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

**Les tests protègent-ils vraiment ?** Plutôt que de relire les specs, casser le
code et voir si elles échouent — c'est plus sûr et moins cher en tokens :
`bash .claude/skills/relecture-fiche/mutate.sh <fichier> "<ancien>" "<nouveau>" "<nom>" [glob]`.
Viser les invariants de la fiche et les pièges de `CLAUDE.md`. Une mutation
qui « SURVIT » = un test à écrire (ou une mutation équivalente : le dire).
« INVALIDE » = la mutation ne compile pas, la reformuler (changer une valeur,
pas la structure). Le script refuse de partir sur une base rouge.

**Fonctions pures de `data/` (parseur…)** : les essayer sur des entrées
réalistes plutôt que lire leurs tests. Un fichier `probe.ts` qui importe la
fonction et affiche le résultat, puis :
`node_modules/.bin/esbuild probe.ts --bundle --platform=node --outfile=probe.js && node probe.js`.
Comparer avec la version d'avant la fiche (`git worktree add <dossier> <commit>`)
pour distinguer régression et défaut ancien.

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

## 4. Rétro — obligatoire à chaque PR, même sans défaut

Deux questions, deux actions, dans le même bundle :

1. **Quel défaut la fiche a-t-elle livré ?** Type nouveau → une ligne dans
   « Pièges déjà rencontrés » de `CLAUDE.md` (l'agent du pilote la lira avant la
   prochaine fiche). Type déjà listé → la ligne n'a pas suffi : la rendre plus
   concrète, ou transformer le piège en **contrôle automatique** (test, règle de
   lint, vérification dans `tools/`), qui coûte zéro token en relecture.
2. **Qu'est-ce qui m'a coûté des tokens ou des allers-retours ?** (commande
   ratée, fichier lu en entier pour rien, script réécrit, erreur d'outillage.)
   → corriger ce skill, ses scripts, ou « Erreurs d'outillage connues » ci-dessous.

Puis une entrée de 3 lignes dans `journal.md` (défauts · coûts · amélioration
faite). Garde `CLAUDE.md` et ce skill courts : fusionner plutôt qu'ajouter, et
supprimer une consigne devenue inutile. La rétro figure dans le message final à
Phil, en deux lignes.

**Préparer la fiche suivante** (quelques minutes, évite un lot raté) : la
relire **en entier** contre l'état actuel du code — URL, fichiers cités, mais
aussi les nombres et listes (« six routes », « trois pages »), le budget, les
pièges connus — et la corriger dans le même bundle. Un simple contrôle des
chemins a laissé passer « six routes » dans la fiche 07. La fiche 05, périmée, a coûté 200
échanges à l'agent.

Mets à jour `claude/etat-du-projet.md` (outil Projects) : fiche en cours, action en attente.

## Erreurs d'outillage connues

- `npx vitest` seul échoue (« TestBed.initTestEnvironment ») : passer par `ng test`.
- `pkill -f <motif>` dans une commande qui contient ce motif tue son propre shell :
  lancer les serveurs sur un port neuf plutôt que de les tuer.
- Un script ESM hors du dossier où `playwright-core` est installé ne le trouve
  pas : `smoke.mjs` le charge avec `createRequire(process.cwd())`.
- Playwright `text=Convert` matche aussi le titre : utiliser `getByRole('button', { name, exact: true })`.
- `git push` et l'API GitHub renvoient 403 : ne pas réessayer, livrer en bundle.
- `innerText` renvoie le texte d'un élément `display: none` : pour l'impression,
  compter les pages de `page.pdf()` (`/Type /Page`).
- Un bouton dans un `Disclosure` replié est introuvable par Playwright : ouvrir
  d'abord le panneau.
- `npm ci` en arrière-plan vide `node_modules` pendant son exécution : attendre
  la fin de `verify` avant d'utiliser `node_modules/.bin`.
- Prettier reformate les lignes longues : relire la ligne (`grep -n`) avant un
  remplacement Python sur du code déjà formaté.
- `npx playwright test` (tests `e2e/` du dépôt) veut sa propre révision de
  Chromium, absente du conteneur : lancer avec `PW_CHROMIUM=/opt/pw-browsers/chromium`.
  `smoke.mjs` accepte `W=320` pour tester le reflow.
- Les tests Angular n'ont pas les types Node (`tsconfig.spec.json`) : un
  contrôle qui doit lire des fichiers va dans `tools/*.mjs`, lancé par le build,
  pas dans une spec.
- Les boutons d'un `Segmented` sont des radios masquées : les cliquer par leur
  libellé (`getByText('Assombri', { exact: true })`), pas par `getByRole`.
- Poids du bundle : `npx ng build --stats-json`, puis lire
  `dist/fil-patterns/stats.json` (`outputs[main].inputs[*].bytesInOutput`).

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
   **Insister : cette PR se merge avant de lancer « Lot suivant »** — le
   workflow refuse désormais de partir sinon.
2. **CI** : Actions → attendre « Lint · format · tests · build » vert (sinon
   workflow **CI** → Run workflow sur la branche). Ignorer l'exécution
   `pull_request` vide.
3. **Merger** la PR.
4. **Nettoyer** les branches restantes (onglet Branches).
5. **Lancer la fiche suivante** : Actions → **Lot suivant** → Run workflow sur `main`.
6. **Revenir** : « relis la fiche <nn+1> » quand sa PR est ouverte (idéalement
   **avant** de la merger : les corrections vont alors dans la même PR).

Puis la rétro, en deux lignes : ce que j'ai amélioré pour la prochaine fois.
