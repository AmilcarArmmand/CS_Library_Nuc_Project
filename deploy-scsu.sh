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
#   4. Restarts ports 8080 and 8081.
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

echo "Stopping existing processes..."
fuser -k 8080/tcp >/dev/null 2>&1 && echo "  OK: Stopped port 8080" || echo "  Port 8080 was not in use"
fuser -k 8081/tcp >/dev/null 2>&1 && echo "  OK: Stopped port 8081" || echo "  Port 8081 was not in use"
sleep 2
echo ""

echo "Starting web app..."
nohup npm start > web.log 2>&1 &
WEB_PID=$!
echo "$WEB_PID" > .web.pid
echo "  OK: Web app started with PID $WEB_PID"

echo "Starting kiosk app..."
cd "$LIVE_DIR/kiosk"
nohup npm start > ../kiosk.log 2>&1 &
KIOSK_PID=$!
cd "$LIVE_DIR"
echo "$KIOSK_PID" > .kiosk.pid
echo "  OK: Kiosk app started with PID $KIOSK_PID"
echo ""

wait_for_url() {
  local name="$1"
  local url="$2"
  local log_file="$3"

  echo "Waiting for $name..."
  for _ in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "  OK: $name is responding at $url"
      return 0
    fi
    sleep 1
  done

  echo "ERROR: $name did not respond at $url"
  echo "Last 40 lines of $log_file:"
  tail -n 40 "$log_file" 2>/dev/null || true
  exit 1
}

wait_for_url "web app" "$WEB_URL" "$LIVE_DIR/web.log"
wait_for_url "kiosk app" "$KIOSK_URL" "$LIVE_DIR/kiosk.log"

echo ""
echo "Deploy complete."
echo ""
echo "Web app : http://localhost:8080"
echo "Kiosk   : http://localhost:8081"
echo ""
echo "Useful commands:"
echo "  ./status.sh"
echo "  tail -f web.log"
echo "  tail -f kiosk.log"
echo "  ./stop.sh"
