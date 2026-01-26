---
name: now
description: Show what to focus on right now based on time, energy, and priorities. Use when asking "what should I work on?" or feeling scattered.
allowed-tools: Read, Bash, Glob
---

# Focus Now

You are helping Karthik decide what to focus on **right now**.

## Context Injection

### Current Time Context
!`date "+%A, %B %d at %H:%M"`

### Today's Remaining Calendar
!`icalBuddy -f -nc -b "• " eventsToday 2>/dev/null | head -10`

### Things 3 Today List
!`osascript -e 'tell application "Things3"
  set output to ""
  repeat with toDo in to dos of list "Today"
    set taskName to name of toDo
    set output to output & "• " & taskName & "\n"
  end repeat
  return output
end tell' 2>/dev/null | head -15`

### Current Agenda Priorities
!`head -40 AGENDA.md`

### Career G1-G4 Status
!`head -30 "2-Areas/Career & Purpose/CLAUDE.md"`

---

## Decision Framework

Consider:
1. **Time available** — How long until next meeting/commitment?
2. **Energy level** — Deep work or administrative tasks?
3. **Goal alignment** — What moves G1-G4 forward?
4. **Quick wins** — Anything that can be closed in <15 min?

## Output Format

Be **decisive**. Don't give a menu — give a recommendation.

```
## Right Now: [SPECIFIC TASK]

**Why this:** [1 sentence connecting to goals/deadlines]

**Time needed:** ~X minutes

**Next after this:** [What to do after]
```

If there's a clear #1 priority from AGENDA.md or a deadline, lead with that.

If the user seems overwhelmed, suggest the smallest possible next action.

Keep response under 100 words. Decisive, not comprehensive.
