#!/usr/bin/env bash

set -euo pipefail

echo "WARNING: This script will automatically reboot the system when complete."
echo "  Any unsaved work will be lost. Make sure you are ready before continuing."
echo ""
read -r -p "Continue? [y/N]: " INSTALL_CONFIRM
if [[ ! "${INSTALL_CONFIRM}" =~ ^[Yy]$ ]]; then
  echo "Exiting..."
  exit 0
fi
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KIOSK_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# Please create the kiosk user and set up the app directory before running this script.
KIOSK_USER="kiosk"
KIOSK_HOME="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
LABWC_USER_CONFIG="${KIOSK_HOME}/.config/labwc/rc.xml"
LABWC_SYSTEM_CONFIG="/etc/xdg/labwc/rc.xml"
CHROMIUM_POLICY_DIR="/etc/chromium/policies/managed"

# Permissions fix
echo "Checking app directory permissions..."
if [[ -d "${KIOSK_ROOT}" ]]; then
  if ! sudo -u "${KIOSK_USER}" test -w "${KIOSK_ROOT}"; then
    echo "Fixing permissions for ${KIOSK_ROOT}..."
    sudo chown -R "${KIOSK_USER}:${KIOSK_USER}" "${KIOSK_ROOT}"
    echo "Permissions updated."
  else
    echo "Permissions for ${KIOSK_ROOT} are correct — skipping."
  fi
else
  echo "WARNING: App directory ${KIOSK_ROOT} not found — skipping permissions check."
fi
echo ""

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

sudo cp "${TMP_APP_SERVICE}" /etc/systemd/system/cs-library-kiosk-app.service
sudo cp "${TMP_BROWSER_SERVICE}" /etc/systemd/system/cs-library-kiosk-browser.service
sudo systemctl daemon-reload
sudo systemctl enable cs-library-kiosk-app.service
sudo systemctl enable cs-library-kiosk-browser.service

echo ""
echo "Installed:"
echo "/etc/systemd/system/cs-library-kiosk-app.service"
echo "/etc/systemd/system/cs-library-kiosk-browser.service"
echo ""

echo "Configuring labwc keyboard shortcuts for kiosk..."
echo ""

# Backup system config
if [[ -f "${LABWC_SYSTEM_CONFIG}" ]]; then
  sudo cp "${LABWC_SYSTEM_CONFIG}" "${LABWC_SYSTEM_CONFIG}.backup"
  echo "Backed up: ${LABWC_SYSTEM_CONFIG}.backup"
else
  echo "No system config found — skipping backup."
fi

# Backup user config if it has real content
if [[ -f "${LABWC_USER_CONFIG}" ]] && grep -q "<keybind" "${LABWC_USER_CONFIG}"; then
  sudo cp "${LABWC_USER_CONFIG}" "${LABWC_USER_CONFIG}.backup"
  echo "Backed up: ${LABWC_USER_CONFIG}.backup"
else
  echo "No user config found — skipping backup."
fi

# Start from system config if user config is essentially empty
if [[ ! -s "${LABWC_USER_CONFIG}" ]] || ! grep -q "<keybind" "${LABWC_USER_CONFIG}"; then
  echo "User config is empty — starting from system config."
  sudo cp "${LABWC_SYSTEM_CONFIG}" "${LABWC_USER_CONFIG}"
else
  echo "User config already has content — preserving existing config."
fi

sudo python3 "${SCRIPT_DIR}/remove-keybinds.py" "${LABWC_SYSTEM_CONFIG}" "${LABWC_USER_CONFIG}"

sudo chown "${KIOSK_USER}:${KIOSK_USER}" "${LABWC_USER_CONFIG}"

# Install Chromium kiosk policy
# Reconfigure to your needs by modifying the JSON written below
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
echo ""
echo "Installed: ${CHROMIUM_POLICY_DIR}/kiosk.json"
echo ""

echo ""
echo "Setup complete!"
echo ""
echo "Starting the new services..."
sudo systemctl start cs-library-kiosk-app.service
sudo systemctl start cs-library-kiosk-browser.service
echo ""
echo "Rebooting..."
echo "Press Ctrl+C within 15 seconds to cancel the reboot."
echo ""
REBOOT_DELAY=15
for i in $(seq "${REBOOT_DELAY}" -1 1); do
  echo -ne "\rRebooting in ${i} seconds...   "
  sleep 1
done
echo ""
echo "Rebooting..."
sudo systemd-run --on-active=5 /sbin/reboot
pkill -SIGUSR1 labwc 2>/dev/null || true