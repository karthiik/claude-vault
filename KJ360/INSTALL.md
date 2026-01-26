# KJ360 Installation Guide

## Quick Install (5 minutes)

### Prerequisites
- macOS (for Things 3 and Calendar integration)
- Node.js 18+ (`brew install node`)
- icalBuddy (`brew install ical-buddy`)
- Things 3 app installed

### Step 1: Copy to Your Vault

```bash
# Replace YOUR_VAULT_PATH with your Obsidian vault location
cd YOUR_VAULT_PATH

# Clone or copy the KJ360 folder
cp -r /path/to/KJ360 .
```

Your vault should look like:
```
your-vault/
├── 0-Inbox/          # or your inbox folder
├── 1-Projects/       # or your projects folder
├── 2-Areas/          # or your areas folder
├── Daily/            # or your daily notes folder
└── KJ360/            # ← the app lives here
    ├── app/          # React frontend
    └── server/       # Node backend
```

### Step 2: Configure for Your Vault

Edit `KJ360/server/config/vault.config.js`:

```javascript
export default {
  // Match YOUR folder names
  folders: {
    inbox: '0-Inbox',        // Change if different
    projects: '1-Projects',   // Change if different
    areas: '2-Areas',         // Change if different
    daily: 'Daily'            // Change if different
  },

  // Your daily note format
  dailyNotes: {
    structure: 'flat',        // 'flat' or 'nested'
    dateFormat: 'yyyy-MM-dd'
  },

  // Map your Things 3 areas to life areas
  thingsMapping: {
    'Work': 'career',
    'Personal': 'relationships',
    // Add your mappings...
  }
}
```

### Step 3: Install & Run

```bash
# Install backend dependencies
cd KJ360/server
npm install

# Install frontend dependencies
cd ../app
npm install

# Start the server (from server folder)
cd ../server
node server.js

# In another terminal, start the frontend
cd ../app
npm run dev
```

### Step 4: Open the App

Visit: http://localhost:5173

---

## Folder Structure Requirements

The app expects these folders (names configurable):

| Purpose | Default Name | Required? |
|---------|--------------|-----------|
| Inbox | `0-Inbox` | Optional |
| Projects | `1-Projects` | **Yes** - scanned for tasks |
| Areas | `2-Areas` | Optional |
| Daily Notes | `Daily` | **Yes** - scanned for tasks |
| Archive | `4-Archive` | Optional |

---

## Troubleshooting

### "Cannot find module" error
```bash
cd KJ360/server && npm install
cd ../app && npm install
```

### Things 3 tasks not showing
- Make sure Things 3 is running
- Check you have tasks in the "Today" list
- The app uses AppleScript - only works on macOS

### Calendar not working
```bash
# Install icalBuddy
brew install ical-buddy

# Test it works
icalBuddy eventsToday
```

### Port already in use
```bash
# Use a different port
PORT=3700 node server.js
```

---

## Updating

To pull updates while keeping your config:

```bash
cd KJ360

# Save your config
cp server/config/vault.config.js ~/vault.config.backup.js

# Pull updates (if using git)
git pull

# Restore your config
cp ~/vault.config.backup.js server/config/vault.config.js
```
