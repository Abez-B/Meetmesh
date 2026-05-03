#!/bin/bash
# Sync local commits to GitHub automatically
# Uses GITHUB_TOKEN secret for authentication

set -uo pipefail

REMOTE_URL="https://${GITHUB_TOKEN}@github.com/Abez-B/Meetmesh.git"
LAST_PUSHED=""

echo "[github-sync] Starting GitHub sync watcher..."

# Configure remote with token
git remote set-url github "$REMOTE_URL" 2>/dev/null || \
  git remote add github "$REMOTE_URL"

while true; do
  CURRENT=$(git rev-parse HEAD 2>/dev/null || echo "")

  if [ -n "$CURRENT" ] && [ "$CURRENT" != "$LAST_PUSHED" ]; then
    echo "[github-sync] New commit detected: $CURRENT — pushing to GitHub..."

    # Clean up any stale lock files left by parallel git processes
    find .git -name "*.lock" -mmin +1 -delete 2>/dev/null || true

    if git push github HEAD:main --force --quiet 2>&1; then
      echo "[github-sync] Pushed successfully."
      LAST_PUSHED="$CURRENT"
    else
      echo "[github-sync] Push failed, will retry next cycle."
    fi
  fi

  sleep 30
done
