#!/bin/bash
# stop.sh
# This script is made for the web space that we have.
# Stops the web server and kiosk app.
# Run from /opt/app with: ./stop.sh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "CS Library — Stop"
echo "=================="

if command -v pm2 &>/dev/null; then
    pm2 delete cs-library-web >/dev/null 2>&1 && echo "  ✓ Removed PM2 web process" || echo "  — PM2 web process was not running"
    pm2 delete cs-library-kiosk >/dev/null 2>&1 && echo "  ✓ Removed PM2 kiosk process" || echo "  — PM2 kiosk process was not running"
    pm2 save >/dev/null 2>&1 || true
else
    fuser -k 8080/tcp 2>/dev/null && echo "  ✓ Stopped port 8080" || echo "  — Port 8080 was not in use"
    fuser -k 8081/tcp 2>/dev/null && echo "  ✓ Stopped port 8081" || echo "  — Port 8081 was not in use"
fi

rm -f .web.pid .kiosk.pid

echo ""
echo "✅ All processes stopped."
echo ""
