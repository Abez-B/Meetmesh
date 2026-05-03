#!/bin/bash
# Fallback GitHub sync watcher — supplements the post-commit hook.
# Catches any commits the hook may have missed (e.g. automated platform commits
# that bypass normal hook execution) by polling every 60 seconds.
# Uses GIT_ASKPASS so the token is never written into .git/config.

set -uo pipefail

LAST_PUSHED=""

echo "[github-sync] Starting GitHub sync watcher (fallback)..."

while true; do
  CURRENT=$(git rev-parse HEAD 2>/dev/null || echo "")

  if [ -n "$CURRENT" ] && [ "$CURRENT" != "$LAST_PUSHED" ]; then
    echo "[github-sync] Commit ${CURRENT:0:8} not yet mirrored — pushing to GitHub..."
    if GIT_ASKPASS=".git/hooks/github-askpass" \
         git push github HEAD:main --quiet 2>&1; then
      echo "[github-sync] Pushed successfully."
      LAST_PUSHED="$CURRENT"
    else
      echo "[github-sync] Push failed, will retry next cycle."
    fi
  fi

  sleep 60
done
