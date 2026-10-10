#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project_root="$PWD"
export UV_CACHE_DIR="${UV_CACHE_DIR:-$project_root/.local/cache/uv}"
export npm_config_cache="${npm_config_cache:-$project_root/.local/cache/npm}"
mkdir -p .local
python3 scripts/init-local-env.py
docker compose up -d --wait db
if [[ ! -x backend/.venv/bin/uvicorn || ! -d frontend/node_modules ]]; then
  echo "Install dependencies first: (cd backend && uv sync --frozen) and (cd frontend && npm ci)."
  exit 1
fi
(cd "$project_root/backend" && exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --ws-max-size 65536) &
backend_pid=$!
frontend_pid=""
cleanup() {
  kill "$backend_pid" 2>/dev/null || true
  if [[ -n "$frontend_pid" ]]; then kill "$frontend_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM
(cd "$project_root/frontend" && exec node node_modules/next/dist/bin/next dev --hostname 127.0.0.1) &
frontend_pid=$!
wait -n "$backend_pid" "$frontend_pid"
