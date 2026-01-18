#!/bin/bash

# ============================================
# Vision Dashboard — Auto-start Setup
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEBAPP_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="com.karthik.vision-dashboard"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

echo "╔═══════════════════════════════════════════════╗"
echo "║    Vision Dashboard — Installation            ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# 1. Install npm dependencies
echo "📦 Installing dependencies..."
cd "$WEBAPP_DIR"
npm install

# 2. Create LaunchAgent plist
echo "⚙️  Setting up auto-start..."

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${WEBAPP_DIR}/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${WEBAPP_DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${WEBAPP_DIR}/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${WEBAPP_DIR}/logs/stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

# 3. Create logs directory
mkdir -p "$WEBAPP_DIR/logs"

# 4. Check for Node.js location
NODE_PATH=$(which node)
echo "📍 Node.js found at: $NODE_PATH"

# Update plist with correct node path
sed -i '' "s|/usr/local/bin/node|$NODE_PATH|g" "$PLIST_PATH"

# 5. Load the LaunchAgent
echo "🚀 Loading LaunchAgent..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo ""
echo "✅ Installation complete!"
echo ""
echo "Dashboard running at: http://localhost:3333"
echo ""
echo "Commands:"
echo "  Stop:    launchctl unload ~/Library/LaunchAgents/${PLIST_NAME}.plist"
echo "  Start:   launchctl load ~/Library/LaunchAgents/${PLIST_NAME}.plist"
echo "  Logs:    tail -f ${WEBAPP_DIR}/logs/stdout.log"
echo ""
