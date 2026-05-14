#!/bin/bash
# For use on a virtual machine to deploy the CS Library web server as a systemd service.
# Run with: chmod +x deploy.sh then ./deploy.sh
#
# After the first run, deploy updates with:
# git pull
# npm run build
# sudo systemctl restart cslibrary

set -e

# Dynamic paths and user info
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_USER="$(whoami)"
START_SCRIPT="$APP_DIR/start.sh"

echo ""
echo "CS Library — Deploy Script"
echo "==========================="
echo ""
echo "App directory : $APP_DIR"
echo "Running as    : $CURRENT_USER"
echo "Start script  : $START_SCRIPT"
echo ""

# Verify start.sh exists
if [ ! -f "$START_SCRIPT" ]; then
  echo "Error: start.sh not found in $APP_DIR"
  exit 1
fi
chmod +x "$START_SCRIPT"
echo "start.sh found"

# Verify .env exists
if [ ! -f "$APP_DIR/.env" ]; then
  echo "Error: .env file not found. Copy .env.example and fill in your values:"
  echo "cp .env.example .env"
  exit 1
fi
echo ".env found"

# Install dependencies
echo ""
echo "▶ Installing dependencies..."
cd "$APP_DIR"
npm install
echo "Dependencies installed!"

# Build TypeScript
echo "Building..."
npm run build

# Create the systemd service file
echo "▶ Creating systemd service..."

SERVICE_FILE="/etc/systemd/system/cslibrary.service"

sudo tee "$SERVICE_FILE" > /dev/null << SERVICEEOF
[Unit]
Description=CS Library Web Server
Documentation=https://github.com/AmilcarArmmand/CS_Library_Nuc_Project
After=network.target postgresql.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$APP_DIR
ExecStart=/bin/bash -c 'source $APP_DIR/.env && node $APP_DIR/dist/app.js'
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cslibrary
EnvironmentFile=$APP_DIR/.env

[Install]
WantedBy=multi-user.target
SERVICEEOF

echo "Service file written to $SERVICE_FILE"

# Enable and start the service
echo "▶ Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable cslibrary
sudo systemctl restart cslibrary

# Wait a moment then verify it came up
sleep 4
echo ""

if sudo systemctl is-active --quiet cslibrary; then
  echo "  ✓ cslibrary service is running"
else
  echo "  ✗ Service failed to start. Check logs with:"
  echo "    sudo journalctl -u cslibrary -n 50"
  exit 1
fi

# Summary
echo ""
echo "Deploy complete!"


echo ""
echo "Useful commands:"
echo "============================================================"
echo "  Check status   → sudo systemctl status cslibrary"
echo "  Live logs      → sudo journalctl -u cslibrary -f"
echo "  Last 50 lines  → sudo journalctl -u cslibrary -n 50"
echo "  Restart        → sudo systemctl restart cslibrary"
echo "  Stop           → sudo systemctl stop cslibrary"
echo ""
echo "To deploy updates after a code change:"
echo "git pull"
echo "npm run build"
echo "sudo systemctl restart cslibrary"
echo ""