# icalBuddy + Templater Setup

One-time configuration to pull your calendar into daily notes.

---

## Step 1: Create the Script

Create a file at `~/.config/obsidian-scripts/calendar.sh`:

```bash
mkdir -p ~/.config/obsidian-scripts
```

Then create the file with this content:

```bash
#!/bin/bash
# Calendar events for Obsidian daily notes

/opt/homebrew/bin/icalBuddy \
  -npn \
  -nc \
  -ps "/: /" \
  -iep "datetime,title" \
  -po "datetime,title" \
  -tf "%H:%M" \
  -df "" \
  -ec "Birthdays,US Holidays,United States holidays,Kansas City Chiefs,PGA,Dallas Cowboys" \
  eventsToday
```

Make it executable:

```bash
chmod +x ~/.config/obsidian-scripts/calendar.sh
```

---

## Step 2: Test the Script

Run in Terminal:

```bash
~/.config/obsidian-scripts/calendar.sh
```

You should see today's events formatted like:

```
08:30: Team standup
10:00: Architecture review
14:00: 1:1 with Jamie
```

---

## Step 3: Configure Templater

1. Open Obsidian → **Settings** → **Templater**
2. Scroll to **User System Command Functions**
3. Click **Add New User Function**
4. Set:
   - **Function name:** `calendar`
   - **System command:** `~/.config/obsidian-scripts/calendar.sh`
5. **Enable** "Shell scripts in Templates folder" if prompted

---

## Step 4: Grant Permissions (First Run)

The first time Templater runs the script, macOS may ask for calendar permissions.

If it doesn't work:
1. Go to **System Settings → Privacy & Security → Calendars**
2. Ensure **Obsidian** has access
3. You may also need to grant access to **Terminal** or the shell

---

## Step 5: Test in Obsidian

Create a test note with:

```
<% tp.user.calendar() %>
```

Switch to Preview mode — your calendar should appear.

---

## Customization

### Exclude More Calendars

Edit the script and add calendar names to the `-ec` flag:

```bash
-ec "Birthdays,US Holidays,Calendar Name Here"
```

### Include Only Specific Calendars

Replace `-ec` with `-ic` (include calendars):

```bash
-ic "Work,Karthiks Personal,Ramadoss, Karthik"
```

### Show Location

Add `location` to the fields:

```bash
-iep "datetime,title,location"
```

---

## Your Calendars

Based on your setup, here are your calendars:

| Calendar | Type | Likely Use |
|----------|------|------------|
| Ramadoss, Karthik | Exchange | Work (Outlook) |
| Work | CalDAV | Work |
| Karthiks Personal | CalDAV | Personal |
| Vinay | CalDAV | Vinay's schedule |
| Household | CalDAV | Shared household |
| ❤️‍🔥🏋️Habits | CalDAV | Habit reminders |

**Excluded by default:** Birthdays, US Holidays, Sports (Chiefs, PGA, Cowboys)

---

## Troubleshooting

**"Calendar not configured" in daily note:**
- Templater user function not set up → Follow Step 3

**Empty calendar:**
- No events today, or permissions issue → Check System Settings

**Permission denied:**
- Run `chmod +x ~/.config/obsidian-scripts/calendar.sh`

**icalBuddy not found:**
- Reinstall: `brew install ical-buddy`

---

*Delete this file after setup is complete.*
