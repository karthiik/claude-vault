#!/bin/bash

# ============================================
# Vision Dashboard — Uninstall
# ============================================

PLIST_NAME="com.karthik.vision-dashboard"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

echo "Stopping Vision Dashboard..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true

echo "Removing LaunchAgent..."
rm -f "$PLIST_PATH"

echo "✅ Vision Dashboard uninstalled"
echo "   (Files remain in the Webapp folder)"
