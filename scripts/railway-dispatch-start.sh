#!/usr/bin/env bash
# Pick frontend vs backend start from Railway service metadata.
set -euo pipefail

is_frontend_service() {
  if [ "${SERVICE_ROLE:-}" = "frontend" ]; then
    return 0
  fi
  if [ "${SERVICE_ROLE:-}" = "backend" ]; then
    return 1
  fi

  local meta="${RAILWAY_SERVICE_NAME:-} ${RAILWAY_PUBLIC_DOMAIN:-} ${RAILWAY_STATIC_URL:-}"
  if echo "$meta" | grep -qi 'frontend'; then
    return 0
  fi

  # Frontend service never links Postgres; backend always should.
  if [ -z "${DATABASE_URL:-}" ]; then
    return 0
  fi

  return 1
}

if is_frontend_service; then
  echo "[dispatch] FRONTEND start on PORT=${PORT:-3000} (name=${RAILWAY_SERVICE_NAME:-}, domain=${RAILWAY_PUBLIC_DOMAIN:-})"
  if [ ! -f frontend/.next/BUILD_ID ]; then
    echo "[dispatch] Missing frontend/.next — running build"
    npm install --include=dev
    npm run build -w frontend
  fi
  exec npm run start -w frontend
fi

echo "[dispatch] BACKEND start on PORT=${PORT:-3001} (name=${RAILWAY_SERVICE_NAME:-}, domain=${RAILWAY_PUBLIC_DOMAIN:-})"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[dispatch] ERROR: DATABASE_URL is missing on the backend service." >&2
  echo "[dispatch] Backend → Variables → Add Reference → PostgreSQL → DATABASE_URL" >&2
  exit 1
fi
exec npm run start -w backend
