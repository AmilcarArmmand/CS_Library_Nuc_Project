#!/bin/bash
# deploy-scsu.sh
# SCSU VM deploy helper.
#
# Run on the server with:
#   cd /opt/app
#   ./deploy-scsu.sh
#
# What it does:
#   1. Pulls the latest reconstruction branch into /opt/app/CS_Library_Nuc_Project.
#   2. Syncs that clone into the live /opt/app folder without overwriting .env files.
#   3. Builds the web app and kiosk app.
#   4. Uses PM2 to start or restart both services.
#   5. Waits until both apps answer before reporting success.

set -euo pipefail

LIVE_DIR="/opt/app"
REPO_DIR="$LIVE_DIR/CS_Library_Nuc_Project"
BRANCH="${BRANCH:-reconstruction}"
WEB_URL="http://localhost:8080/auth/login"
KIOSK_URL="http://localhost:8081/"

cd "$LIVE_DIR"

echo ""
echo "CS Library - SCSU Deploy"
echo "========================"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found."
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "ERROR: rsync not found."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "PM2 not found. Installing globally..."
  npm install -g pm2
fi

echo "Node  : $(node -v)"
echo "npm   : $(npm -v)"
echo ""

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "ERROR: Git checkout not found at $REPO_DIR"
  echo "Clone it once with:"
  echo "  git clone -b $BRANCH https://github.com/AmilcarArmmand/CS_Library_Nuc_Project.git $REPO_DIR"
  exit 1
fi

echo "Pulling latest GitHub changes..."
cd "$REPO_DIR"
git pull --ff-only origin "$BRANCH"
echo "  OK: Git checkout is at $(git rev-parse --short HEAD)"
echo ""

echo "Syncing Git checkout into live app folder..."
rsync -a --delete \
  --exclude ".git/" \
  --exclude ".env" \
  --exclude "kiosk/.env" \
  --exclude "node_modules/" \
  --exclude "kiosk/node_modules/" \
  --exclude "dist/" \
  --exclude "kiosk/dist/" \
  --exclude "web.log" \
  --exclude "kiosk.log" \
  --exclude ".web.pid" \
  --exclude ".kiosk.pid" \
  --exclude "CS_Library_Nuc_Project/" \
  "$REPO_DIR/" "$LIVE_DIR/"
chmod +x "$LIVE_DIR/deploy-scsu.sh" "$LIVE_DIR/status.sh" "$LIVE_DIR/stop.sh" 2>/dev/null || true
echo "  OK: Live app folder synced"
echo ""

cd "$LIVE_DIR"

if [ ! -f ".env" ]; then
  echo "ERROR: $LIVE_DIR/.env not found."
  exit 1
fi

if [ ! -f "kiosk/.env" ]; then
  echo "ERROR: $LIVE_DIR/kiosk/.env not found."
  exit 1
fi

echo "Building web app..."
npm install --silent
npm run build
echo "  OK: Web app built"
echo ""

echo "Building kiosk app..."
cd "$LIVE_DIR/kiosk"
npm install --silent
npm run build
cd "$LIVE_DIR"
echo "  OK: Kiosk app built"
echo ""

echo "Restarting services with PM2..."
pm2 startOrRestart "$LIVE_DIR/ecosystem.config.cjs" --update-env
pm2 save >/dev/null
echo "  OK: PM2 services refreshed"
echo ""

wait_for_url() {
  local name="$1"
  local url="$2"
  local log_file="$3"
  local pm2_name="$4"

  echo "Waiting for $name..."
  for _ in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "  OK: $name is responding at $url"
      return 0
    fi
    sleep 1
  done

  echo "ERROR: $name did not respond at $url"
  if command -v pm2 >/dev/null 2>&1 && pm2 describe "$pm2_name" >/dev/null 2>&1; then
    echo "Last 40 PM2 log lines for $pm2_name:"
    pm2 logs "$pm2_name" --lines 40 --nostream 2>/dev/null || true
  else
    echo "Last 40 lines of $log_file:"
    tail -n 40 "$log_file" 2>/dev/null || true
  fi
  exit 1
}

wait_for_url "web app" "$WEB_URL" "$LIVE_DIR/web.log" "cs-library-web"
wait_for_url "kiosk app" "$KIOSK_URL" "$LIVE_DIR/kiosk.log" "cs-library-kiosk"

echo ""
echo "Deploy complete."
echo ""
echo "Web app : http://localhost:8080"
echo "Kiosk   : http://localhost:8081"
echo ""
echo "Useful commands:"
echo "  ./status.sh"
echo "  pm2 logs cs-library-web"
echo "  pm2 logs cs-library-kiosk"
echo "  ./stop.sh"
