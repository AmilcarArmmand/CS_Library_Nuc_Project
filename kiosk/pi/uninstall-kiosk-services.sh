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
echo "Done. Services will no longer start on boot."
echo ""