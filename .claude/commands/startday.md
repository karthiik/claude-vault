# Start Day

Execute the morning startup routine to prepare for the day ahead.

## Steps

### 1. Gather Context

Read these sources to understand the current state:

**Obsidian:**
- **Today's daily note** (`Daily/YYYY-MM-DD.md`) — calendar, any pre-populated items
- **Yesterday's daily note** — action items, evening close, meeting notes
- **Day before yesterday** (if relevant) — for continuity on multi-day threads
- **AGENDA.md** — open threads, current focus areas, recent activity

**Things 3:**
- Run `./cli.sh things today` — tasks scheduled for today
- Run `./cli.sh things anytime` — upcoming tasks that might be relevant
- Run `./cli.sh things areas` — tasks grouped by life area (Health, Career, Learning, etc.)

**Career Goals:**
- Read `2-Areas/Career & Purpose/2026 Career Goals.md` for G1/G2/G3 alignment

### 2. Cross-Reference: Things 3 ↔ Meetings ↔ Action Items

**For each meeting today:**
1. Search Things 3 tasks for keywords matching the meeting topic or attendees
2. Search yesterday's/recent action items for related tasks
3. Check if any Things 3 task is a prerequisite for the meeting
4. Flag if there's prep work that hasn't been done

**Correlation examples:**
- Meeting: "EA Assessment with Perficient" → Things task: "Complete EA assessment" → **Prep needed!**
- Meeting: "Byron 1:1" → Action item: "Synthesize survey results for Byron" → **Bring this up**
- Meeting: "Nate catch-up" → Yesterday's notes mention Producer Org → **Continue discussion**

### 3. Surface Open Threads

From the last 2-3 days, identify:
- **Unfinished action items** — especially #p1 and career-aligned tasks
- **Things 3 tasks due today/overdue** — anything that needs attention
- **Waiting items** — things blocked on others
- **Recurring themes** — people, projects, or topics that keep coming up
- **Commitments made** — things you said you'd do

### 4. Connect the Dots

Look for patterns and connections:
- Which meetings today relate to yesterday's discussions?
- Are there people you're meeting who you have open items with?
- Which Things 3 tasks align with today's meetings?
- What project threads are active right now?
- Any deadlines approaching?

### 5. Generate Morning Brief

Present a concise morning brief with:

```markdown
## ☀️ Morning Brief — [Day, Date]

### 🎯 Suggested #1 Priority
[Based on action items, Things 3, calendar, and career goals — what's THE most important thing today?]

### 📅 Today's Meetings — Context & Prep
| Time | Meeting | Context | Things 3 Tasks | Prep Needed |
|------|---------|---------|----------------|-------------|
| HH:MM | [Meeting] | [What this relates to] | [Related tasks] | [Yes/No - what?] |

### ✅ Things 3: Today
[List tasks from Things 3 Today list, noting which connect to meetings]

### 🔥 Open Threads to Track
- [Thread 1] — from [date], status: [status]
- [Thread 2] — from [date], status: [status]

### 🔗 Connections Today
- [Person X] — you have open item: [item]
- [Meeting Y] connects to Things task: [task]
- [Meeting Z] continues from yesterday's [topic]

### ⚠️ Heads Up
- [Anything time-sensitive or noteworthy]
- [Prep work not yet done]
- [Deadlines this week]
```

### 6. Set #1 Priority

Ask the user to confirm or adjust the suggested #1 priority, then update today's daily note in the `## 🎯 #1 Priority` section.

### 7. Career Goal Check

Quick reminder of which career goals (G1/G2/G3) today's activities support:
- G1: External Visibility
- G2: Innovation Leadership
- G3: Role Transition

## CLI Commands Used

```bash
# Things 3 queries
./cli.sh things today      # Today's tasks with areas
./cli.sh things anytime    # Upcoming tasks
./cli.sh things areas      # Tasks grouped by area

# Obsidian tasks
./cli.sh tasks --p1        # High priority vault tasks
./cli.sh read "Daily/YYYY-MM-DD.md"  # Read daily notes
```

## Notes

- Keep the brief scannable — bullet points, tables
- Prioritize actionable insights over information dumps
- **Highlight correlations** — when a Things 3 task relates to a meeting, make it obvious
- Flag anything that needs immediate attention
- If a meeting has no context from recent notes AND no Things 3 tasks, note that (might need prep)
- Link to relevant notes using `[[wikilinks]]` so user can click through
