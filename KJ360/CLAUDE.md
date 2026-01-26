# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KJ360 is a personal life dashboard integrating Obsidian vaults, Things 3, and macOS Calendar. Uses the "Full Circle" life areas framework (Health, Relationships, Career, Finances, Learning, Joy, Home, Contribution).

**Platform:** macOS only (requires Things 3 + icalBuddy)

## Development Commands

```bash
# Start both servers (recommended)
./kj360.sh --dev

# Or manually:
cd server && npm run dev     # Backend on :3600
cd app && npm run dev        # Frontend on :5173

# Production build
cd app && npm run build
cd ../server && NODE_ENV=production node server.js
```

## Architecture

**Frontend** (`app/`): React 18 + Vite + Tailwind + React Router
- Views are lazy-loaded via `React.lazy()` for code splitting
- API calls go through `lib/api.js`
- Dark mode via Tailwind class strategy

**Backend** (`server/`): Express serving REST API
- Routes in `routes/` (tasks, calendar, skill, vault, etc.)
- Services in `services/` (agent runner, Claude integration)
- Config in `config/vault.config.js` (git-ignored, copy from `.example.js`)

**Key endpoints:**
- `GET /api/tasks/today` - Things 3 + vault tasks
- `GET /api/calendar/today` - Calendar via icalBuddy
- `POST /api/skill/invoke/:name` - Execute Claude skill
- `GET /api/smart-now` - AI-prioritized tasks

**Dev proxy:** Vite forwards `/api/*` to localhost:3600

## Configuration

`server/config/vault.config.js` defines:
- PARA folder paths (inbox, projects, areas, daily)
- Daily note structure (flat vs nested)
- Things 3 area mappings
- Server port (default 3600)
