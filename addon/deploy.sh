#!/usr/bin/env bash
set -euo pipefail

ADDON_SLUG="dt3d"
SUPERVISOR_SLUG="local_${ADDON_SLUG}"
REMOTE_ADDON_DIR="/addons/${ADDON_SLUG}"

usage() {
  cat <<EOF
Usage: $0 <ssh-user> <ssh-password> [ha-host] [ssh-port]

Copies the local addon/ directory to /addons/${ADDON_SLUG} on Home Assistant OS,
then rebuilds and restarts the installed add-on, or installs and starts it if it
is not installed yet.

Arguments:
  ssh-user       SSH username for Home Assistant OS
  ssh-password   SSH password for Home Assistant OS
  ha-host        Optional HA host. Defaults to HA_HOST or homeassistant.local
  ssh-port       Optional SSH port. Defaults to SSH_PORT or 22

Environment:
  HA_HOST        Default host when [ha-host] is omitted
  SSH_PORT       Default port when [ssh-port] is omitted
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 2 || $# -gt 4 ]]; then
  usage >&2
  exit 1
fi

SSH_USER="$1"
SSH_PASSWORD="$2"
HA_HOST="${3:-${HA_HOST:-homeassistant.local}}"
SSH_PORT="${4:-${SSH_PORT:-22}}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ADDON_DIR="${SCRIPT_DIR}"

if [[ ! -f "${ADDON_DIR}/config.yaml" || ! -f "${ADDON_DIR}/Dockerfile" ]]; then
  echo "Could not find addon files in ${ADDON_DIR}" >&2
  exit 1
fi

require_command ssh
require_command sshpass
require_command tar

SSH_OPTS=(
  -p "${SSH_PORT}"
  -o StrictHostKeyChecking=accept-new
  -o UserKnownHostsFile="${HOME}/.ssh/known_hosts"
)

remote() {
  sshpass -p "${SSH_PASSWORD}" ssh "${SSH_OPTS[@]}" "${SSH_USER}@${HA_HOST}" "$@"
}

addon_is_installed() {
  remote "ha addons info '${SUPERVISOR_SLUG}' --raw-json 2>/dev/null | grep -Eq '\"installed\"[[:space:]]*:[[:space:]]*true'"
}

echo "Copying ${ADDON_DIR} to ${SSH_USER}@${HA_HOST}:${REMOTE_ADDON_DIR}"
remote "rm -rf '${REMOTE_ADDON_DIR}' && mkdir -p '${REMOTE_ADDON_DIR}'"
tar -C "${ADDON_DIR}" -cf - . \
  | sshpass -p "${SSH_PASSWORD}" ssh "${SSH_OPTS[@]}" "${SSH_USER}@${HA_HOST}" "tar -C '${REMOTE_ADDON_DIR}' -xf -"

echo "Reloading Home Assistant add-on store"
remote "ha store reload"

if addon_is_installed; then
  echo "Add-on ${SUPERVISOR_SLUG} is installed; rebuilding and restarting"
  remote "ha addons rebuild '${SUPERVISOR_SLUG}' && ha addons restart '${SUPERVISOR_SLUG}'"
else
  echo "Add-on ${SUPERVISOR_SLUG} is not installed; installing and starting"
  remote "ha addons install '${SUPERVISOR_SLUG}' && ha addons start '${SUPERVISOR_SLUG}'"
fi

echo "Deploy complete"
