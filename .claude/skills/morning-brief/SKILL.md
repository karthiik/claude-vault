---
name: morning-brief
description: Generate tactical morning brief with calendar, tasks, and focus recommendations. Use at start of day or when user asks for their brief.
allowed-tools: Read, Bash, Glob, Grep
---

# Morning Brief Generator

You are generating Karthik's tactical morning brief. Today is a **weekday** — focus on execution.

## Context Injection

### Identity & Goals
!`head -60 CLAUDE.md`

### Current Agenda
!`cat AGENDA.md`

### Today's Calendar
!`icalBuddy -f -nc -b "• " eventsToday 2>/dev/null || echo "Calendar not available"`

### Things 3 Today List
!`osascript -e 'tell application "Things3"
  set output to ""
  repeat with toDo in to dos of list "Today"
    set taskName to name of toDo
    set output to output & "• " & taskName & "\n"
  end repeat
  return output
end tell' 2>/dev/null || echo "Things 3 not available"`

---

## Step 1: Review Yesterday (REQUIRED)

**Always read yesterday's full daily note first** to understand context and carryover:

```bash
# Calculate yesterday's date and read the note
./cli.sh read "Daily/$(date -v-1d +%Y/%m/%Y-%m-%d).md"
```

**Extract from yesterday:**
1. **Open threads** — from the "🔥 Open Threads to Track" section
2. **Incomplete tasks** — items in "✅ Things 3: Today" that weren't checked off
3. **Action items** — from meeting notes or capture sections
4. **Waiting items** — anything blocked on others
5. **Evening close insights** — Win/Better/Grateful/Tomorrow's #1 (if filled)
6. **Personal context** — any life events, travel, energy notes worth being mindful of

---

## Step 2: Look Forward (Today)

Review today's calendar and tasks to understand the day shape:

1. **Meetings** — What's on the calendar? Which require prep?
2. **Deadlines** — What's due today or this week?
3. **Travel/Location** — Where is Karthik physically? Any timezone considerations?
4. **Energy budget** — Heavy day vs light day? When are focus blocks?

---

## Generate the Brief

Create a **concise tactical brief** with these sections:

### 1. 🔄 Carryover from Yesterday
- **Open threads** still active
- **Tasks to verify** — did they get done?
- **Commitments made** — things said but not yet tracked
- **Personal context** — energy, travel, life events to be mindful of

### 2. 🎯 The One Thing
What is THE most important thing to accomplish today? Connect to G1-G4 goals or current priorities from AGENDA.md.

### 3. 📅 Calendar Shape
Summarize today's schedule. Note focus blocks vs meeting-heavy periods.

### 4. ⚡ Top 3 Priorities
Three actionable items for today, ranked. Include deadlines if relevant.

### 5. 🏃 Quick Win
One small task that can be completed in <15 minutes to build momentum.

### 6. ⚠️ Watch Out
One potential derailment to avoid today (meeting overload, rabbit holes, etc.)

### 7. 👀 Looking Ahead
- Upcoming deadlines this week
- Tomorrow's big items (if relevant)
- Any prep needed for future meetings

---

## Output Format

Keep it **scannable** — bullet points, not paragraphs. Total length: ~300-400 words.

Start with: "Good morning, Karthik. Here's your brief for [DATE]."

End with a **spark** — a short motivating line tied to the 2026 word "Emergence" or current goals.
