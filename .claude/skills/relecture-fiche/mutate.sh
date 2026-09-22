#!/bin/bash
# Test de mutation minimal : casse une ligne, lance les specs, restaure.
# Un test utile échoue quand on casse ce qu'il protège ; « SURVIT » = trou.
#
# Usage (racine du dépôt, Node 24 dans le PATH) :
#   .claude/skills/relecture-fiche/mutate.sh <fichier> "<ancien>" "<nouveau>" "<nom>" [glob des specs]
f=$1; old=$2; new=$3; name=$4; include=${5:-'src/app/**/*.spec.ts'}

# Une mutation n'a de sens que sur une base verte : sinon tout paraît « tué ».
# La base est vérifiée une fois par état du fichier (cache par empreinte).
stamp="${TMPDIR:-/tmp}/mutate-base-$(cat "$f" $(git ls-files -m -o --exclude-standard -- 'src/**/*.spec.ts' 2>/dev/null) 2>/dev/null | md5sum | cut -c1-12)"
if [ ! -f "$stamp" ]; then
  npx ng test --no-watch --include="$include" > "$stamp.log" 2>&1 \
    || { echo "BASE ROUGE : corriger les tests avant de muter ($stamp.log)"; exit 3; }
  touch "$stamp"
fi

bak=$(mktemp)
cp "$f" "$bak"
python3 - "$f" "$old" "$new" <<'PY' || { rm -f "$bak"; echo "MOTIF ABSENT  $name"; exit 2; }
import sys
f, o, n = sys.argv[1:4]
s = open(f).read()
if o not in s:
    sys.exit(1)
open(f, 'w').write(s.replace(o, n, 1))
PY
log=$(mktemp)
npx ng test --no-watch --include="$include" > "$log" 2>&1
r=$?
cp "$bak" "$f"; rm -f "$bak"
fails=$(grep -oE "[0-9]+ failed" "$log" | head -1)
if [ $r -eq 0 ]; then echo "SURVIT  $name"
elif [ -n "$fails" ]; then echo "TUÉE    $name ($fails)"
else echo "INVALIDE $name : ne compile pas, reformuler la mutation"; fi
rm -f "$log"
