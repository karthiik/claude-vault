# PRD: Full Circle Dashboard

**Version:** 1.0
**Status:** Draft
**Created:** 2026-01-26
**Author:** Karthik + Claude

---

## 1. Introduction/Overview

The **Full Circle Dashboard** is a morning briefing view that provides an intelligent window into Karthik's 8 life areas (the "Full Circle" framework). Unlike the existing SmartNow view—which focuses on "what should I do right now?"—the Dashboard answers "what's happening across my life?" with AI-generated insights for each area.

**Problem it solves:** Karthik's Obsidian vault contains rich, varied information across 8 life domains. Currently, surfacing insights requires manually navigating folders and files. The Dashboard provides a single, glanceable view that highlights what needs attention—without requiring the user to "garden" or organize data manually.

**Philosophy:** This is a **read-heavy, insight-focused** view designed for:
- Morning ritual (5-10 min deep review to start the day)
- End-of-day reflection (review what happened, plan tomorrow)
- Quick glances throughout the day (30 sec check-ins)

---

## 2. Goals

1. **Surface daily insights** for each of the 8 Full Circle life areas without manual effort
2. **Highlight neglected areas** that need attention (based on activity patterns)
3. **Surface action items** from the vault that can be triaged to Things 3 (reusing SmartNow's triage UX)
4. **Support the review cadence** defined in the Areas Index (weekly quick scan, monthly balance check)
5. **Complement SmartNow**—Dashboard is for awareness; SmartNow is for execution

---

## 3. User Stories

### 3.1 Morning Briefing
> As Karthik, I want to see a card for each life area when I wake up, showing what changed yesterday, what needs attention, and any surfaced action items—so I can start my day with clarity instead of opening 8 different folders.

### 3.2 Area Deep Dive
> As Karthik, I want to tap an area card to expand it and see more detail (recent activity, linked projects, relationships, upcoming events)—so I can quickly investigate without leaving the Dashboard.

### 3.3 Triage to Things
> As Karthik, when the Dashboard surfaces an action item from my vault, I want to swipe or tap to send it to Things 3 Inbox—using the same triage flow I already use in SmartNow.

### 3.4 Balance Check
> As Karthik, I want to see a visual indicator when one area is dominating my attention (e.g., Career at 60%) while others are neglected—so I can consciously rebalance.

### 3.5 End-of-Day Reflection
> As Karthik, I want an evening mode that summarizes what happened today across all areas—so I can reflect and capture any loose ends before tomorrow.

---

## 4. Functional Requirements

### 4.1 Area Cards (Core Component)

Each of the 8 Full Circle areas gets a dedicated card displaying:

| Element | Description |
|---------|-------------|
| **Area Icon + Name** | e.g., 🏃 Health – Mind, Body & Spirit |
| **2026 Intention** | The one-liner from Areas Index (truncated, expandable) |
| **Key Metric** | Area-specific (see 4.2) |
| **Recent Activity** | Last 3 vault changes related to this area (past 7 days) |
| **AI Insight** | One sentence generated daily (see 4.3) |
| **Surfaced Actions** | 0-3 unchecked tasks from vault files tagged to this area |
| **Status Indicator** | 🟢 Active / 🟡 Needs Attention / 🔴 Neglected |

**Requirements:**

1. The system must display all 8 area cards on the Dashboard
2. Cards must be ordered by "needs attention" status (🔴 first, then 🟡, then 🟢)
3. Each card must be tappable to expand into a detail view
4. Cards must update on page load (no manual refresh required)

### 4.2 Area-Specific Metrics

Each area tracks a different "key metric" based on available vault data:

| Area | Key Metric | Data Source |
|------|------------|-------------|
| 🏃 Health | Days since last logged activity | Daily notes with #health tag or Health index |
| 💛 Relationships | People needing contact (Core tier, >14 days) | Person notes with `last_contact` field |
| 🚀 Career | Active strategic tasks count | Tasks tagged #career or in Career projects |
| 💰 Finances | Days until next financial review | Finance index or scheduled reviews |
| 📚 Learning | Learning sessions this week | Daily notes with #learning tag |
| 🎨 Joy | Days since last "joy" activity | Daily notes with #joy or recreation tags |
| 🏠 Home | Open household tasks | Tasks in Home projects |
| 🌟 Contribution | Mentoring/content items in progress | Contribution projects or #mentoring tags |

**Requirements:**

5. The system must calculate each metric by scanning relevant vault files
6. Metrics must reflect data from the past 7 days (configurable)
7. If no data exists for a metric, display "No recent data" instead of 0

### 4.3 AI-Generated Insights

Each area card displays one AI-generated insight sentence. Insight strategies:

| Strategy | Trigger | Example Output |
|----------|---------|----------------|
| **Change Summary** | Activity in past 24h | "Yesterday: Added 2 tasks to MIT CTO project, completed Health check-in" |
| **Neglect Alert** | No activity in 7+ days | "No Joy activities logged in 9 days. Your word is Emergence—what sparks aliveness?" |
| **Pattern Detection** | Trend identified | "Career tasks up 40% this week. Relationships down. Check the balance." |
| **Connection Finder** | Cross-area link found | "London trip (Joy) connects to GEA Kickoff (Career). Prep both together?" |
| **Milestone Reminder** | Upcoming event in Timeline | "Vinay turns 15 in 63 days. Any planning needed?" |

**Requirements:**

8. The system must generate one insight per area per day (cached, not real-time)
9. Insights must be regenerated on-demand via a "Refresh Insights" button
10. Insight generation must use the existing Claude Code integration
11. Insights must reference specific vault data (not generic advice)

### 4.4 Surfaced Action Items + Triage

The Dashboard surfaces unchecked tasks (`- [ ]`) from vault files that map to each area.

**Requirements:**

12. The system must scan vault files (Daily notes, Projects, Area indices) for unchecked tasks
13. Tasks must be mapped to areas using the existing `AREA_MAPPING` logic from SmartNow
14. Each area card displays up to 3 surfaced tasks (sorted by deadline, then recency)
15. Tasks already in Things 3 must be excluded (using existing deduplication logic)
16. Each surfaced task must support the existing triage actions:
    - **Send to Today** → Creates task in Things 3 Inbox
    - **Schedule** → Opens modal (Tomorrow / This Weekend / Next Week / Pick Date + Project + Deadline)
    - **Mark Done** → Checks the checkbox in the vault file
    - **Someday** → Moves to Things 3 Someday list
17. After triage, the task must disappear from the Dashboard (dedup cache invalidated)

### 4.5 Balance Visualization

A summary component showing distribution of activity/attention across all 8 areas.

**Requirements:**

18. The system must display a "Full Circle Pulse" visualization (radar chart or horizontal bars)
19. The visualization must show percentage of activity per area (based on task counts, file edits, or logged activities)
20. Areas below 5% activity must be highlighted as "neglected"
21. Areas above 40% activity must be highlighted as "dominating"
22. Tapping the visualization must scroll to the corresponding area card

### 4.6 Timeline Integration

The Dashboard must surface upcoming milestones from the 2026 Timeline.

**Requirements:**

23. The system must display the next 3 upcoming Timeline events (from Areas Index)
24. Each event must show: Date, Event Name, Related Area(s)
25. Events within 7 days must be visually highlighted
26. Tapping an event must expand to show related vault context (linked projects, people, tasks)

### 4.7 Review Mode Toggle

Support for different consumption contexts (Morning vs Evening).

**Requirements:**

27. The system must support two modes: **Morning Briefing** and **Evening Reflection**
28. Morning mode emphasizes: What needs attention today? What's coming up?
29. Evening mode emphasizes: What happened today? What loose ends remain?
30. Mode can be toggled manually or auto-detected by time (before 12pm = Morning, after 6pm = Evening)

---

## 5. Non-Goals (Out of Scope)

1. **Real-time sync** – Dashboard refreshes on load, not via WebSocket
2. **Editing vault content** – Users can triage tasks but not edit notes from Dashboard (use Obsidian for that)
3. **Calendar integration** – SmartNow already handles today's calendar; Dashboard focuses on areas
4. **Email integration** – Future phase; not included in v1
5. **Push notifications** – Dashboard is pull-based (user opens it); no proactive alerts
6. **Custom area definitions** – v1 uses the fixed 8 Full Circle areas; customization is future scope

---

## 6. Design Considerations

### 6.1 Layout

```
┌─────────────────────────────────────────────────────┐
│  Full Circle Dashboard          [Morning ▾] [⟳]    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐    │
│  │  FULL CIRCLE PULSE (Balance Visualization)  │    │
│  │  [===Career 42%===] [==Health 18%==] ...    │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  UPCOMING                                           │
│  • Jan 28 – GAI NYC (Career)                       │
│  • Jan 31 – Karthik's 48th birthday (Relationships)│
│  • Feb – London GEA Kickoff (Career)               │
├─────────────────────────────────────────────────────┤
│  AREAS NEEDING ATTENTION                           │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🎨 Joy, Creativity & Play           🔴       │  │
│  │ "Chasing aliveness..."                       │  │
│  │ ─────────────────────────────────────────    │  │
│  │ 📊 9 days since last activity               │  │
│  │ 💡 "No joy logged. Motorcycle weather this  │  │
│  │    weekend?"                                 │  │
│  │ ─────────────────────────────────────────    │  │
│  │ □ Plan spring motorcycle route              │  │
│  │   [Today] [Schedule] [Done] [Someday]       │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 💛 Relationships & Social Life      🟡       │  │
│  │ ...                                          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ... (remaining 6 area cards)                      │
└─────────────────────────────────────────────────────┘
```

### 6.2 Mobile Gestures

- **Swipe right on task** → Send to Today (Things Inbox)
- **Swipe left on task** → Open Schedule modal
- **Tap area card** → Expand to full detail view
- **Pull down** → Refresh Dashboard data

### 6.3 Component Reuse

Reuse existing SmartNow components:
- `TriageActions` component (Today / Schedule / Done / Someday buttons)
- `ScheduleModal` component (date picker + project selector)
- `FullCircleArea` mapping logic
- Things 3 integration (`/api/things/*` endpoints)
- Vault task scanning (`fetchVaultTasks` function)

---

## 7. Technical Considerations

### 7.1 Data Sources

| Data | Source | Scan Method |
|------|--------|-------------|
| Area definitions | `2-Areas/0_Areas_Index.md` | Parse YAML + markdown sections |
| Area-specific data | `2-Areas/0_{Area}_Index.md` | Parse each area's index file |
| Recent activity | `Daily/*.md` (last 7 days) | Scan for area tags (#health, #career, etc.) |
| Project tasks | `1-Projects/**/*.md` | Scan for unchecked tasks, map to areas |
| Timeline events | `2-Areas/0_Areas_Index.md` | Parse "2026 Timeline" table |
| People/Relationships | `3-Resources/People/*.md` | Check `last_contact` frontmatter |

### 7.2 API Endpoints (New)

```
GET /api/dashboard
  → Returns: { areas: [...], pulse: {...}, timeline: [...], mode: 'morning'|'evening' }

GET /api/dashboard/area/:areaId
  → Returns: { ...areaDetail, recentActivity: [...], relatedProjects: [...], tasks: [...] }

POST /api/dashboard/refresh-insights
  → Triggers AI insight regeneration for all areas
  → Returns: { areas: [...] } with fresh insights
```

### 7.3 Caching Strategy

- **Area metrics**: Cache for 5 minutes (same as Things dedup cache)
- **AI insights**: Cache for 24 hours (regenerate on-demand or at midnight)
- **Vault task scan**: Reuse SmartNow's existing scan logic with area filtering

### 7.4 Dependencies

- Existing SmartNow infrastructure (vault scanning, Things integration, triage flow)
- Claude Code integration for insight generation
- `gray-matter` for YAML frontmatter parsing
- `glob` for file pattern matching

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Daily usage** | Dashboard opened 5+ days/week | Analytics event on page load |
| **Insight engagement** | 30%+ of insights lead to action (tap, triage, or expand) | Track tap events on insight text |
| **Triage conversion** | 50%+ of surfaced tasks get triaged (not ignored) | Compare surfaced vs triaged counts |
| **Balance improvement** | Reduction in "neglected" areas over 30 days | Track weekly pulse snapshots |
| **Time to clarity** | <2 min from open to "I know what to focus on" | User feedback / session duration |

---

## 9. Open Questions

1. **Insight generation cost**: How many Claude API tokens per day for 8 area insights? Should we batch or generate on-demand?

2. **Historical tracking**: Should we store daily pulse snapshots to show trends over time (e.g., "Career has dominated 3 weeks straight")?

3. **Evening mode content**: What specifically should Evening Reflection show that Morning doesn't? Just a filter, or different insight prompts?

4. **Area index parsing**: The current area indices have varying structures. Do we need a standard template, or should the AI handle variance?

5. **Relationship "last contact" automation**: Should Dashboard auto-update `last_contact` when a person is mentioned in Daily notes, or is that a separate feature?

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `/api/dashboard` endpoint
- [ ] Parse Areas Index for 8 areas + intentions + timeline
- [ ] Build basic area card component (static data)
- [ ] Display cards in priority order

### Phase 2: Metrics + Activity (Week 2)
- [ ] Implement area-specific metric calculations
- [ ] Scan Daily notes for recent activity per area
- [ ] Add status indicator logic (🟢/🟡/🔴)
- [ ] Build Full Circle Pulse visualization

### Phase 3: Insights (Week 3)
- [ ] Create insight generation prompts for each strategy
- [ ] Integrate Claude Code for insight generation
- [ ] Implement insight caching (24h TTL)
- [ ] Add "Refresh Insights" button

### Phase 4: Triage Integration (Week 4)
- [ ] Surface vault tasks on area cards
- [ ] Reuse SmartNow triage components
- [ ] Wire up Things 3 integration for Dashboard
- [ ] Implement swipe gestures

### Phase 5: Polish (Week 5)
- [ ] Add Morning/Evening mode toggle
- [ ] Implement area detail expansion view
- [ ] Add Timeline upcoming events section
- [ ] Mobile optimization + gesture refinement

---

*PRD generated based on interview with Karthik, 2026-01-26. Aligned with existing SmartNow implementation and Full Circle framework from Areas Index.*
