# Tasks: SmartNow UI/UX Redesign

Based on [PRD: SmartNow UI/UX Redesign](./prd-smartnow-redesign.md)

---

## Relevant Files

- `app/src/views/SmartNow.jsx` - Main view component being redesigned
- `app/src/components/CalendarTimeline.jsx` - NEW: Timeline-style calendar component for right column
- `app/src/components/SlideOutDrawer.jsx` - NEW: Reusable slide-out drawer component
- `app/src/components/CollapsibleSection.jsx` - NEW: Collapsible header for Upcoming/Triage
- `app/src/components/InlineInsightExpander.jsx` - NEW: Expandable AI insight on task rows

### Notes

- No unit tests required (personal webapp)
- Desktop-optimized; mobile view is out of scope

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`.

---

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Skipped - git lock file present, proceeding on main branch

- [x] 1.0 Implement two-column layout foundation
  - [x] 1.1 Refactor SmartNowView container to use CSS Grid with two columns (60% / 40%)
  - [x] 1.2 Remove max-width constraint to use full viewport width
  - [x] 1.3 Create left column wrapper for Focus tasks section
  - [x] 1.4 Create right column wrapper (placeholder for calendar)
  - [x] 1.5 Enable independent scrolling for each column (overflow-y-auto, fixed height)
  - [x] 1.6 Update header to span full width with "Now" title

- [x] 2.0 Build calendar timeline component (right column)
  - [x] 2.1 Create CalendarTimeline.jsx component file
  - [x] 2.2 Render events in vertical timeline layout with time labels on left
  - [x] 2.3 Add duration bars (visual width/height based on event length)
  - [x] 2.4 Display attendees and location inline on events
  - [x] 2.5 Add "now" line indicator at current time position
  - [x] 2.6 Show Focus Time blocks as-is from calendar data
  - [x] 2.7 Display "X routine meetings hidden" count at bottom
  - [x] 2.8 Add subtle vertical connecting line between events
  - [x] 2.9 Wire up AI notes on events (sparkle + inline note)

- [x] 3.0 Create slide-out drawer component
  - [x] 3.1 Create SlideOutDrawer.jsx component file
  - [x] 3.2 Implement slide-in animation from right edge (250ms ease-out)
  - [x] 3.3 Add dark overlay backdrop behind drawer
  - [x] 3.4 Add close button (X) in drawer header
  - [x] 3.5 Implement click-outside-to-dismiss behavior
  - [x] 3.6 Accept children prop for drawer content
  - [x] 3.7 Set drawer width to 40% of viewport

- [x] 4.0 Implement collapsible sections (Upcoming, Triage)
  - [x] 4.1 Create CollapsibleSection.jsx component with header (icon, label, count, chevron)
  - [x] 4.2 Refactor Upcoming section to use CollapsibleSection
  - [x] 4.3 Refactor Triage section to use CollapsibleSection with badge
  - [x] 4.4 Wire CollapsibleSection click to open SlideOutDrawer
  - [x] 4.5 Move UpcomingTaskList into drawer content
  - [x] 4.6 Move Triage task list into drawer content
  - [x] 4.7 Add state to track which drawer is open (upcoming | triage | null)

- [x] 5.0 Add inline AI insight expansion on tasks
  - [x] 5.1 Add sparkle icon indicator to tasks that have insights
  - [x] 5.2 Make task row clickable to expand/collapse insight
  - [x] 5.3 Create inline insight expansion UI below task row
  - [x] 5.4 Filter task-specific insights out of the top insight bar
  - [x] 5.5 Keep only proactive alerts (opportunity, guardian, balance) in top bar

- [x] 6.0 Visual polish and refinement
  - [x] 6.1 Rename "Today" header to "Focus"
  - [x] 6.2 Increase task row vertical padding (py-3)
  - [x] 6.3 Make energy tags more subtle (smaller, muted colors)
  - [x] 6.4 Add subtle card-style backgrounds to columns (bg-gray-800/20)
  - [x] 6.5 Fine-tune spacing and typography throughout
  - [x] 6.6 Verify all existing functionality still works (complete, triage actions)

---

*Generated from PRD on 2026-01-26*
