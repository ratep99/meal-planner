#!/usr/bin/env bash
set -euo pipefail

# Run from repo root after `git remote add origin git@github.com:ratep99/meal-planner.git`
# Requires: gh auth login, SSH access to github.com/ratep99

MONOREPO_URL="https://github.com/ratep99/meal-planner"
BACKEND_REPO="ratep99/meal-planner-backend"
FRONTEND_REPO="ratep99/meal-planner-frontend"

echo "==> Create monorepo on GitHub (skip if it already exists)"
gh repo view ratep99/meal-planner >/dev/null 2>&1 || \
  gh repo create ratep99/meal-planner --private --description "Household meal planner monorepo"

echo "==> Push monorepo"
git remote remove origin 2>/dev/null || true
git remote add origin "git@github.com:ratep99/meal-planner.git"
git push -u origin main

MOVED_NOTICE="# Moved

This repository has moved to **${MONOREPO_URL}**.

Clone the monorepo for backend, frontend, and Docker Compose.

---
"

for repo in "$BACKEND_REPO" "$FRONTEND_REPO"; do
  echo "==> Add moved notice to $repo"
  tmp=$(mktemp -d)
  gh repo clone "$repo" "$tmp/repo" -- --depth=1
  cd "$tmp/repo"
  if [ -f README.md ]; then
    { echo "$MOVED_NOTICE"; cat README.md; } > README.md.new
    mv README.md.new README.md
  else
    printf '%s\n' "$MOVED_NOTICE" > README.md
  fi
  git add README.md
  git commit -m "docs: point to monorepo at ratep99/meal-planner"
  git push origin main
  gh repo archive "$repo" --yes
  cd - >/dev/null
  rm -rf "$tmp"
done

echo "Done. Monorepo: $MONOREPO_URL"
