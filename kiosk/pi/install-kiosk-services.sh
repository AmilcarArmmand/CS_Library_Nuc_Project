#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KIOSK_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
KIOSK_USER="${SUDO_USER:-$(id -un)}"
KIOSK_HOME="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"

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
echo "Start them with:"
echo "  sudo systemctl start cs-library-kiosk-app.service"
echo "  sudo systemctl start cs-library-kiosk-browser.service"
echo ""
echo "Or reboot the Pi after confirming kiosk/.env is correct."
