---
name: capture
description: Quick capture a thought, task, or idea. Use when saying "capture this" or "add to inbox" or "remind me about".
allowed-tools: Read, Write, Bash
argument-hint: <thought or task to capture>
---

# Quick Capture

Capture the user's input to the appropriate location.

## Input
$ARGUMENTS

## Decision Logic

### If it's a TASK (actionable, has a verb):
- **Needs date/reminder?** → Tell user to add to Things 3: `Add to Things 3: [task]`
- **Context-heavy/strategic?** → Add to today's daily note under Capture section
- **Inbox item to process later?** → Create note in `0-Inbox/`

### If it's an IDEA or THOUGHT:
- Add to today's daily note under `## Workspace > Capture`
- Format: `- [timestamp] [thought]`

### If it's a MEETING NOTE:
- Add to today's daily note under `## Workspace > Meeting Notes`
- Create a header for the meeting if specified

## Today's Daily Note Location
!`echo "Daily/$(date +%Y)/$(date +%m)/$(date +%Y-%m-%d).md"`

## Execution

1. Determine the appropriate location
2. Append the capture with timestamp
3. Confirm what was captured and where

## Output Format

Keep it brief:
```
✓ Captured to [location]: "[summary]"
```

If the daily note doesn't exist, create it first with minimal structure.
