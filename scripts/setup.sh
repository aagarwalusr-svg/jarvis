#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project_root="$PWD"
if [[ "${1:-}" != "" && "${1:-}" != "--check" ]]; then
  echo "Usage: bash scripts/setup.sh [--check]" >&2
  exit 2
fi
missing=0
for executable in node npm python3 uv docker; do
  if ! command -v "$executable" >/dev/null 2>&1; then
    echo "Missing prerequisite: $executable" >&2
    missing=1
  fi
done
if [[ "$missing" == 1 ]]; then
  echo "Install prerequisites listed in README.md, then retry." >&2
  exit 1
fi
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) { console.error("Node.js 22+ is required."); process.exit(1); }'
python3 -c 'import sys; sys.exit("Python 3.12+ is required.") if sys.version_info < (3, 12) else None'
docker compose version >/dev/null
docker info --format '{{.ServerVersion}}' >/dev/null
echo "Prerequisites available: Node, npm, Python, uv, Docker Compose, and Docker daemon."
if [[ "${1:-}" == "--check" ]]; then exit 0; fi
mkdir -p .local/cache
export UV_CACHE_DIR="${UV_CACHE_DIR:-$project_root/.local/cache/uv}"
export npm_config_cache="${npm_config_cache:-$project_root/.local/cache/npm}"
python3 scripts/init-local-env.py
uv sync --project backend --frozen
(cd frontend && npm ci --no-audit --no-fund)
echo "Dependencies installed. Run bash scripts/dev.sh to start JARVIS. Configure provider keys securely in .env."
