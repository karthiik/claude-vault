#!/bin/bash
# KJ360 Morning Dashboard Generator
# Triggered by launchd at 08:30 M-F

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KJ360_DIR="$(dirname "$SCRIPT_DIR")"
VAULT_ROOT="$(dirname "$KJ360_DIR")"

TODAY=$(date +%Y-%m-%d)
DAILY_FILE="$VAULT_ROOT/Daily/$TODAY.md"

echo "[$(date)] Generating morning dashboard..."

# Ensure Daily folder exists
mkdir -p "$VAULT_ROOT/Daily"

# Create daily note if it doesn't exist
if [ ! -f "$DAILY_FILE" ]; then
    cat > "$DAILY_FILE" << EOF
---
date: $TODAY
weather: ""
energy: ""
---

# $(date +"%A, %B %d, %Y")

## Morning Dashboard

*Generating...*

---

## Notes

EOF
fi

# Call the Express API to generate dashboard content
# This allows the Node.js server to do the heavy lifting
DASHBOARD_CONTENT=$(curl -s -X POST http://localhost:3600/api/dashboard/generate 2>/dev/null || echo "Dashboard generation failed. Is the server running?")

# If server isn't running, generate a basic dashboard
if [[ "$DASHBOARD_CONTENT" == *"failed"* ]] || [ -z "$DASHBOARD_CONTENT" ]; then
    echo "[$(date)] Server not available, generating basic dashboard..."

    # Get calendar events via icalBuddy if available
    if command -v icalBuddy &> /dev/null; then
        CALENDAR=$(icalBuddy -nc -nrd -npn -ea -b "• " eventsToday 2>/dev/null || echo "No events")
    else
        CALENDAR="Calendar integration requires icalBuddy"
    fi

    # Count inbox items
    INBOX_COUNT=$(find "$VAULT_ROOT/0-Inbox" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

    DASHBOARD_CONTENT=$(cat << EOF

### 📅 Today's Schedule

$CALENDAR

### 📥 Inbox

$INBOX_COUNT items waiting for processing

### 🎯 Focus Areas

*Run \`/now\` in The Star for prioritized tasks*

### 💬 Nurture Reminders

*Relationship tracking coming soon*

---
*Generated at $(date +"%H:%M")*
EOF
)
fi

# Append dashboard to daily note (replace the generating placeholder)
sed -i '' 's/\*Generating\.\.\.\*//' "$DAILY_FILE" 2>/dev/null || true

# Append content after the Morning Dashboard header
awk -v content="$DASHBOARD_CONTENT" '
/## Morning Dashboard/ {
    print
    print content
    next
}
{ print }
' "$DAILY_FILE" > "$DAILY_FILE.tmp" && mv "$DAILY_FILE.tmp" "$DAILY_FILE"

echo "[$(date)] Dashboard generated: $DAILY_FILE"
