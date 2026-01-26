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

### Yesterday's Daily Note (if exists)
!`ls -t Daily/2026/01/*.md 2>/dev/null | head -1 | xargs tail -30 2>/dev/null || echo "No recent daily note"`

---

## Generate the Brief

Create a **concise tactical brief** with these sections:

### 1. The One Thing
What is THE most important thing to accomplish today? Connect to G1-G4 goals or current priorities from AGENDA.md.

### 2. Calendar Shape
Summarize today's schedule. Note focus blocks vs meeting-heavy periods.

### 3. Top 3 Priorities
Three actionable items for today, ranked. Include deadlines if relevant.

### 4. Quick Win
One small task that can be completed in <15 minutes to build momentum.

### 5. Watch Out
One potential derailment to avoid today (meeting overload, rabbit holes, etc.)

---

## Output Format

Keep it **scannable** — bullet points, not paragraphs. Total length: ~200-300 words.

Start with: "Good morning, Karthik. Here's your brief for [DATE]."

End with a **spark** — a short motivating line tied to the 2026 word "Emergence" or current goals.
