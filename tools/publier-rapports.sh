#!/usr/bin/env bash
# Publie sur la branche `rapports` (jamais sur main, qui est protégée).
#
#   DISTANT=<url avec jeton> tools/publier-rapports.sh "<message>" \
#     [--copier <dossier-source> <dossier-cible>] [--ligne <fichier> "<ligne>"]
#
# --ligne ajoute une ligne à un journal (créé avec son en-tête s'il manque).
# Trois tentatives : deux workflows peuvent publier en même temps (dimanche 5 h).
set -euo pipefail
message=$1
shift
operations=("$@")

git config --global user.name "Pilote automatique"
git config --global user.email "pilote-automatique@users.noreply.github.com"

for tentative in 1 2 3; do
  r=$(mktemp -d)
  rmdir "$r"
  if git fetch -q --depth 1 "$DISTANT" rapports 2>/dev/null; then
    git worktree add -q -f "$r" FETCH_HEAD
  else
    git worktree add -q -f --orphan -b "rapports-$tentative-$$" "$r"
  fi
  set -- "${operations[@]}"
  while [ $# -gt 0 ]; do
    case "$1" in
      --copier)
        mkdir -p "$r/$3"
        cp -r "$2"/. "$r/$3/"
        git -C "$r" add "$3"
        shift 3
        ;;
      --ligne)
        f="$r/$2"
        mkdir -p "$(dirname "$f")"
        if [ ! -s "$f" ]; then
          printf '# Coût des exécutions du pilote\n\n| Date | Workflow | Tours | Coût indicatif | Note |\n| --- | --- | --- | --- | --- |\n' > "$f"
        fi
        printf '%s\n' "$3" >> "$f"
        git -C "$r" add "$2"
        shift 3
        ;;
      *)
        echo "::error::Option inconnue : $1"
        exit 1
        ;;
    esac
  done
  # La branche ne contient ni package.json ni application : sans ce fichier,
  # Vercel tente de la déployer à chaque rapport et échoue (`ng: command not
  # found`). Vercel lit le vercel.json de la branche déployée, pas celui de main.
  if [ ! -f "$r/vercel.json" ]; then
    printf '{ "git": { "deploymentEnabled": false } }\n' > "$r/vercel.json"
    git -C "$r" add vercel.json
  fi
  if git -C "$r" diff --cached --quiet; then
    git worktree remove -f "$r"
    exit 0
  fi
  git -C "$r" commit -qm "$message"
  if git -C "$r" push -q "$DISTANT" HEAD:refs/heads/rapports; then
    git worktree remove -f "$r"
    exit 0
  fi
  git worktree remove -f "$r"
  sleep $((tentative * 5))
done
echo "::warning::Publication sur « rapports » impossible après trois tentatives."
