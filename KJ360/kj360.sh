#!/bin/bash
# KJ360 Life Command Center - Launcher Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   🌟 KJ360 Life Command Center                        ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Parse arguments
DEV_MODE=false
NO_BROWSER=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dev) DEV_MODE=true ;;
        --no-browser) NO_BROWSER=true ;;
        --help)
            echo "Usage: ./kj360.sh [options]"
            echo ""
            echo "Options:"
            echo "  --dev         Run in development mode (hot reload)"
            echo "  --no-browser  Don't open browser automatically"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
    shift
done

# Check for dependencies
check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        exit 1
    fi
}

check_dependency node
check_dependency npm

# Install dependencies if needed
echo -e "${YELLOW}Checking dependencies...${NC}"

if [ ! -d "$SCRIPT_DIR/server/node_modules" ]; then
    echo -e "${YELLOW}Installing server dependencies...${NC}"
    cd "$SCRIPT_DIR/server" && npm install
fi

if [ ! -d "$SCRIPT_DIR/app/node_modules" ]; then
    echo -e "${YELLOW}Installing app dependencies...${NC}"
    cd "$SCRIPT_DIR/app" && npm install
fi

cd "$SCRIPT_DIR"

# Start the server
echo -e "${GREEN}Starting KJ360 server...${NC}"

if [ "$DEV_MODE" = true ]; then
    # Development mode: Run both with hot reload
    echo -e "${BLUE}Running in development mode${NC}"

    # Start server in background
    cd "$SCRIPT_DIR/server" && npm run dev &
    SERVER_PID=$!

    # Wait for server to start
    sleep 2

    # Start Vite dev server
    cd "$SCRIPT_DIR/app" && npm run dev &
    VITE_PID=$!

    # Open browser
    if [ "$NO_BROWSER" = false ]; then
        sleep 2
        open "http://localhost:5173"
    fi

    echo -e "${GREEN}✓ Development servers running${NC}"
    echo "  - API: http://localhost:3600"
    echo "  - App: http://localhost:5173"
    echo ""
    echo "Press Ctrl+C to stop"

    # Cleanup on exit
    trap "kill $SERVER_PID $VITE_PID 2>/dev/null; exit 0" INT TERM

    # Wait for processes
    wait
else
    # Production mode: Serve built app from Express
    echo -e "${BLUE}Running in production mode${NC}"

    # Build the app if dist doesn't exist
    if [ ! -d "$SCRIPT_DIR/app/dist" ]; then
        echo -e "${YELLOW}Building React app...${NC}"
        cd "$SCRIPT_DIR/app" && npm run build
    fi

    # Start server
    cd "$SCRIPT_DIR/server"
    NODE_ENV=production node server.js &
    SERVER_PID=$!

    # Open browser
    if [ "$NO_BROWSER" = false ]; then
        sleep 2
        open "http://localhost:3600"
    fi

    echo -e "${GREEN}✓ KJ360 running at http://localhost:3600${NC}"
    echo ""
    echo "Press Ctrl+C to stop"

    # Cleanup on exit
    trap "kill $SERVER_PID 2>/dev/null; exit 0" INT TERM

    wait
fi
