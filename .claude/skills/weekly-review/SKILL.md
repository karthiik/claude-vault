---
name: weekly-review
description: Generate reflective weekend brief analyzing the past week's daily notes, patterns, and Full Circle balance. Use on weekends.
allowed-tools: Read, Bash, Glob, Grep
context: fork
agent: Explore
---

# Weekend Review Generator

You are generating Karthik's **reflective weekend brief**. This is about patterns, not tasks.

## Context Injection

### Identity & 2026 Intentions
!`head -80 CLAUDE.md`

### Full Circle Areas
!`cat 2-Areas/CLAUDE.md`

### Career Context (G1-G4 Goals)
!`head -60 "2-Areas/Career & Purpose/CLAUDE.md"`

### Current Agenda
!`cat AGENDA.md`

### This Week's Daily Notes
!`for f in $(ls -t Daily/2026/01/*.md 2>/dev/null | head -5); do echo "=== $f ==="; head -80 "$f"; echo ""; done`

---

## Generate the Weekend Brief

Create a **reflective analysis** with these sections:

### 1. Week in Review
- What got accomplished vs what was planned?
- Key wins to celebrate (connect to goals)
- What fell through the cracks and why?

### 2. Themes & Patterns
- What topics/projects dominated attention?
- Energy patterns: when did you feel energized vs drained?
- Relationships that came up (or didn't)
- Recurring blockers or friction points

### 3. Full Circle Balance
Create a simple assessment:

| Area | This Week | Notes |
|------|-----------|-------|
| 🚀 Career | Heavy/Light/Balanced | ... |
| 🏃 Health | Heavy/Light/Balanced | ... |
| 💛 Relationships | Heavy/Light/Balanced | ... |
| ... | ... | ... |

Flag any area that got zero attention.

### 4. Carry Forward
- Unfinished items needing attention next week
- Commitments made but not scheduled
- Open loops to close

### 5. Week Ahead
- Major events/deadlines coming
- Potential conflicts or pressure points
- Recommended focus areas

### 6. Coaching Question
End with ONE powerful question for reflection. Make it specific to what you observed in the notes, not generic. Challenge assumptions. Connect to Emergence.

---

## Output Format

This can be longer than the morning brief — ~500-800 words. Use headers and bullets for scannability.

Start with: "Week of [DATE RANGE] — Weekend Reflection"

Tone: Executive coach speaking to a peer, not a productivity app. Be honest about what you see.
