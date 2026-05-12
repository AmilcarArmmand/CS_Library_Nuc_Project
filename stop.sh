#!/bin/bash
# stop.sh
# Stops the web server.
# Run from /opt/app with: ./stop.sh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "CS Library — Stop"
echo "=================="

if command -v pm2 &>/dev/null; then
    pm2 delete cs-library-web >/dev/null 2>&1 && echo "  ✓ Removed PM2 web process" || echo "  — PM2 web process was not running"
    pm2 save >/dev/null 2>&1 || true
else
    fuser -k 8080/tcp 2>/dev/null && echo "  ✓ Stopped port 8080" || echo "  — Port 8080 was not in use"
fi

rm -f .web.pid

echo ""
echo "✅ All processes stopped."
echo ""