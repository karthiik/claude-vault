# PRD: SmartNow UI/UX Redesign

**Version:** 1.0
**Status:** Draft
**Created:** 2026-01-26
**Author:** Karthik + Claude

---

## 1. Introduction/Overview

The **SmartNow Redesign** is a UI/UX overhaul of the existing Now page that transforms it from a vertically-stacked list view into a **time-aware, two-column layout** that surfaces AI insights contextually while managing information density through progressive disclosure.

**Problem it solves:** The current SmartNow view stacks all content vertically (AI insights → Today tasks → Upcoming → Calendar → Triage), requiring users to scroll to see their full day picture. Calendar and upcoming tasks occupy prominent space but aren't always the primary focus. AI insights sit at the top, disconnected from the tasks they reference.

**Design Philosophy:** Inspired by top AI-first apps (Motion, Arc, Sunsama, Tiimo), this redesign treats the page as a **unified command center** where:
- Prioritized tasks demand primary attention (left column)
- Calendar provides temporal context without dominating (right column)
- AI insights appear inline where relevant, plus a proactive top bar for alerts
- Secondary content (upcoming, triage) stays accessible but collapsed by default

---

## 2. Goals

1. **Full-width utilization** — Use available screen real estate with a two-column layout (tasks left, calendar right)
2. **AI insights in context** — Surface insights both at top (proactive alerts) and inline next to relevant tasks/events
3. **Progressive disclosure** — Hide complexity (upcoming, triage) until user requests it; reduce cognitive load
4. **Zero new data** — Preserve all existing content and data sources; this is layout + UX only
5. **Maintain focus** — Despite showing more at once, the page should feel calmer, not busier

---

## 3. User Stories

### 3.1 Morning Scan
> As Karthik, when I open SmartNow in the morning, I want to see my prioritized tasks on the left and today's calendar on the right in one glance—so I can immediately understand both what to do and when I have time to do it.

### 3.2 AI Insight Discovery
> As Karthik, when there's an AI insight about a specific task (e.g., "this blocks tomorrow's deadline"), I want to see a subtle indicator on the task and expand it inline—so I get context without interrupting my flow.

### 3.3 Upcoming Peek
> As Karthik, I want to glance at upcoming tasks for the next few days without leaving the Now view—but I don't need them front-and-center; a collapsed section I can expand is sufficient.

### 3.4 Triage on Demand
> As Karthik, vault tasks needing triage should be tucked away until I'm ready to process them—but I want a visible badge count so I know how many are waiting.

### 3.5 Calendar Awareness
> As Karthik, I want the calendar column to show my day's timeline with key meetings highlighted—helping me spot open blocks for deep work without switching apps.

---

## 4. Functional Requirements

### 4.1 Two-Column Layout

| Requirement | Description |
|-------------|-------------|
| **R1** | The system must display a two-column layout on screens ≥1024px (tasks left ~60%, calendar right ~40%) |
| **R2** | This view is optimized for desktop (≥1024px). Mobile-specific view is out of scope for v1. |
| **R3** | Both columns must scroll independently |
| **R4** | The layout must use full available width (no max-width constraint on container) |

### 4.2 Left Column: Priority Tasks

| Requirement | Description |
|-------------|-------------|
| **R5** | The left column must display Today tasks grouped by project (existing behavior) |
| **R6** | Tasks with AI insights must show a subtle sparkle icon; clicking expands the insight inline |
| **R7** | The "Upcoming" section must be collapsed by default with a header showing task count |
| **R8** | Clicking the Upcoming header must expand/collapse the section with smooth animation |
| **R9** | The "Triage" section must be collapsed by default with a badge showing pending count |
| **R10** | The Triage section must expand inline (not modal) for quick processing |
| **R11** | When expanded, Upcoming/Triage sections must show a mini inline summary (first 3-5 items) with "Show all" option |

### 4.3 Right Column: Calendar + Time Context

| Requirement | Description |
|-------------|-------------|
| **R12** | The right column must display today's calendar events in a timeline view |
| **R13** | Each event must show: time, title, duration bar, attendees (if any), location (if any) |
| **R14** | Events with AI notes (e.g., "prep time suggested") must display the note inline |
| **R15** | The calendar column must visually indicate the current time with a "now" line (updated on page load/refresh only, not real-time) |
| **R16** | Open time blocks already appear as "Focus Time" blocks from calendar — display these as-is, no additional detection needed |
| **R17** | The routine meetings count ("X routine meetings hidden") must appear at the bottom |

### 4.4 AI Insights: Hybrid Placement

| Requirement | Description |
|-------------|-------------|
| **R18** | Proactive AI alerts (opportunities, warnings, balance nudges) must appear in a top insight bar spanning both columns |
| **R19** | Task-specific AI insights must appear inline (expand on the task row, not in the top bar) |
| **R20** | Calendar-specific AI insights (e.g., "meeting prep needed") must appear on the event row |
| **R21** | The top insight bar must be dismissible per-insight (existing behavior) |
| **R22** | Insights must be color-coded by type (existing: purple=opportunity, amber=guardian, cyan=balance, blue=calendar) |

### 4.5 Progressive Disclosure Patterns

| Requirement | Description |
|-------------|-------------|
| **R23** | Collapsed sections (Upcoming, Triage) must show a compact header with: icon, label, count badge, chevron |
| **R24** | Clicking a collapsed section must open a **slide-out drawer from the right edge** (not inline expand) |
| **R25** | The drawer must overlay the calendar column and include a close button + click-outside-to-dismiss |
| **R26** | Each section's drawer must remember scroll position if re-opened during the session |
| **R27** | Drawer slide animation must be smooth (250ms ease-out) |

### 4.6 Visual Hierarchy + Polish

| Requirement | Description |
|-------------|-------------|
| **R28** | The left column header must read "Focus" (replacing "Today") to emphasize priority |
| **R29** | Task rows must have increased vertical padding (py-3) for touch targets and breathing room |
| **R30** | The calendar timeline must use a subtle vertical line connecting events |
| **R31** | Energy tags (deep/creative/quick) must be more subtle (smaller, muted colors) |
| **R32** | Project group headers must use the existing Things 3 style dot + name |
| **R33** | The page background must remain dark; columns should have subtle card-style backgrounds (bg-gray-800/20) |

---

## 5. Non-Goals (Out of Scope)

1. **New data sources** — This redesign uses existing data; no new API integrations
2. **Drag-and-drop reordering** — Tasks stay in AI-prioritized order
3. **Gestures (swipes)** — Per user preference, interactions are click-only
4. **Focus Mode toggle** — The page itself should be focused; no separate mode
5. **Keyboard shortcuts** — Not required for v1 (may add later)
6. **Mobile-specific view** — Desktop-optimized for v1; mobile view is a separate future effort

---

## 6. Design Considerations

### 6.1 Layout Wireframe

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Now                                        Mon, Jan 26    [↻]             │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ 💡 You have 90 minutes before your 10am – perfect for MIT CTO prep    X │ │
│ └──────────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────────┤
│                                            │                               │
│  FOCUS                      5 tasks        │  TODAY'S CALENDAR             │
│ ─────────────────────────────────────────  │ ───────────────────────────── │
│  ○──○ MIT CTO Program                      │                               │
│  │  □ Review L1-L4 content        ✨ deep  │  8:00  ─────────────────────  │
│  │    └─ 💡 This blocks tomorrow's demo    │                               │
│  │  □ Prep leadership deck             deep│  9:00  ─────────────────────  │
│                                            │        ☕ Focus block           │
│  ○──○ GEA Feb Kickoff                      │                               │
│     □ Confirm London logistics       quick │  10:00 ████████████████████   │
│                                            │        Team standup (30m)     │
│  ○──○ No Project                           │        📍 Zoom · 4 attendees   │
│     □ Review Q1 OKRs              creative │        💡 CTO update expected  │
│                                            │                               │
│ ─────────────────────────────────────────  │  11:00 ─────────────────────  │
│                                            │                               │
│  ▶ Upcoming                     12 tasks   │  12:00 ████████████████████   │
│    ┌─ Tomorrow: 3 │ Wed: 4 │ Thu: 5 ─┐     │        Lunch with Sarah       │
│    └─────────────────────────────────┘     │                               │
│                                            │  1:00  ─────────────────────  │
│  ▶ Triage                    🔴 4 items    │        ☕ Deep work block       │
│    ┌─ Review MIT feedback note (vault) ─┐  │                               │
│    └─────────────────────────────────────┘ │  2:00  ────── now ──────────  │
│                                            │                               │
│                                            │  3:00  ████████████████████   │
│                                            │        1:1 with Alex (45m)    │
│                                            │                               │
│                                            │  · 2 routine meetings hidden  │
│                                            │                               │
└────────────────────────────────────────────┴───────────────────────────────┘
```

### 6.2 Progressive Disclosure States

**Collapsed (default):**
```
▶ Upcoming                           12 tasks
  ┌─ Tomorrow: 3 │ Wed: 4 │ Thu: 5 ─────────┐
  └──────────────────────────────────────────┘
```

**Clicked → Slide-out drawer:**
```
┌─────────────────────────────────────────┬────────────────────────────────┐
│  FOCUS                     5 tasks      │                              X │
│ ────────────────────────────────────    │  UPCOMING                      │
│  ○──○ MIT CTO Program                   │  ─────────────────────────     │
│  │  □ Review L1-L4 content      ✨ deep │                                │
│  │  □ Prep leadership deck         deep │  Tomorrow, Jan 27              │
│  ...                                    │  ○ Review Q2 budget   Finances │
│                                         │  ○ Call with vendor     Career │
│  ▶ Upcoming                   12 tasks  │  ○ Prep Friday demo     Career │
│  ▶ Triage                  🔴 4 items   │                                │
│                                         │  Wednesday, Jan 28             │
│                                         │  ○ Submit expense...  Finances │
│                                         │  ○ Review design...     Career │
│                                         │  ...                           │
│                                         │                                │
│                                         │  [Show all 12]                 │
└─────────────────────────────────────────┴────────────────────────────────┘
```

The drawer slides in from the right, overlaying the calendar column. Click X or outside to dismiss.

### 6.3 Inline AI Insight Expansion

**Collapsed (sparkle indicator):**
```
□ Review L1-L4 content              ✨ deep
```

**Expanded (inline insight):**
```
□ Review L1-L4 content              ✨ deep
  └─ 💡 This blocks tomorrow's MIT demo. Consider tackling in your 9am focus block.
       [Start now →]
```

### 6.4 Calendar Timeline Visual

The calendar column uses a **continuous timeline** aesthetic:
- Thin vertical line (gray-700) running from first to last event
- Event blocks are horizontal bars sized by duration
- Current time shown as colored horizontal line with "now" label
- Open blocks (gaps) shown with subtle dashed outline + "available" label
- Events with AI notes show the note below the event title

---

## 7. Technical Considerations

### 7.1 Component Architecture

Refactor existing components:
- `SmartNowView` → Add two-column grid wrapper
- `ThingsStyleTaskList` → Keep as-is (left column)
- `UpcomingTaskList` → Wrap in collapsible accordion
- `TriageTaskRow` → Wrap in collapsible accordion
- NEW: `CalendarTimeline` → Timeline-style calendar (right column)
- NEW: `CollapsibleSection` → Reusable accordion component
- NEW: `InlineInsightExpander` → Task row insight reveal

### 7.2 State Management

```javascript
// Local state additions
const [expandedSections, setExpandedSections] = useState({
  upcoming: false,
  triage: false
})

// Per-task insight expansion
const [expandedInsights, setExpandedInsights] = useState(new Set())
```

### 7.3 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| ≥1280px (xl) | Two columns: 60% / 40% |
| ≥1024px (lg) | Two columns: 55% / 45% |
| <1024px | Stacked with tab switcher |

### 7.4 CSS Grid Structure

```css
.smart-now-grid {
  display: grid;
  grid-template-columns: 1fr 380px; /* or minmax(320px, 400px) */
  gap: 24px;
  height: calc(100vh - header);
}

@media (max-width: 1023px) {
  .smart-now-grid {
    grid-template-columns: 1fr;
  }
}
```

### 7.5 Animation Specs

| Animation | Duration | Easing |
|-----------|----------|--------|
| Section expand/collapse | 250ms | ease-out |
| Insight expand | 200ms | ease-out |
| Hover peek fade-in | 150ms | ease-in |
| Badge pulse (new items) | 1s | ease-in-out, infinite |

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Time to first action** | <10s from page load | Track first task interaction |
| **Scroll reduction** | 50% less vertical scrolling | Compare scroll depth before/after |
| **Insight engagement** | 40%+ of inline insights get expanded | Track click events on sparkle icons |
| **Triage completion rate** | 80%+ of surfaced triage items processed | Compare surfaced vs actioned |
| **Subjective calm** | User reports page feels "less busy" | Qualitative feedback |

---

## 9. Open Questions

1. **Drawer width refinement:** Starting with 40% of viewport — may need adjustment after seeing it in action.

2. **Mobile view:** This redesign is desktop-optimized. A dedicated mobile view will be a separate effort.

---

## 10. Implementation Phases

### Phase 1: Layout Foundation (Days 1-2)
- [ ] Refactor SmartNowView to use CSS Grid two-column layout
- [ ] Create responsive breakpoint handling (stacked on mobile)
- [ ] Move existing task list to left column
- [ ] Create placeholder right column for calendar

### Phase 2: Calendar Timeline (Days 3-4)
- [ ] Build CalendarTimeline component with timeline aesthetic
- [ ] Add "now" line with current time indicator
- [ ] Display events with duration bars
- [ ] Add AI notes inline on events

### Phase 3: Collapsible Sections (Days 5-6)
- [ ] Create CollapsibleSection component
- [ ] Wrap Upcoming in collapsible with summary header
- [ ] Wrap Triage in collapsible with badge count
- [ ] Add hover peek tooltip (desktop only)
- [ ] Implement smooth expand/collapse animations

### Phase 4: Inline AI Insights (Days 7-8)
- [ ] Add sparkle indicator to tasks with insights
- [ ] Build InlineInsightExpander component
- [ ] Wire up expand/collapse per task
- [ ] Move task-specific insights from top bar to inline

### Phase 5: Polish (Days 9-10)
- [ ] Fine-tune spacing, typography, colors
- [ ] Refine drawer width (starting at 40%, adjust as needed)
- [ ] Performance optimization (memoization, lazy loading)
- [ ] User testing and iteration

---

*PRD generated based on interview with Karthik and research of AI-first app UI/UX patterns (Motion, Arc, Sunsama, Tiimo, Shortwave, Reflect), 2026-01-26.*
