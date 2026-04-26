#!/usr/bin/env bash

set -euo pipefail

echo "WARNING: This script will automatically reboot the system when complete."
echo "  Any unsaved work will be lost. Make sure you are ready before continuing."
echo ""
read -r -p "Continue? [y/N]: " UNINSTALL_CONFIRM
if [[ ! "${UNINSTALL_CONFIRM}" =~ ^[Yy]$ ]]; then
  echo "Exiting..."
  exit 0
fi
echo ""

APP_SERVICE="cs-library-kiosk-app.service"
BROWSER_SERVICE="cs-library-kiosk-browser.service"

# Restore labwc rc.xml from backups
# Please create the kiosk user and set up the app directory before running this script.
KIOSK_USER="kiosk"
KIOSK_HOME="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
LABWC_USER_CONFIG="${KIOSK_HOME}/.config/labwc/rc.xml"
LABWC_SYSTEM_CONFIG="/etc/xdg/labwc/rc.xml"

echo ""
echo "Kiosk User: ${KIOSK_USER}"
echo "Kiosk Home: ${KIOSK_HOME}"
echo "Labwc User Config: ${LABWC_USER_CONFIG}"
echo "Labwc System Config: ${LABWC_SYSTEM_CONFIG}"
echo ""

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

echo "Restoring labwc config..."

if [[ -f "${LABWC_SYSTEM_CONFIG}.backup" ]]; then
  sudo cp "${LABWC_SYSTEM_CONFIG}.backup" "${LABWC_SYSTEM_CONFIG}"
  sudo rm -f "${LABWC_SYSTEM_CONFIG}.backup"
  echo "Restored: ${LABWC_SYSTEM_CONFIG}"
else
  echo "No system config backup found — already restored or never modified."
fi

if [[ -f "${LABWC_USER_CONFIG}.backup" ]]; then
  sudo cp "${LABWC_USER_CONFIG}.backup" "${LABWC_USER_CONFIG}"
  sudo rm -f "${LABWC_USER_CONFIG}.backup"
  echo "Restored: ${LABWC_USER_CONFIG}"
elif [[ -f "${LABWC_USER_CONFIG}" ]]; then
  sudo rm -f "${LABWC_USER_CONFIG}"
  echo "No backup found — removed user config, labwc will fall back to system default."
else
  echo "No user config found — nothing to restore."
fi

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

# Safety cleanup — remove any leftover user config that wasn't caught above
if [[ -f "${LABWC_USER_CONFIG}" ]]; then
  sudo rm "${LABWC_USER_CONFIG}"
  echo "Cleaned up leftover user config: ${LABWC_USER_CONFIG}"
fi

echo ""
echo "Uninstallation complete! The kiosk services will no longer start on boot."
echo "Keyboard shortcuts have been restored."
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
pkill -f "chromium.*--kiosk" 2>/dev/null || true ; pkill -SIGUSR1 labwc 2>/dev/null || true
