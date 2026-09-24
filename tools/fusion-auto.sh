#!/usr/bin/env bash
# Active la fusion automatique (squash) sur une PR. Ne fait jamais échouer le job :
# si GitHub refuse, la raison va dans le résumé d'exécution et la PR reste en relecture manuelle.
# Usage : tools/fusion-auto.sh <url-ou-numéro> ; env : GH_TOKEN, REPO.
set -uo pipefail
pr="$1"
if raison=$(gh pr merge "$pr" --repo "$REPO" --auto --squash 2>&1); then
  echo "Fusion auto activée sur $pr (CI verte requise)." | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"
else
  raison=$(printf '%s' "$raison" | tr '\n' ' ')
  echo "Fusion auto non activée : $raison ($pr reste en relecture manuelle)" | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"
fi
exit 0
