#!/usr/bin/env bash
set -euo pipefail

# Usage: deploy_frontend.sh [SSH_TARGET] [REMOTE_DIR]
# Copies the built frontend card files to the Home Assistant instance and
# reloads the frontend by restarting Home Assistant core.
#
# SSH_TARGET defaults to 'root@homeassistant.local'.
# REMOTE_DIR defaults to '/config/www'.

SSH_ADDRESS="${1:-homeassistant.local}"
SSH_USER="${2:-root}"

REMOTE_DIR="${3:-/config/www}" 

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/frontend/dist"

# Build code
echo "Building frontend code"
cd frontend && npm run build

# Copy files
echo "Copying frontend files to ${SSH_USER}@${SSH_ADDRESS}:${REMOTE_DIR}" 
scp -r "$DIST_DIR"/* "${SSH_USER}@${SSH_ADDRESS}:${REMOTE_DIR}/"

# Reload frontend by restarting ha core
echo "Reloading Home Assistant frontend" 
ssh "$SSH_TARGET" "ha core restart" >/dev/null

echo "Deployment complete." 

