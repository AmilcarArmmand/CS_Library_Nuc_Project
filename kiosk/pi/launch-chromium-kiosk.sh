#!/usr/bin/env bash

set -euo pipefail

KIOSK_URL="${KIOSK_URL:-http://localhost:${KIOSK_PORT:-3000}/}"
WAIT_TIMEOUT_SECONDS="${WAIT_TIMEOUT_SECONDS:-60}"
DISPLAY="${DISPLAY:-:0}"
XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"

export DISPLAY
export XAUTHORITY

find_chromium() {
  command -v chromium-browser 2>/dev/null ||
  command -v chromium 2>/dev/null ||
  command -v google-chrome 2>/dev/null ||
  command -v google-chrome-stable 2>/dev/null
}

CHROMIUM_BIN="$(find_chromium || true)"
if [[ -z "${CHROMIUM_BIN}" ]]; then
  echo "Chromium was not found. Install chromium-browser or chromium on the Pi."
  exit 1
fi

if command -v xset >/dev/null 2>&1; then
  xset s off || true
  xset -dpms || true
  xset s noblank || true
fi

if command -v unclutter >/dev/null 2>&1; then
  pkill unclutter >/dev/null 2>&1 || true
  unclutter -idle 0.5 -root >/dev/null 2>&1 &
fi

if command -v pkill >/dev/null 2>&1; then
  pkill -f "${CHROMIUM_BIN}.*--kiosk" >/dev/null 2>&1 || true
fi

echo "Waiting for kiosk UI at ${KIOSK_URL}"
for (( attempt=0; attempt<WAIT_TIMEOUT_SECONDS; attempt++ )); do
  if curl --silent --fail --max-time 2 "${KIOSK_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl --silent --fail --max-time 2 "${KIOSK_URL}" >/dev/null 2>&1; then
  echo "Kiosk UI did not become available within ${WAIT_TIMEOUT_SECONDS}s."
  exit 1
fi

echo "Launching Chromium kiosk at ${KIOSK_URL}"
while true; do
  "${CHROMIUM_BIN}" \
    --kiosk="${KIOSK_URL}" \
    --app="${KIOSK_URL}" \
    --incognito \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-component-update \
    --disable-features=Translate,MediaRouter,OptimizationHints,AutofillServerCommunication \
    --overscroll-history-navigation=0 \
    --check-for-update-interval=31536000 \
    --disk-cache-dir=/dev/null \
    --password-store=basic \
    --autoplay-policy=no-user-gesture-required \
    --touch-events=enabled \
    --start-fullscreen

  sleep 2
done
