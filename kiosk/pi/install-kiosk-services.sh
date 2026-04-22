#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${SSH_CLIENT:-}" && -z "${SSH_TTY:-}" ]]; then
  echo "CAUTION: DESKTOP ENVIRONMENT DETECTED"
  echo "  You are running this script via the desktop, not over SSH."
  echo "  Your session from the desktop will be interrupted during install."
  echo "  It is recommended to run this script over SSH instead."
  echo "  After the installation is complete, you have to login on the computer again."
  echo ""
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KIOSK_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
KIOSK_USER="${SUDO_USER:-$(id -un)}"
KIOSK_HOME="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
LABWC_USER_CONFIG="${KIOSK_HOME}/.config/labwc/rc.xml"
LABWC_SYSTEM_CONFIG="/etc/xdg/labwc/rc.xml"
CHROMIUM_POLICY_DIR="/etc/chromium/policies/managed"

if [[ -z "${KIOSK_HOME}" ]]; then
  echo "Could not determine home directory for ${KIOSK_USER}."
  exit 1
fi

render_service() {
  local template_path="$1"
  sed \
    -e "s|__KIOSK_ROOT__|${KIOSK_ROOT}|g" \
    -e "s|__KIOSK_USER__|${KIOSK_USER}|g" \
    -e "s|__KIOSK_HOME__|${KIOSK_HOME}|g" \
    "${template_path}"
}

TMP_APP_SERVICE="$(mktemp)"
TMP_BROWSER_SERVICE="$(mktemp)"
trap 'rm -f "${TMP_APP_SERVICE}" "${TMP_BROWSER_SERVICE}"' EXIT

render_service "${SCRIPT_DIR}/cs-library-kiosk-app.service.template" > "${TMP_APP_SERVICE}"
render_service "${SCRIPT_DIR}/cs-library-kiosk-browser.service.template" > "${TMP_BROWSER_SERVICE}"

chmod +x "${SCRIPT_DIR}/launch-chromium-kiosk.sh"
chmod +x "${KIOSK_ROOT}/start.sh"

sudo cp "${TMP_APP_SERVICE}" /etc/systemd/system/cs-library-kiosk-app.service
sudo cp "${TMP_BROWSER_SERVICE}" /etc/systemd/system/cs-library-kiosk-browser.service
sudo systemctl daemon-reload
sudo systemctl enable cs-library-kiosk-app.service
sudo systemctl enable cs-library-kiosk-browser.service

echo ""
echo "Installed:"
echo "  /etc/systemd/system/cs-library-kiosk-app.service"
echo "  /etc/systemd/system/cs-library-kiosk-browser.service"
echo ""

echo "Configuring labwc keyboard shortcuts for kiosk..."

# Backup system config
if [[ -f "${LABWC_SYSTEM_CONFIG}" ]]; then
  sudo cp "${LABWC_SYSTEM_CONFIG}" "${LABWC_SYSTEM_CONFIG}.backup"
  echo "  Backed up: ${LABWC_SYSTEM_CONFIG}.backup"
fi

# Backup user config if it has real content
if [[ -f "${LABWC_USER_CONFIG}" ]] && grep -q "<keybind" "${LABWC_USER_CONFIG}"; then
  cp "${LABWC_USER_CONFIG}" "${LABWC_USER_CONFIG}.backup"
  echo "  Backed up: ${LABWC_USER_CONFIG}.backup"
fi

# Start from system config if user config is essentially empty
if [[ ! -s "${LABWC_USER_CONFIG}" ]] || ! grep -q "<keybind" "${LABWC_USER_CONFIG}"; then
  cp "${LABWC_SYSTEM_CONFIG}" "${LABWC_USER_CONFIG}"
fi

python3 "${SCRIPT_DIR}/remove-keybinds.py" "${LABWC_USER_CONFIG}"

chown "${KIOSK_USER}:${KIOSK_USER}" "${LABWC_USER_CONFIG}"

# Install Chromium kiosk policy
echo "Installing Chromium kiosk policy..."
sudo mkdir -p "${CHROMIUM_POLICY_DIR}"
sudo tee "${CHROMIUM_POLICY_DIR}/kiosk.json" > /dev/null <<'EOF'
{
  "URLBlocklist": ["*"],
  "URLAllowlist": ["localhost", "localhost:*"],
  "PrintingEnabled": false,
  "TaskManagerEndProcessEnabled": false,
  "AllowDinosaurEasterEgg": false
}
EOF
echo "  Installed: ${CHROMIUM_POLICY_DIR}/kiosk.json"
echo ""

# Tell labwc to reload its config
echo "  Reloading labwc config..."
pkill -SIGUSR1 labwc 2>/dev/null || true

echo "Setup complete!"
echo ""
echo "Start the new services with:"
echo "sudo systemctl start cs-library-kiosk-app.service"
echo "sudo systemctl start cs-library-kiosk-browser.service"
echo ""
echo "Or reboot the Pi after confirming kiosk/.env is correct."