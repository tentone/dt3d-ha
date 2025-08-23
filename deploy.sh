#!/usr/bin/env bash
set -euo pipefail

# Usage: deploy_frontend.sh [SSH_TARGET] [REMOTE_DIR]
# Copies the built frontend card files to the Home Assistant instance and
# reloads the frontend by restarting Home Assistant core.
#
# SSH_TARGET defaults to 'root@homeassistant.local'.
# REMOTE_DIR defaults to '/config/www'.

SSH_TARGET="${1:-root@homeassistant.local}"
REMOTE_DIR="${2:-/config/www}" 

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/frontend/dist"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Build directory '$DIST_DIR' not found. Run 'npm run build' in frontend/." >&2
  exit 1
fi

# Copy files
echo "Copying frontend files to ${SSH_TARGET}:${REMOTE_DIR}" 
scp -r "$DIST_DIR"/* "${SSH_TARGET}:${REMOTE_DIR}/"

# Reload frontend by restarting ha core
echo "Reloading Home Assistant frontend" 
ssh "$SSH_TARGET" "ha core restart" >/dev/null

echo "Deployment complete." 

