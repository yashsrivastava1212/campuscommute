#!/usr/bin/env bash
# Pick frontend vs backend build from Railway service metadata (works when both use root railway.toml).
set -euo pipefail

is_frontend_service() {
  if [ "${SERVICE_ROLE:-}" = "frontend" ]; then
    return 0
  fi

  local meta="${RAILWAY_SERVICE_NAME:-} ${RAILWAY_PUBLIC_DOMAIN:-} ${RAILWAY_STATIC_URL:-}"
  if echo "$meta" | grep -qi 'frontend'; then
    return 0
  fi

  return 1
}

if is_frontend_service; then
  echo "[dispatch] FRONTEND build (SERVICE_ROLE=${SERVICE_ROLE:-}, name=${RAILWAY_SERVICE_NAME:-}, domain=${RAILWAY_PUBLIC_DOMAIN:-})"
  npm install --include=dev
  npm run build -w frontend
  test -f frontend/.next/BUILD_ID
  echo "[dispatch] Frontend build OK"
else
  echo "[dispatch] BACKEND build (SERVICE_ROLE=${SERVICE_ROLE:-}, name=${RAILWAY_SERVICE_NAME:-}, domain=${RAILWAY_PUBLIC_DOMAIN:-})"
  npm install --include=dev
  npm run build -w backend
  echo "[dispatch] Backend build OK"
fi
