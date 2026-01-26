---
name: triage
description: Process inbox items and uncategorized tasks. Use during weekly review or when inbox is overflowing.
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Inbox Triage

Help Karthik process items in the inbox and daily note captures.

## Context Injection

### Inbox Contents
!`ls -la 0-Inbox/*.md 2>/dev/null | head -20 || echo "Inbox empty"`

### Recent Captures in Daily Notes
!`grep -h "^- \[" Daily/2026/01/*.md 2>/dev/null | tail -20 || echo "No recent captures"`

### Full Circle Areas (for categorization)
!`grep -E "^### " 2-Areas/0_Areas_Index.md | head -10`

---

## Triage Process

For each item, decide:

1. **Delete** — Not needed, outdated, or duplicate
2. **Do** — Takes <2 minutes, just do it now
3. **Delegate** — Someone else should handle this
4. **Defer** — Add to Things 3 with a date
5. **File** — Move to appropriate Area or Project

## Triage Questions

For each item ask:
- Is this actionable? (Yes → task, No → reference or delete)
- Does it serve a life area? (Tag with `#area/...`)
- Does it belong to a project? (Move to project folder)
- Is it time-sensitive? (Add to Things 3)
- Is it someday/maybe? (Tag `#someday`, leave in vault)

## Output Format

Present items in a table for quick decisions:

| Item | Recommendation | Action |
|------|----------------|--------|
| [item] | Defer to Things 3 | `#area/career #p2` |
| [item] | File to Career | Move to `2-Areas/Career/` |
| [item] | Delete | Outdated |

After user confirms, execute the actions.

Keep the interaction efficient — batch similar items together.
