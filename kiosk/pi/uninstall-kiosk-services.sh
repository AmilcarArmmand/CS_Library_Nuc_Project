#!/usr/bin/env bash

set -euo pipefail

APP_SERVICE="cs-library-kiosk-app.service"
BROWSER_SERVICE="cs-library-kiosk-browser.service"

echo ""
echo "Uninstalling CS Library kiosk services..."
echo ""

sudo systemctl stop "${BROWSER_SERVICE}" 2>/dev/null || true
sudo systemctl stop "${APP_SERVICE}" 2>/dev/null || true

sudo systemctl disable "${BROWSER_SERVICE}" 2>/dev/null || true
sudo systemctl disable "${APP_SERVICE}" 2>/dev/null || true

sudo rm -f "/etc/systemd/system/${APP_SERVICE}"
sudo rm -f "/etc/systemd/system/${BROWSER_SERVICE}"

sudo systemctl daemon-reload

echo "Removed:"
echo "  /etc/systemd/system/${APP_SERVICE}"
echo "  /etc/systemd/system/${BROWSER_SERVICE}"
echo ""

# Close Chromium if it's still running
echo "Closing Chromium..."
pkill -f "chromium.*--kiosk" 2>/dev/null || true
echo ""

# Restore labwc rc.xml from backups
KIOSK_USER="${SUDO_USER:-$(id -un)}"
KIOSK_HOME="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
LABWC_USER_CONFIG="${KIOSK_HOME}/.config/labwc/rc.xml"
LABWC_SYSTEM_CONFIG="/etc/xdg/labwc/rc.xml"

echo "Restoring labwc config..."

if [[ -f "${LABWC_SYSTEM_CONFIG}.backup" ]]; then
  sudo cp "${LABWC_SYSTEM_CONFIG}.backup" "${LABWC_SYSTEM_CONFIG}"
  sudo rm -f "${LABWC_SYSTEM_CONFIG}.backup"
  echo "  Restored: ${LABWC_SYSTEM_CONFIG}"
fi

if [[ -f "${LABWC_USER_CONFIG}.backup" ]]; then
  cp "${LABWC_USER_CONFIG}.backup" "${LABWC_USER_CONFIG}"
  rm -f "${LABWC_USER_CONFIG}.backup"
  echo "  Restored: ${LABWC_USER_CONFIG}"
fi

echo ""
echo "Uninstallation complete! The kiosk services will no longer start on boot."
echo "Keyboard shortcuts have been restored."
echo "You may need to log out and back in, or reboot for shortcut changes to take effect."
echo ""
