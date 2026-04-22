#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${SSH_CLIENT:-}" && -z "${SSH_TTY:-}" ]]; then
  echo "CAUTION: DESKTOP ENVIRONMENT DETECTED"
  echo "  You are running this script via the desktop, not over SSH."
  echo "  Your session from the desktop will be interrupted during uninstallation."
  echo "  It is recommended to run this script over SSH instead."
  echo "  After the uninstallation is complete, you have to login again."
  echo ""
  read -r -p "Continue anyway? [y/N]: " DESKTOP_CONFIRM
  if [[ ! "${DESKTOP_CONFIRM}" =~ ^[Yy]$ ]]; then
    echo "Exiting..."
    exit 0
  fi
  echo ""
fi

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
echo "/etc/systemd/system/${APP_SERVICE}"
echo "/etc/systemd/system/${BROWSER_SERVICE}"
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
  echo "Restored: ${LABWC_SYSTEM_CONFIG}"
else
  echo "No system config backup found — already restored or never modified."
fi

if [[ -f "${LABWC_USER_CONFIG}.backup" ]]; then
  cp "${LABWC_USER_CONFIG}.backup" "${LABWC_USER_CONFIG}"
  rm -f "${LABWC_USER_CONFIG}.backup"
  echo "Restored: ${LABWC_USER_CONFIG}"
else
  echo "No user config backup found — already restored or never modified."
fi

pkill -SIGUSR1 labwc 2>/dev/null || true
echo "labwc config reloaded."
echo ""

# Remove Chromium kiosk policy
echo "Removing Chromium kiosk policy..."
if [[ -f "/etc/chromium/policies/managed/kiosk.json" ]]; then
  sudo rm -f "/etc/chromium/policies/managed/kiosk.json"
  echo "Removed:"
  echo "/etc/chromium/policies/managed/kiosk.json"
else
  echo "Policy not found — already removed or never installed."
fi
echo ""

echo ""
echo "Uninstallation complete! The kiosk services will no longer start on boot."
echo "Keyboard shortcuts have been restored."
echo ""
read -r -p "Reboot now? [y/N]: " REBOOT_CONFIRM
if [[ "${REBOOT_CONFIRM}" =~ ^[Yy]$ ]]; then
  echo "Rebooting..."
  sudo reboot
else
  echo "Reboot skipped. Some changes may not take full effect until you reboot."
fi
echo ""
