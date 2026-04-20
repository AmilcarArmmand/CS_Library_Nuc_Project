#!/bin/bash
# deploy-scsu.sh
# This script is made for the web space that we have.
# Builds and restarts both the web server and kiosk app.
# Run from /opt/app with: ./deploy-scsu.sh
#
# Logs are written to:
#   /opt/app/web.log
#   /opt/app/kiosk.log

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "CS Library — Deploy"
echo "===================="

# Load .env
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found."
    exit 1
fi

echo "Node  : $(node -v)"
echo "npm   : $(npm -v)"
echo ""

# .env file check
if [ ! -f ".env" ]; then
    echo "ERROR: /opt/app/.env not found."
    echo "  Copy .env.example to .env and fill in your values."
    exit 1
fi

if [ ! -f "kiosk/.env" ]; then
    echo "ERROR: /opt/app/kiosk/.env not found."
    echo "  Copy kiosk/.env.example to kiosk/.env and fill in your values."
    exit 1
fi

# Build the web server
echo "Building web server..."
npm install --silent
npm run build
echo "  ✓ Web server built"
echo ""

# Build the kisok server (this is for demonstrational purposes — in a real setup you might build this separately and deploy it as static files)
echo "Building kiosk..."
cd kiosk
npm install --silent
npm run build
cd "$PROJECT_DIR"
echo "  ✓ Kiosk built"
echo ""

# Stop existing processes. Kill whatever is on port 8080 and 8081 — ignore errors if nothing is running
echo "Stopping existing processes..."


fuser -k 8080/tcp 2>/dev/null && echo "  ✓ Stopped port 8080" || echo "  — Port 8080 was not in use"
fuser -k 8081/tcp 2>/dev/null && echo "  ✓ Stopped port 8081" || echo "  — Port 8081 was not in use"

# Brief pause to let ports fully release
sleep 2
echo ""

# Start the web server
echo "Starting web server..."
nohup npm start > web.log 2>&1 &
WEB_PID=$!
echo "  ✓ Web server started (PID: $WEB_PID)"

# Start the kiosk server
echo "Starting kiosk..."
cd kiosk
nohup npm start > ../kiosk.log 2>&1 &
KIOSK_PID=$!
cd "$PROJECT_DIR"
echo "  ✓ Kiosk started (PID: $KIOSK_PID)"

# Save PIDs so you can check or stop them later
echo "$WEB_PID"   > .web.pid
echo "$KIOSK_PID" > .kiosk.pid

echo ""
echo "✅ Deploy complete."
echo ""
echo "   Web server : http://0.0.0.0:8080  (log: web.log)"
echo "   Kiosk      : http://0.0.0.0:8081  (log: kiosk.log)"
echo ""
echo "   Useful commands:"
echo "   tail -f web.log       — live web server logs"
echo "   tail -f kiosk.log     — live kiosk logs"
echo "   ./stop.sh             — stop both processes"
echo "   ./status.sh           — check status of both processes"
echo ""