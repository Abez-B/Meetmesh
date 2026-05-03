#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Push to GitHub after every merge
if [ -n "${GITHUB_TOKEN:-}" ]; then
  echo "[post-merge] Pushing to GitHub..."
  GIT_ASKPASS=".git/hooks/github-askpass" \
    git push github HEAD:main --quiet
  echo "[post-merge] GitHub push complete."
fi
