# Vision Dashboard — Product Requirements Document

**Project:** Personal Vision Dashboard
**Status:** Discovery
**Created:** 2026-01-18

---

## Overview

A web-based dashboard for viewing, annotating, and editing personal vision documents from the Obsidian vault.

---

## Core Requirements

### 1. Vision Documents Display ✅

| Requirement | Decision |
|-------------|----------|
| Display Karthik's 2026 Vision | ✅ Yes |
| Display Jamie's 2025 Recap & 2026 Vision | ✅ Yes |
| Tabbed navigation between documents | ✅ Yes — Karthik's tab first (default) |
| Side-by-side layout | ✅ Yes — Dashboard stays visible while editing notes |
| Render markdown with styling | ✅ Custom dark theme (ignore source file styling) |
| Export/Print | ❌ Not needed now |

**Source Files:**
- `3-Resources/Life/Me/2026 Vision and Intentions - Karthik.md`
- `3-Resources/Life/Jamie/2025 Recap and 2026 Vision - Jamie.md`

**Design:**
- Dark mode with subtle blue-based gradient
- Clean, modern aesthetic
- Ignore HTML styling from original markdown files

---

### 2. Interactivity ✅

| Requirement | Decision |
|-------------|----------|
| Highlighting/annotating text | ❌ Not needed |
| Editing directly in browser | ✅ Split view (rendered left, markdown editor right) |
| Auto-save | ✅ Yes — save as you type (debounced) |
| Save changes back to vault | ✅ Yes — writes directly to .md files |

---

### 3. File Browser ✅

| Requirement | Decision |
|-------------|----------|
| Browse vault files | ✅ Entire vault (folder tree) |
| "Today's Note" quick access | ✅ Yes — button to jump to/create daily note |
| Search functionality | ❌ Not needed now (folder browsing sufficient) |
| Recent files section | ✅ Yes — show recently opened files |

---

### 4. Technical Architecture ✅

| Requirement | Decision |
|-------------|----------|
| Hosting approach | ✅ Localhost first (future: Firebase deployment) |
| Startup | ✅ Auto-start on login, always running |
| Authentication | ❌ Not needed (internal use only) |
| Backend technology | Node.js (Express) |
| Frontend framework | Vanilla JS + marked.js for markdown |
| Daily note creation | ✅ Use `Templates/Daily.md` template |

**Note:** Template processing will handle basic date substitution. Full Templater syntax (randomization, calendar) processes when opened in Obsidian.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 Vision Dashboard          [Today's Note]    Recent ▼        │
├────────────┬────────────────────────────────────────────────────┤
│            │  ┌─────────────────────────────────────────────┐   │
│  📁 Vault  │  │ [Karthik] [Jamie]                           │   │
│            │  ├─────────────────────────────────────────────┤   │
│  ▼ Daily   │  │                                             │   │
│  ▼ 1-Proj  │  │         Vision Document (Rendered)          │   │
│  ▼ 2-Areas │  │                                             │   │
│  ▼ 3-Res   │  │                                             │   │
│    ...     │  └─────────────────────────────────────────────┘   │
│            ├────────────────────────────────────────────────────┤
│  ─────────	│  ┌───────────────────┬───────────────────────┐   │
│  Recent:   │  │  Rendered View    │   Markdown Editor     │   │
│  • file1   │  │                   │                       │   │
│  • file2   │  │  (when editing    │   (auto-save)         │   │
│            │  │   a note)         │                       │   │
│            │  └───────────────────┴───────────────────────┘   │
└────────────┴────────────────────────────────────────────────────┘
```

**Behavior:**
- Vision tabs always visible at top
- Click file in sidebar → opens in split editor below
- Split editor: rendered markdown left, raw editor right
- Auto-save on edit (debounced ~1 second)

---

## Design System

**Theme:** Dark mode with subtle blue gradient

| Element | Style |
|---------|-------|
| Background | `#0d1117` → `#161b22` gradient |
| Surface | `#21262d` |
| Border | `#30363d` |
| Text | `#c9d1d9` |
| Accent | `#58a6ff` (blue) |
| Success | `#3fb950` (green) |
| Headings | `#f0f6fc` |

**Typography:**
- Font: System font stack (SF Pro, Segoe, etc.)
- Code: `JetBrains Mono` or `Fira Code`

---

## File Structure

```
3-Resources/AI/Webapp/
├── PRD.md              # This document
├── package.json        # Node dependencies
├── server.js           # Express server
├── public/
│   ├── index.html      # Main dashboard
│   ├── styles.css      # Dark theme styles
│   └── app.js          # Frontend logic
└── scripts/
    └── install.sh      # Auto-start setup
```

---

## Future Enhancements (v2)

- [ ] Firebase cloud deployment
- [ ] Search functionality
- [ ] Mobile-responsive design
- [ ] Obsidian URI links (open in Obsidian)
- [ ] Habit dashboard integration

---

**Status:** ✅ Ready for implementation

*Interview completed 2026-01-18*
