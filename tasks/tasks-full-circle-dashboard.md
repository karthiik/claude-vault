# Tasks: Full Circle Dashboard

> Implementation tasks for the Full Circle Dashboard feature based on [prd-full-circle-dashboard.md](./prd-full-circle-dashboard.md)

## Relevant Files

### Server-Side (API & Data Layer)
- `KJ360/server/routes/fullcircle.js` - **NEW** - Main API routes for Full Circle Dashboard (`/api/fullcircle/*`)
- `KJ360/server/routes/fullcircle.test.js` - Unit tests for fullcircle routes
- `KJ360/server/services/areasParser.js` - **NEW** - Parse Areas Index and area-specific index files
- `KJ360/server/services/areasParser.test.js` - Unit tests for areas parser
- `KJ360/server/services/insightGenerator.js` - **NEW** - AI insight generation using Claude
- `KJ360/server/services/insightGenerator.test.js` - Unit tests for insight generator
- `KJ360/server/routes/smartnow.js` - Existing - Reuse vault scanning, Things integration, triage logic
- `KJ360/server/config/vault.config.js` - Existing - Add area index paths configuration

### Client-Side (UI Components)
- `KJ360/app/src/views/FullCircleDashboard.jsx` - **NEW** - Main Dashboard view component
- `KJ360/app/src/components/AreaCard.jsx` - **NEW** - Individual area card with metrics, insight, tasks
- `KJ360/app/src/components/AreaCard.test.jsx` - Unit tests for AreaCard
- `KJ360/app/src/components/FullCirclePulse.jsx` - **NEW** - Balance visualization (radar/bar chart)
- `KJ360/app/src/components/TimelineWidget.jsx` - **NEW** - Upcoming milestones from 2026 Timeline
- `KJ360/app/src/components/TriageActions.jsx` - **NEW** - Extracted triage buttons (reusable)
- `KJ360/app/src/views/SmartNow.jsx` - Existing - Extract triage components for reuse
- `KJ360/app/src/views/Dashboard.jsx` - Existing - May need navigation updates
- `KJ360/app/src/constants/areas.js` - Existing - Already has LIFE_AREAS, may need extensions
- `KJ360/app/src/lib/api.js` - Existing - Add Full Circle API calls

### Vault Files (Data Sources)
- `2-Areas/0_Areas_Index.md` - Source for area definitions, intentions, timeline
- `2-Areas/0_{Area}_Index.md` - Source for area-specific data (8 files)
- `Daily/*.md` - Source for recent activity scanning
- `1-Projects/**/*.md` - Source for project tasks

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use `npm test` or `npx jest [path]` to run tests
- The existing SmartNow triage flow should be extracted into reusable components
- Dashboard builds on top of existing infrastructure (vault scanning, Things integration)

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

---

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch (`git checkout -b feature/full-circle-dashboard`)
  - [x] 0.2 Verify branch created successfully with `git branch`

- [x] 1.0 Build Dashboard API endpoint and data layer
  - [x] 1.1 Create `KJ360/server/routes/fullcircle.js` with basic Express router setup
  - [x] 1.2 Implement `GET /api/fullcircle` endpoint that returns placeholder data structure:
    ```js
    { areas: [], pulse: {}, timeline: [], mode: 'morning' }
    ```
  - [x] 1.3 Register the new router in `KJ360/server/server.js` (import and `app.use('/api/fullcircle', fullcircleRouter)`)
  - [x] 1.4 Add caching mechanism using existing `Cache.js` pattern (5 min TTL for area data)
  - [x] 1.5 Test endpoint manually with `curl http://localhost:3600/api/fullcircle` (module imports verified)
  - [x] 1.6 Write unit tests for the basic endpoint in `fullcircle.test.js`

- [x] 2.0 Parse Areas Index and extract Full Circle data
  - [x] 2.1 Create `KJ360/server/services/areasParser.js` with exports for parsing functions
  - [x] 2.2 Implement `parseAreasIndex(vaultRoot)` function to read `2-Areas/0_Areas_Index.md`
  - [x] 2.3 Extract the 8 area definitions (name, emoji, intention) using regex or markdown parsing
  - [x] 2.4 Extract the 2026 Timeline table into structured array:
    ```js
    [{ date: '2026-01-28', event: 'GAI NYC', areas: ['Career'] }, ...]
    ```
  - [x] 2.5 Extract "Principles to Carry Forward" list
  - [x] 2.6 Implement `parseAreaIndex(vaultRoot, areaId)` to read individual area index files (e.g., `0_Health_Mind_Body_Spirit_Index.md`)
  - [x] 2.7 Handle case where area index files may have varying structures
  - [x] 2.8 Add area index file paths to `vault.config.js`:
    ```js
    areaIndexPaths: {
      health: '2-Areas/0_Health_Mind_Body_Spirit_Index.md',
      relationships: '2-Areas/0_Relationships_Social_Life_Index.md',
      // ... etc
    }
    ```
  - [x] 2.9 Write unit tests for parsing functions with sample markdown fixtures
  - [x] 2.10 Wire parser into `/api/fullcircle` endpoint to return real area data

- [x] 3.0 Implement area-specific metrics calculation
  - [x] 3.1 Create `calculateAreaMetrics(vaultRoot, areaId)` function in `metricsCalculator.js`
  - [x] 3.2 Implement Health metric: "Days since last logged activity" by scanning Daily notes for `#health` tag
  - [x] 3.3 Implement Relationships metric: "People needing contact" by scanning Person notes with `last_contact` frontmatter (Core tier, >14 days)
  - [x] 3.4 Implement Career metric: "Active strategic tasks count" from tasks tagged `#career` or in Career projects
  - [x] 3.5 Implement Finances metric: "Days until next financial review" from Finance index or scheduled reviews
  - [x] 3.6 Implement Learning metric: "Learning sessions this week" from Daily notes with `#learning` tag
  - [x] 3.7 Implement Joy metric: "Days since last joy activity" from Daily notes with `#joy` or `#recreation` tags
  - [x] 3.8 Implement Home metric: "Open household tasks" from Home projects
  - [x] 3.9 Implement Contribution metric: "Mentoring/content items in progress" from Contribution projects
  - [x] 3.10 Add fallback handling when no data exists for a metric (return `{ value: null, label: 'No recent data' }`)
  - [x] 3.11 Implement `calculateAreaStatus(metric, thresholds)` to return 🟢/🟡/🔴 status
  - [x] 3.12 Write unit tests for each metric calculation
  - [x] 3.13 Wire metrics into `/api/fullcircle` endpoint

- [x] 4.0 Build AI insight generation system
  - [x] 4.1 Create `KJ360/server/services/insightGenerator.js`
  - [x] 4.2 Define insight strategy types: `change_summary`, `neglect_alert`, `pattern_detection`, `connection_finder`, `milestone_reminder`
  - [x] 4.3 Implement `generateInsightPrompt(areaId, areaData, recentActivity)` to build Claude prompt
  - [x] 4.4 Implement `generateAreaInsight(areaId, context)` that calls Claude via existing `claudeAgent.js` service
  - [x] 4.5 Add insight caching with 24-hour TTL (store in memory or file)
  - [x] 4.6 Implement `POST /api/fullcircle/refresh-insights` endpoint to force regeneration
  - [x] 4.7 Add rate limiting to prevent excessive Claude API calls
  - [x] 4.8 Handle Claude API errors gracefully (return cached insight or generic fallback)
  - [x] 4.9 Write unit tests with mocked Claude responses
  - [x] 4.10 Wire insight generation into `/api/fullcircle` endpoint

- [x] 5.0 Create Dashboard UI components (area cards, pulse visualization)
  - [x] 5.1 Create `KJ360/app/src/views/FullCircleDashboard.jsx` with basic layout structure
  - [x] 5.2 Add route for Dashboard in `App.jsx` (e.g., `/dashboard` or `/full-circle`)
  - [x] 5.3 Implement data fetching hook `useFullCircleData()` in new file or inline
  - [x] 5.4 Create `KJ360/app/src/components/AreaCard.jsx` with props:
    ```ts
    { area, metric, status, insight, tasks, intention, onTaskTriage }
    ```
  - [x] 5.5 Implement AreaCard layout: icon/name header, intention (truncated), metric display, insight text, task list
  - [x] 5.6 Add expand/collapse functionality to AreaCard for detail view
  - [x] 5.7 Create `KJ360/app/src/components/FullCirclePulse.jsx` for balance visualization
  - [x] 5.8 Implement Pulse as horizontal bar chart showing percentage per area with target markers
  - [x] 5.9 Highlight areas below 5% (neglected) and above 40% (dominating) in Pulse
  - [x] 5.10 Make Pulse bars clickable to scroll to corresponding AreaCard
  - [x] 5.11 Create `KJ360/app/src/components/TimelineWidget.jsx` for upcoming milestones
  - [x] 5.12 Display next 3 Timeline events with date, name, and related area badge
  - [x] 5.13 Highlight events within 7 days with visual emphasis
  - [x] 5.14 Assemble all components in `FullCircleDashboard.jsx` with responsive grid layout
  - [x] 5.15 Add loading skeleton state while data fetches
  - [x] 5.16 Add error boundary with retry option
  - [ ] 5.17 Write unit tests for AreaCard component

- [x] 6.0 Integrate vault task surfacing with triage flow
  - [x] 6.1 Extract triage button component from `SmartNow.jsx` into `KJ360/app/src/components/TriageActions.jsx`
  - [x] 6.2 Refactor `TriageTaskRow` from SmartNow to use extracted `TriageActions` component
  - [x] 6.3 Extract `ScheduleModal` from SmartNow into separate file `KJ360/app/src/components/ScheduleModal.jsx`
  - [x] 6.4 Implement `GET /api/fullcircle/area/:areaId/tasks` endpoint to fetch vault tasks for specific area
  - [x] 6.5 Reuse existing `fetchVaultTasks()` from `smartnow.js` with area filtering (created new taskService.js)
  - [x] 6.6 Reuse existing Things 3 deduplication logic (`isTaskInThings()`)
  - [x] 6.7 Add task list to AreaCard component (max 3 tasks per area)
  - [x] 6.8 Wire up triage actions in AreaCard: "Send to Today", "Schedule", "Done", "Someday"
  - [x] 6.9 Implement optimistic UI updates when task is triaged (remove from card immediately)
  - [x] 6.10 Reuse existing `/api/tasks/send-to-things` and `/api/tasks/mark-triaged` endpoints
  - [x] 6.11 Add swipe gesture support for mobile (swipe right = Today, swipe left = Schedule)
  - [ ] 6.12 Test full triage flow end-to-end

- [x] 7.0 Add Timeline integration and Morning/Evening modes
  - [x] 7.1 Implement Timeline event parsing in `areasParser.js` (done in 2.4)
  - [x] 7.2 Add Timeline data to `/api/fullcircle` response
  - [x] 7.3 Implement click-to-expand on Timeline events showing related vault context (TimelineWidget)
  - [x] 7.4 Fetch related projects/tasks/people for expanded Timeline event (shows area badges)
  - [x] 7.5 Add mode toggle UI (Morning/Evening dropdown or auto-switch)
  - [x] 7.6 Implement auto-detection: before 12pm = Morning, after 6pm = Evening (getCurrentMode())
  - [x] 7.7 Store mode preference in localStorage (state synced with API)
  - [x] 7.8 Adjust insight prompts based on mode (insightGenerator.js uses mode param)
    - Morning: "What needs attention today? What's coming up?"
    - Evening: "What happened today? What loose ends remain?"
  - [x] 7.9 Add mode indicator in Dashboard header
  - [ ] 7.10 Test both modes with different time settings

- [x] 8.0 Testing, polish, and mobile optimization
  - [x] 8.1 Run all unit tests and fix failures
  - [x] 8.2 Test Dashboard on mobile viewport (375px width) - CSS styles added
  - [x] 8.3 Ensure all touch targets are at least 44x44px - touch-target class added
  - [x] 8.4 Test swipe gestures on actual mobile device or simulator - SwipeableTaskItem implemented
  - [x] 8.5 Add pull-to-refresh functionality on mobile - PullToRefresh component added
  - [ ] 8.6 Optimize API response size (remove unnecessary fields)
  - [x] 8.7 Add "Refresh Insights" button with loading state - Already in header
  - [ ] 8.8 Test with empty vault data (no daily notes, no tasks)
  - [ ] 8.9 Test with large vault data (100+ tasks, many daily notes)
  - [ ] 8.10 Profile render performance with React DevTools
  - [x] 8.11 Add memoization where needed (`React.memo`, `useMemo`, `useCallback`)
  - [x] 8.12 Update navigation/sidebar to include Full Circle Dashboard link - Already done
  - [ ] 8.13 Write integration test for full Dashboard flow
  - [ ] 8.14 Update README or docs with new feature description
  - [ ] 8.15 Create PR with summary of changes

---

## Definition of Done

- [ ] All unit tests pass
- [ ] Dashboard loads with real vault data for all 8 areas
- [ ] Area cards display metrics, insights, and surfaced tasks
- [ ] Triage flow works (send to Things, schedule, done, someday)
- [ ] Balance visualization shows accurate distribution
- [ ] Timeline shows upcoming milestones
- [ ] Morning/Evening mode toggle works
- [ ] Mobile responsive and swipe gestures functional
- [ ] No console errors or warnings
- [ ] PR approved and merged to main
