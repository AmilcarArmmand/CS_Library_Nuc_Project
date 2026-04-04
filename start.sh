#!/bin/bash
# start.sh
# CS Library web server for the virtual machine.
# Run with: chmod +x start.sh then ./start.sh

set -e  # exit immediately if any command fails

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "CS Library — Web Server"
echo "========================"

# Check Node.js is available
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Install it with:"
    echo "  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "  source ~/.bashrc"
    echo "  nvm install --lts"
    exit 1
fi

echo "Node  : $(node -v)"
echo "npm   : $(npm -v)"
echo ""

# Load nvm if available (needed on some Linux setups)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Check .env exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found."
    echo "  Copy .env.example to .env and fill in your values."
    echo "  Use the following command: cp .env.example .env"
    exit 1
fi

# Build TypeScript
echo "Building..."
npm run build

echo ""
echo "Starting server..."
echo ""

npm start