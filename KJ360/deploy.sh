#!/bin/bash
# KJ360 Deployment Script
# Usage: ./deploy.sh /path/to/target/vault

set -e

TARGET_VAULT="$1"

if [ -z "$TARGET_VAULT" ]; then
  echo "Usage: ./deploy.sh /path/to/target/vault"
  echo "Example: ./deploy.sh ~/Documents/MyVault"
  exit 1
fi

# Check target exists
if [ ! -d "$TARGET_VAULT" ]; then
  echo "❌ Target vault not found: $TARGET_VAULT"
  exit 1
fi

echo "🚀 Deploying KJ360 to: $TARGET_VAULT"

# Get script directory (where KJ360 source is)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Copy KJ360 folder
echo "📦 Copying app files..."
if [ -d "$TARGET_VAULT/KJ360" ]; then
  echo "⚠️  KJ360 folder exists. Backing up config..."
  cp "$TARGET_VAULT/KJ360/server/config/vault.config.js" "/tmp/vault.config.backup.js" 2>/dev/null || true
fi

# Copy everything except node_modules
rsync -av --exclude='node_modules' --exclude='.git' "$SCRIPT_DIR/" "$TARGET_VAULT/KJ360/"

# Restore config if it existed
if [ -f "/tmp/vault.config.backup.js" ]; then
  echo "♻️  Restoring your config..."
  cp "/tmp/vault.config.backup.js" "$TARGET_VAULT/KJ360/server/config/vault.config.js"
  rm "/tmp/vault.config.backup.js"
fi

# Install dependencies
echo "📥 Installing dependencies..."
cd "$TARGET_VAULT/KJ360/server" && npm install --silent
cd "$TARGET_VAULT/KJ360/app" && npm install --silent

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Edit config: $TARGET_VAULT/KJ360/server/config/vault.config.js"
echo "  2. Start server: cd $TARGET_VAULT/KJ360/server && node server.js"
echo "  3. Start frontend: cd $TARGET_VAULT/KJ360/app && npm run dev"
echo "  4. Open: http://localhost:5173"
