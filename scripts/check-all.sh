#!/usr/bin/env bash
# Runs every check. Use before handing work back.
set -euo pipefail
cd "$(dirname "$0")/.."
./scripts/check-backend.sh
./scripts/check-frontend.sh
echo
echo "all checks passed"
