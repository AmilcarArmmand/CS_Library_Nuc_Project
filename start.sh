#!/bin/bash
# start.sh
# Starts or refreshes both SCSU services with PM2.
# Run from /opt/app with: ./start.sh

set -e  # exit immediately if any command fails

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "CS Library — Start"
echo "=================="

# Load nvm if available (needed on some Linux setups)
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

if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing globally..."
    npm install -g pm2
    echo ""
fi

if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found."
    echo "Copy .env.example to .env and fill in your values."
    exit 1
fi

if [ ! -f "kiosk/.env" ]; then
    echo "ERROR: kiosk/.env file not found."
    exit 1
fi

echo "Building web app..."
npm install --silent
npm run build
echo ""

echo "Building kiosk app..."
cd "$PROJECT_DIR/kiosk"
npm install --silent
npm run build
cd "$PROJECT_DIR"
echo ""

echo "Starting services with PM2..."
pm2 startOrRestart "$PROJECT_DIR/ecosystem.config.cjs" --update-env
pm2 save >/dev/null

echo ""
echo "✅ PM2 services started."
echo ""
./status.sh
