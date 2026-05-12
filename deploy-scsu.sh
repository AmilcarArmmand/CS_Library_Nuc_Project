#!/bin/bash
# deploy-scsu.sh
# SCSU VM deploy helper.
#
# Run on the server with:
#   cd /opt/app
#   ./deploy-scsu.sh
#
# What it does:
#   1. Pulls the latest main branch into /opt/app/CS_Library_Nuc_Project.
#   2. Syncs that clone into the live /opt/app folder without overwriting .env files.
#   3. Builds the web app.
#   4. Uses PM2 to start or restart the web service.
#   5. Waits until the app answers before reporting success.

set -euo pipefail

LIVE_DIR="/opt/app"
REPO_DIR="$LIVE_DIR/CS_Library_Nuc_Project"
BRANCH="${BRANCH:-main}"
WEB_URL="http://localhost:8080/auth/login"

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
  --exclude "node_modules/" \
  --exclude "dist/" \
  --exclude "web.log" \
  --exclude ".web.pid" \
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

echo "Building web app..."
npm install --silent
npm run build
echo "  OK: Web app built"
echo ""

echo "Restarting service with PM2..."
pm2 startOrRestart "$LIVE_DIR/ecosystem.config.cjs" --update-env
pm2 save >/dev/null
echo "  OK: PM2 service refreshed"
echo ""

echo "Waiting for web app..."
for _ in $(seq 1 30); do
  if curl -fsS "$WEB_URL" >/dev/null 2>&1; then
    echo "  OK: Web app is responding at $WEB_URL"
    break
  fi
  sleep 1
done

if ! curl -fsS "$WEB_URL" >/dev/null 2>&1; then
  echo "ERROR: Web app did not respond at $WEB_URL"
  echo "Last 40 PM2 log lines:"
  pm2 logs cs-library-web --lines 40 --nostream 2>/dev/null || true
  exit 1
fi

echo ""
echo "Deploy complete."
echo ""
echo "Web app : http://localhost:8080"
echo ""
echo "Useful commands:"
echo "  ./status.sh"
echo "  pm2 logs cs-library-web"
echo "  ./stop.sh"