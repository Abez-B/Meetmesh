#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Push to GitHub after every merge
if [ -n "${GITHUB_TOKEN:-}" ]; then
  echo "[post-merge] Pushing to GitHub..."
  git remote set-url github "https://${GITHUB_TOKEN}@github.com/Abez-B/Meetmesh.git" 2>/dev/null || \
    git remote add github "https://${GITHUB_TOKEN}@github.com/Abez-B/Meetmesh.git"
  git push github HEAD:main --force --quiet
  echo "[post-merge] GitHub push complete."
fi
