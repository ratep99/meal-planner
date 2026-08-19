#!/usr/bin/env bash
#
# Backend verification — compile + unit/integration tests.
#
# Runs inside the Compose `backend` image (JDK 17 + Maven), so the host JDK
# version does not matter. `MealPlannerApplicationTests` boots a real Spring
# context and needs PostgreSQL, so the `db` service is started first and we wait
# for its healthcheck.
#
# Usage:
#   ./scripts/check-backend.sh                             # compile + all tests
#   ./scripts/check-backend.sh -Dtest=TDEECalculatorTest   # extra Maven args
#
set -euo pipefail

cd "$(dirname "$0")/.."

echo "--- starting database ---"
docker compose up -d --wait db

echo "--- mvn test ---"
docker compose run --rm --build --no-deps backend ./mvnw -B clean test "$@"

echo "backend OK"
