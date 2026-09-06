#!/usr/bin/env bash
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

if root="$(find_monorepo_root)"; then
  cd "$root"
  echo "[railway] Starting frontend from monorepo root: $root (PORT=${PORT:-3000})"
  exec npm run start -w frontend
fi

echo "[railway] Starting frontend as standalone workspace: $PWD (PORT=${PORT:-3000})"
exec npm run start
