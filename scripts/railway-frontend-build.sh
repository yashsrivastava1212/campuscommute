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
  echo "[railway] Building frontend from monorepo root: $root"
  npm install --include=dev
  npm run build -w frontend
  build_dir="$root/frontend/.next"
else
  echo "[railway] Building frontend as standalone workspace: $PWD"
  npm install --include=dev
  npm run build
  build_dir="$PWD/.next"
fi

if [ ! -f "$build_dir/BUILD_ID" ]; then
  echo "[railway] ERROR: Next.js production build missing ($build_dir/BUILD_ID not found)" >&2
  exit 1
fi

echo "[railway] Frontend build complete"
