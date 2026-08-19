#!/usr/bin/env bash
#
# Frontend verification — typecheck + lint (+ optional production build).
#
# Runs inside the Compose `frontend` image so it works without Node installed on
# the host. `node_modules` lives in the `frontend_node_modules` volume, which the
# `./frontend:/app` bind mount would otherwise shadow, so we install into it on
# first run.
#
# Usage:
#   ./scripts/check-frontend.sh              # typecheck + lint
#   ./scripts/check-frontend.sh --build      # also run the production build
#   ./scripts/check-frontend.sh --reinstall  # wipe node_modules first (fixes a half-installed volume)
#
# Do not run two copies of this at once — they share one node_modules volume and
# will corrupt each other's install.
#
set -euo pipefail

cd "$(dirname "$0")/.."

RUN_BUILD=0
FORCE_REINSTALL=0
for arg in "$@"; do
  case "$arg" in
    --build)     RUN_BUILD=1 ;;
    --reinstall) FORCE_REINSTALL=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

INNER='set -e
cd /app

install_deps() {
  # A partially-populated volume makes `npm ci` fail with ENOTEMPTY, and the
  # image-baked npm cache can be incomplete, so clear both before retrying.
  echo "--- installing node_modules ---"
  find node_modules -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
  npm ci --no-audit --no-fund || {
    echo "--- npm ci failed, clearing cache and retrying ---"
    npm cache clean --force
    npm ci --no-audit --no-fund
  }
}
'

if [[ $FORCE_REINSTALL -eq 1 ]]; then
  INNER+='install_deps
'
else
  INNER+='if [ ! -x node_modules/.bin/tsc ] || [ ! -x node_modules/.bin/eslint ]; then
  install_deps
fi
'
fi

INNER+='echo "--- typecheck (tsc) ---"
node_modules/.bin/tsc -b
echo "--- lint (eslint) ---"
node_modules/.bin/eslint .
'

if [[ $RUN_BUILD -eq 1 ]]; then
  INNER+='echo "--- build (vite) ---"
npm run build
'
fi

# --no-deps: typecheck and lint need neither the API nor the database.
docker compose run --rm --no-deps --entrypoint sh frontend -c "$INNER"

echo "frontend OK"
