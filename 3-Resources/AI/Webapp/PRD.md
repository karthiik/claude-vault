# KJ360 Life Command Center — Product Requirements Document

**Project:** KJ360 - Personal Life Dashboard
**Status:** Active Development (MVP Complete)
**Created:** 2026-01-18
**Last Updated:** 2026-01-26

---

## Overview

KJ360 is a personal life command center that integrates with an Obsidian vault, Things 3, and Apple Calendar to provide a unified dashboard for managing life across 8 key areas. It features AI-powered insights, task triage workflows, and a holistic "Full Circle" view of life balance.

---

## Core Features

### 1. Full Circle Dashboard ✅ (NEW)

The flagship feature showing life balance across 8 areas from Jamie's Full Circle framework.

| Feature | Status | Description |
|---------|--------|-------------|
| 8 Life Area Cards | ✅ | Health, Relationships, Career, Finances, Learning, Joy, Home, Legacy |
| Per-Area Colors | ✅ | Consistent color system (emerald, amber, blue, green, purple, pink, cyan, orange) |
| Area Status Indicators | ✅ | 🟢 Active, 🟡 Warning, 🔴 Neglected based on activity thresholds |
| AI-Generated Insights | ✅ | Contextual insights per area with caching |
| Balance Pulse Visualization | ✅ | Horizontal bar chart showing distribution across areas |
| Timeline Widget | ✅ | Upcoming milestones from 2026 Timeline |
| Morning/Afternoon/Evening Modes | ✅ | Auto-detects or manual toggle, adjusts insight prompts |
| Task Surfacing | ✅ | Shows vault tasks per area with deduplication against Things 3 |
| Inline Triage | ✅ | Done, Today, Schedule, Someday actions from cards |
| Mobile Swipe Gestures | ✅ | Swipe right → Today, Swipe left → Schedule |
| Pull-to-Refresh | ✅ | Mobile gesture to refresh data |

**Life Areas with Colors:**
| Area | Emoji | Color | Hex |
|------|-------|-------|-----|
| Health – Mind, Body & Spirit | 🏃 | Emerald | `#10B981` |
| Relationships & Social Life | 💛 | Amber | `#F59E0B` |
| Career & Purpose | 🚀 | Blue | `#3B82F6` |
| Finances & Security | 💰 | Green | `#22C55E` |
| Education & Learning | 📚 | Purple | `#8B5CF6` |
| Joy, Creativity & Play | 🎨 | Pink | `#EC4899` |
| Home & Environment | 🏠 | Cyan | `#06B6D4` |
| Contribution & Legacy | 🌟 | Orange | `#F97316` |

**Data Sources:**
- `3-Resources/Life/Full Circle Areas.md` - Area definitions, intentions, timeline
- Daily notes - Activity detection via tags
- Vault projects - Task counts and deadlines
- Things 3 - Deduplication and sync

---

### 2. SmartNow (Focus View) ✅

Execution-focused task list powered by the Now Algorithm.

| Feature | Status | Description |
|---------|--------|-------------|
| Now Algorithm | ✅ | Overdue + Today + Top 3 from ranked inbox |
| Things 3 Integration | ✅ | Reads Today list, syncs completions |
| Vault Task Surfacing | ✅ | Finds unchecked tasks from Daily notes and Projects |
| Smart Deduplication | ✅ | Levenshtein distance matching to avoid duplicates |
| Energy Filtering | ✅ | Deep Work 🧠, Creative ✨, Quick Wins ⚡ |
| Triage Workflow | ✅ | Send to Things, mark complete, schedule |
| Schedule Modal | ✅ | When options, project picker, deadline |
| Timeline Section | ✅ | Today's calendar events |

---

### 3. Claude Agent Sidebar (The Star) ✅

AI assistant sidebar powered by Claude Code subprocess.

| Feature | Status | Description |
|---------|--------|-------------|
| Floating Action Button | ✅ | Bottom-right star icon |
| Resizable Sidebar | ✅ | Draggable width (320-800px) |
| Chat Interface | ✅ | Real-time streaming responses |
| Session Persistence | ✅ | Context preserved across messages |
| Skills System | ✅ | Invoke skills via tab or chat |
| Quick Capture | ✅ | Fast thought capture input |

**Available Skills:**
| Skill | Shortcut | Description |
|-------|----------|-------------|
| Morning Brief | ⌘M | Tactical daily brief with calendar, tasks, focus |
| Weekly Review | ⌘W | Reflective analysis of patterns and balance |
| Focus Now | ⌘N | What to work on based on time and energy |
| Quick Capture | ⌘K | Capture a thought, task, or idea |
| Triage Inbox | ⌘T | Process inbox items and uncategorized tasks |

---

### 4. Vision Dashboard ✅

Original feature - viewing and editing vision documents.

| Feature | Status | Description |
|---------|--------|-------------|
| Vision Tabs | ✅ | Karthik's 2026 Vision, Jamie's Vision |
| Markdown Rendering | ✅ | Dark theme styled display |
| Split Editor | ✅ | Rendered left, markdown editor right |
| Auto-Save | ✅ | Debounced save to vault |
| File Browser | ✅ | Full vault folder tree |
| Today's Note | ✅ | Quick access button with template |
| Recent Files | ✅ | Recently opened files list |

---

### 5. Task Management ✅

Core task operations across vault and Things 3.

| Feature | Status | Description |
|---------|--------|-------------|
| Complete Task | ✅ | Marks `- [ ]` as `- [x]` in vault |
| Send to Things 3 | ✅ | AppleScript integration |
| Mark Triaged | ✅ | Appends `➡️ Things` to task |
| Project Selection | ✅ | Fetches Things 3 project list |
| When Scheduling | ✅ | Today, Tomorrow, Weekend, Next Week, Someday |
| Deadline Setting | ✅ | Date picker for due dates |

---

### 6. Calendar Integration ✅

Apple Calendar events display.

| Feature | Status | Description |
|---------|--------|-------------|
| Today's Events | ✅ | Fetched via AppleScript |
| Event Cards | ✅ | Time, title, location display |
| Upcoming View | ✅ | Next 7 days overview |

---

## Technical Architecture

### Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Markdown | gray-matter, marked |
| Testing | Node.js built-in test runner |

### API Endpoints

**Full Circle:**
```
GET  /api/fullcircle              - Dashboard data with areas, pulse, timeline
GET  /api/fullcircle/area/:id/tasks - Tasks for specific area
POST /api/fullcircle/refresh-insights - Refresh AI insights
```

**Tasks:**
```
GET  /api/tasks/today             - Things 3 today list
GET  /api/tasks/things-projects   - Things 3 project list
POST /api/tasks/complete          - Mark task complete in vault
POST /api/tasks/send-to-things    - Create task in Things 3
POST /api/tasks/mark-triaged      - Mark task as triaged in vault
```

**Skills:**
```
GET  /api/skill/list              - Available skills
POST /api/skill/invoke/:name      - Run a skill
GET  /api/skill/brief/latest      - Latest generated brief
```

**Other:**
```
GET  /api/health                  - Server health check
GET  /api/calendar/today          - Today's calendar events
GET  /api/files/*                 - Vault file operations
```

### Services

| Service | Purpose |
|---------|---------|
| areasParser.js | Parses Full Circle Areas.md for definitions and timeline |
| metricsCalculator.js | Calculates area-specific metrics from vault data |
| insightGenerator.js | Generates AI insights with caching |
| taskService.js | Shared task fetching with deduplication |

### File Structure

```
KJ360/
├── app/                    # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── AreaCard.jsx
│   │   │   ├── FullCirclePulse.jsx
│   │   │   ├── TimelineWidget.jsx
│   │   │   ├── TriageActions.jsx
│   │   │   ├── ScheduleModal.jsx
│   │   │   ├── SwipeableTaskItem.jsx
│   │   │   ├── PullToRefresh.jsx
│   │   │   └── StarSidebar.jsx
│   │   ├── constants/
│   │   │   └── areas.js    # Life area definitions with colors
│   │   ├── hooks/
│   │   │   └── useSwipeGesture.js
│   │   └── views/
│   │       ├── Dashboard.jsx
│   │       ├── FullCircleDashboard.jsx
│   │       └── SmartNow.jsx
│   └── tailwind.config.js
├── server/                 # Express backend
│   ├── routes/
│   │   ├── fullcircle.js
│   │   ├── smartnow.js
│   │   └── tasks.js
│   ├── services/
│   │   ├── areasParser.js
│   │   ├── metricsCalculator.js
│   │   ├── insightGenerator.js
│   │   └── taskService.js
│   └── server.js
└── kj360.sh               # Launcher script
```

---

## Design System

### Theme

Dark mode with area-specific accent colors.

| Element | Value |
|---------|-------|
| Background | `#0d1117` → `#161b22` gradient |
| Surface | `#21262d` / `bg-gray-800` |
| Border | `#30363d` / `border-gray-700` |
| Text Primary | `#c9d1d9` / `text-gray-200` |
| Text Secondary | `#8b949e` / `text-gray-400` |
| Accent (KJ) | `#f59e0b` / `kj-primary` (amber) |

### Status Colors

| Status | Emoji | Color |
|--------|-------|-------|
| Active | 🟢 | Green `#22c55e` |
| Warning | 🟡 | Yellow `#eab308` |
| Neglected | 🔴 | Red `#ef4444` |

### Mobile Considerations

- Touch targets minimum 44x44px
- Swipe gestures for task triage
- Pull-to-refresh on scrollable views
- Responsive grid (1 col mobile, 2 col tablet+)

---

## Testing

### Unit Tests

58 tests covering core services:
- areasParser.js - Timeline parsing, event sorting
- metricsCalculator.js - Area metrics, status thresholds
- insightGenerator.js - Strategy selection, caching

Run tests:
```bash
cd KJ360/server && npm test
```

---

## Deployment

### Local Development

```bash
# Start backend
cd KJ360/server && npm run dev

# Start frontend (separate terminal)
cd KJ360/app && npm run dev
```

### Production

```bash
./kj360.sh --start
```

Auto-starts via LaunchAgent on macOS login.

---

## Roadmap

### Completed ✅

- [x] Full Circle Dashboard with 8 life areas
- [x] AI-generated insights per area
- [x] Balance Pulse visualization
- [x] Timeline widget with milestones
- [x] Task triage with Things 3 integration
- [x] Mobile swipe gestures and pull-to-refresh
- [x] Consistent area color system
- [x] Morning/Evening mode toggle
- [x] Claude agent sidebar with skills

### In Progress 🔄

- [ ] E2E testing for full triage flow
- [ ] Performance profiling
- [ ] API response size optimization

### Future Enhancements 📋

- [ ] Habit tracking integration
- [ ] Weekly review automation
- [ ] Push notifications for neglected areas
- [ ] Cloud sync option
- [ ] Widget for macOS menu bar

---

## Source Files

**Vault Integration Points:**
- `3-Resources/Life/Full Circle Areas.md` - Area definitions
- `3-Resources/Life/Me/2026 Vision and Intentions - Karthik.md` - Vision doc
- `Daily/YYYY-MM-DD.md` - Daily notes with activity tags
- `1-Projects/**/*.md` - Project files with tasks

---

**Status:** ✅ MVP Complete - Full Circle Dashboard shipped

*Last updated: 2026-01-26*
