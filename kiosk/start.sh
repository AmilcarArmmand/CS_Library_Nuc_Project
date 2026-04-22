#!/bin/bash
# start.sh
# CS Library kiosk app for the Raspberry Pi.
# Run with: chmod +x start.sh then ./start.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
KIOSK_DIR="$PROJECT_DIR"
cd "$KIOSK_DIR"

echo ""
echo "CS Library — Kiosk"
echo "==================="

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Check Node.js is available
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Install it with:"
    echo "curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "source ~/.bashrc"
    echo "nvm install --lts"
    exit 1
fi

echo "Node  : $(node -v)"
echo "npm   : $(npm -v)"
echo ""

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Check .env exists
if [ ! -f ".env" ]; then
    echo "ERROR: kiosk/.env file not found."
    echo "Copy kiosk/.env.example to kiosk/.env and fill in your values."
    echo "Use the following command:"
    echo "cp .env.example .env"
    exit 1
fi

# Show what server it will connect to
CLOUD_HOST=$(grep "^CLOUD_HOST=" .env | cut -d '=' -f2)
CLOUD_PORT=$(grep "^CLOUD_PORT=" .env | cut -d '=' -f2)
CLOUD_PROTOCOL=$(grep "^CLOUD_PROTOCOL=" .env | cut -d '=' -f2)
KIOSK_PORT=$(grep "^KIOSK_PORT=" .env | cut -d '=' -f2)
echo "You are connected to..."
echo "Cloud server : ${CLOUD_PROTOCOL:-http}://${CLOUD_HOST:-not set}:${CLOUD_PORT:-8080}"
echo "Kiosk UI     : http://localhost:${KIOSK_PORT:-3000}"
echo ""

# Build TypeScript
echo "Building..."
npm run build

echo ""
echo "Starting kiosk..."
echo ""

npm start