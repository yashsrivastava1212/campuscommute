#!/usr/bin/env bash
# Railway frontend: install, build, start (works when config-as-code is ignored).
set -euo pipefail

find_monorepo_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/package.json" ] && grep -q '"workspaces"' "$dir/package.json" 2>/dev/null; then
      printf '%s' "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

export HOSTNAME="${HOSTNAME:-0.0.0.0}"

if root="$(find_monorepo_root)"; then
  cd "$root"
  echo "[railway-frontend] Monorepo root: $root (PORT=${PORT:-unset})"
  npm install --include=dev
  npm run build -w frontend
  test -f frontend/.next/BUILD_ID
  exec npm run start -w frontend
fi

echo "[railway-frontend] Standalone frontend: $PWD (PORT=${PORT:-unset})"
npm install --include=dev
npm run build
test -f .next/BUILD_ID
exec npm run start
