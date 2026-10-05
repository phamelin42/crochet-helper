#!/bin/bash
# Prépare une session Claude Code sur le web : Node 24 (la CLI Angular refuse
# le Node 22.22.0 de l'image), dépendances npm et Chromium pour Playwright.
# Idempotent : l'état du conteneur est mis en cache après le premier passage.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

NODE_VERSION="v$(cat .nvmrc)"
NODE_DIR="$HOME/.cache/node-$NODE_VERSION"

# La version demandée par `.nvmrc`, sauf si le Node du système la fournit déjà.
if [ "$(node -v 2>/dev/null || true)" != "$NODE_VERSION" ]; then
  if [ ! -x "$NODE_DIR/bin/node" ]; then
    archive="node-$NODE_VERSION-linux-x64"
    tmp="$(mktemp -d)"
    curl -sSfL "https://nodejs.org/dist/$NODE_VERSION/$archive.tar.xz" | tar -xJ -C "$tmp"
    mkdir -p "$(dirname "$NODE_DIR")"
    rm -rf "$NODE_DIR"
    mv "$tmp/$archive" "$NODE_DIR"
    rm -rf "$tmp"
  fi
  export PATH="$NODE_DIR/bin:$PATH"
  echo "export PATH=\"$NODE_DIR/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

npm install --no-audit --no-fund

# Playwright cherche sa révision de Chromium ; l'image en fournit une autre,
# préinstallée. On la désigne plutôt que d'en télécharger une (cf. PW_CHROMIUM
# dans playwright.config.ts et tools/).
if [ -z "${PW_CHROMIUM:-}" ] && [ -x /opt/pw-browsers/chromium ]; then
  expected="$(node -p "require('./node_modules/playwright-core/browsers.json').browsers.find((b) => b.name === 'chromium').revision")"
  if [ ! -d "/opt/pw-browsers/chromium-$expected" ]; then
    echo "export PW_CHROMIUM=$(readlink -f /opt/pw-browsers/chromium)" >> "$CLAUDE_ENV_FILE"
  fi
fi
