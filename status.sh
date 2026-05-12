#!/bin/bash
# status.sh
# Shows whether the web server is running
# and prints the last 10 lines of its log.
# Run from /opt/app with: ./status.sh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "CS Library — Status"
echo "===================="
echo ""

# Check port 8080 (web server)
if fuser 8080/tcp &>/dev/null; then
    echo "  ✅ Web server   — RUNNING on port 8080"
else
    echo "  ❌ Web server   — NOT running"
fi

echo ""

# PM2 overview, if available
if command -v pm2 &>/dev/null; then
    echo "── PM2 process list ─────────────────────────────────────────"
    pm2 ls --no-color || true
    echo ""
fi

# Recent web server logs
if command -v pm2 &>/dev/null && pm2 describe cs-library-web >/dev/null 2>&1; then
    echo "── Web server log (last 10 lines) ──────────────────────────"
    pm2 logs cs-library-web --lines 10 --nostream 2>/dev/null || true
    echo ""
elif [ -f "web.log" ]; then
    echo "── Web server log (last 10 lines) ──────────────────────────"
    tail -n 10 web.log
    echo ""
fi