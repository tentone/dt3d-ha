#!/usr/bin/env bash
# Deploy script for the dt3d-ha addon to a local Home Assistant instance.
#
# Usage:
#   ./deploy.sh [HA_HOST] [HA_TOKEN]
#
# Arguments / environment variables (command-line args take precedence):
#   HA_HOST   - IP address or hostname of the HA instance      (default: homeassistant.local)
#   HA_TOKEN  - Long-lived access token for the Supervisor API
#   SSH_USER  - SSH username                                    (default: root)
#   SSH_PORT  - SSH port used by the Terminal & SSH add-on      (default: 22222)
#
# The script copies the addon files to /addons/local/dt3d_backend on the HA
# filesystem via SCP, then rebuilds and restarts the addon through the
# Supervisor REST API.
#
# Prerequisites:
#   - The "Terminal & SSH" add-on is installed and running on Home Assistant.
#   - curl, ssh, and scp are available on this machine.

set -euo pipefail

HA_HOST="${1:-${HA_HOST:-homeassistant.local}}"
HA_TOKEN="${2:-${HA_TOKEN:-}}"
SSH_USER="${SSH_USER:-root}"
SSH_PORT="${SSH_PORT:-22222}"

ADDON_SLUG="dt3d_backend"
REMOTE_ADDON_DIR="/addons/local/${ADDON_SLUG}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---- Validation -------------------------------------------------------

if [[ -z "${HA_TOKEN}" ]]; then
  echo "Error: HA_TOKEN is required."
  echo "  Set it as an environment variable or pass it as the second argument."
  echo "  Generate one in Home Assistant under Profile → Long-Lived Access Tokens."
  exit 1
fi

# ---- Copy addon files -------------------------------------------------

echo "==> Deploying addon '${ADDON_SLUG}' to Home Assistant at ${HA_HOST} ..."

echo "--> Creating remote directory ${REMOTE_ADDON_DIR} ..."
ssh -p "${SSH_PORT}" \
  -o StrictHostKeyChecking=accept-new \
  "${SSH_USER}@${HA_HOST}" \
  "mkdir -p '${REMOTE_ADDON_DIR}'"

echo "--> Copying addon files ..."
scp -P "${SSH_PORT}" \
  -o StrictHostKeyChecking=accept-new \
  -r \
  "${SCRIPT_DIR}/backend" \
  "${SCRIPT_DIR}/config.yaml" \
  "${SCRIPT_DIR}/Dockerfile" \
  "${SSH_USER}@${HA_HOST}:${REMOTE_ADDON_DIR}/"

# ---- Supervisor API helpers -------------------------------------------

supervisor_post() {
  local endpoint="$1"
  curl -sf \
    -o /dev/null \
    -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${HA_TOKEN}" \
    -H "Content-Type: application/json" \
    "http://${HA_HOST}/api/hassio/addons/local_${ADDON_SLUG}/${endpoint}"
}

# ---- Rebuild & restart ------------------------------------------------

echo "--> Rebuilding addon (this may take a few minutes) ..."
REBUILD_STATUS=$(supervisor_post "rebuild")
if [[ "${REBUILD_STATUS}" != "200" ]]; then
  echo "Warning: rebuild returned HTTP ${REBUILD_STATUS}."
fi

echo "--> Restarting addon ..."
RESTART_STATUS=$(supervisor_post "restart")
if [[ "${RESTART_STATUS}" == "200" ]]; then
  echo "==> Addon restarted successfully."
else
  echo "Error: restart returned HTTP ${RESTART_STATUS}."
  exit 1
fi
