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

fuser -k 8080/tcp 2>/dev/null && echo "  ✓ Stopped port 8080" || echo "  — Port 8080 was not in use"
fuser -k 8081/tcp 2>/dev/null && echo "  ✓ Stopped port 8081" || echo "  — Port 8081 was not in use"

rm -f .web.pid .kiosk.pid

echo ""
echo "✅ All processes stopped."
echo ""