import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// Cache for calendar data
let calendarCache = {
  today: null,
  tomorrow: null,
  timestamp: null
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid() {
  return calendarCache.timestamp && (Date.now() - calendarCache.timestamp) < CACHE_TTL;
}

// Get today's events
router.get('/today', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';

  if (!forceRefresh && isCacheValid() && calendarCache.today) {
    return res.json({ ...calendarCache.today, fromCache: true });
  }

  try {
    const data = await fetchTodayEvents();
    calendarCache.today = data;
    calendarCache.timestamp = Date.now();
    res.json(data);
  } catch (error) {
    console.error('[Calendar] Error fetching today:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tomorrow's events
router.get('/tomorrow', async (req, res) => {
  try {
    const data = await fetchTomorrowEvents();
    res.json(data);
  } catch (error) {
    console.error('[Calendar] Error fetching tomorrow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get week overview (next 7 days)
router.get('/week', async (req, res) => {
  try {
    const data = await fetchWeekEvents();
    res.json(data);
  } catch (error) {
    console.error('[Calendar] Error fetching week:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available time blocks for today
router.get('/available-blocks', async (req, res) => {
  try {
    const events = await fetchTodayEvents();
    const blocks = calculateAvailableBlocks(events.events);
    res.json({ blocks, date: new Date().toISOString().split('T')[0] });
  } catch (error) {
    console.error('[Calendar] Error calculating blocks:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function fetchTodayEvents() {
  try {
    // icalBuddy format: start time | end time | title | location | calendar
    const { stdout } = await execAsync(
      `icalBuddy -f -ea -nc -b "" -ps "|||" -po "datetime,title,location,calendar" -df "%H:%M" -tf "%H:%M" eventsToday 2>/dev/null || echo ""`
    );

    const events = parseIcalBuddyOutput(stdout, 'today');

    return {
      date: new Date().toISOString().split('T')[0],
      dayName: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      events,
      eventCount: events.length,
      hasConflicts: detectConflicts(events)
    };
  } catch (error) {
    console.error('[Calendar] icalBuddy error:', error.message);
    return {
      date: new Date().toISOString().split('T')[0],
      events: [],
      eventCount: 0,
      error: 'Calendar not available'
    };
  }
}

async function fetchTomorrowEvents() {
  try {
    const { stdout } = await execAsync(
      `icalBuddy -f -ea -nc -b "" -ps "|||" -po "datetime,title,location,calendar" -df "%H:%M" -tf "%H:%M" eventsFrom:"tomorrow" to:"tomorrow" 2>/dev/null || echo ""`
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = parseIcalBuddyOutput(stdout, 'tomorrow');

    return {
      date: tomorrow.toISOString().split('T')[0],
      dayName: tomorrow.toLocaleDateString('en-US', { weekday: 'long' }),
      events,
      eventCount: events.length
    };
  } catch (error) {
    console.error('[Calendar] Tomorrow fetch error:', error.message);
    return { events: [], eventCount: 0 };
  }
}

async function fetchWeekEvents() {
  try {
    // Get events for next 7 days
    const { stdout } = await execAsync(
      `icalBuddy -f -ea -nc -b "" -ps "|||" -po "datetime,title,location,calendar" -df "%Y-%m-%d %H:%M" -tf "%H:%M" eventsFrom:"today" to:"today+7" 2>/dev/null || echo ""`
    );

    // Group by date
    const eventsByDay = {};
    const today = new Date();

    // Initialize all 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      eventsByDay[dateStr] = {
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        dayShort: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: i === 0,
        isTomorrow: i === 1,
        events: []
      };
    }

    // Parse and assign events
    const lines = stdout.trim().split('\n').filter(l => l.trim());
    for (const line of lines) {
      const parts = line.split('|||').map(p => p.trim());
      if (parts.length >= 2) {
        const dateTimeStr = parts[0];
        const dateMatch = dateTimeStr.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && eventsByDay[dateMatch[1]]) {
          const event = {
            time: dateTimeStr.replace(/^\d{4}-\d{2}-\d{2}\s*/, ''),
            title: parts[1] || 'Untitled',
            location: parts[2] || null,
            calendar: parts[3] || null
          };
          eventsByDay[dateMatch[1]].events.push(event);
        }
      }
    }

    return {
      days: Object.values(eventsByDay),
      totalEvents: lines.length
    };
  } catch (error) {
    console.error('[Calendar] Week fetch error:', error.message);
    return { days: [], totalEvents: 0 };
  }
}

function parseIcalBuddyOutput(stdout, dayLabel) {
  const events = [];
  const lines = stdout.trim().split('\n').filter(l => l.trim());

  for (const line of lines) {
    const parts = line.split('|||').map(p => p.trim());

    if (parts.length >= 2) {
      // Parse time range (e.g., "10:00 - 11:00" or "10:00")
      const timeStr = parts[0];
      const timeMatch = timeStr.match(/^(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?/);

      let startTime = null;
      let endTime = null;
      let duration = null;

      if (timeMatch) {
        startTime = timeMatch[1];
        endTime = timeMatch[2] || null;

        // Calculate duration if we have both times
        if (startTime && endTime) {
          const [sh, sm] = startTime.split(':').map(Number);
          const [eh, em] = endTime.split(':').map(Number);
          const startMins = sh * 60 + sm;
          const endMins = eh * 60 + em;
          const durationMins = endMins - startMins;

          if (durationMins > 0) {
            if (durationMins >= 60) {
              const hours = Math.floor(durationMins / 60);
              const mins = durationMins % 60;
              duration = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
            } else {
              duration = `${durationMins}min`;
            }
          }
        }
      }

      events.push({
        time: startTime || 'All day',
        endTime,
        duration,
        title: parts[1] || 'Untitled',
        location: parts[2] || null,
        calendar: parts[3] || null,
        isAllDay: !timeMatch
      });
    }
  }

  // Sort by time
  events.sort((a, b) => {
    if (a.isAllDay && !b.isAllDay) return -1;
    if (!a.isAllDay && b.isAllDay) return 1;
    return (a.time || '').localeCompare(b.time || '');
  });

  return events;
}

function detectConflicts(events) {
  // Simple overlap detection
  const timedEvents = events.filter(e => !e.isAllDay && e.time);

  for (let i = 0; i < timedEvents.length - 1; i++) {
    const current = timedEvents[i];
    const next = timedEvents[i + 1];

    if (current.endTime && next.time) {
      const [eh, em] = current.endTime.split(':').map(Number);
      const [nh, nm] = next.time.split(':').map(Number);
      const endMins = eh * 60 + em;
      const nextMins = nh * 60 + nm;

      if (endMins > nextMins) {
        return true; // Overlap detected
      }
    }
  }

  return false;
}

function calculateAvailableBlocks(events) {
  const blocks = [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  // Work hours: 8 AM to 6 PM
  const workStart = 8 * 60; // 8:00 AM in minutes
  const workEnd = 18 * 60;  // 6:00 PM in minutes

  // Get all meeting times
  const busyTimes = events
    .filter(e => !e.isAllDay && e.time && e.endTime)
    .map(e => {
      const [sh, sm] = e.time.split(':').map(Number);
      const [eh, em] = e.endTime.split(':').map(Number);
      return { start: sh * 60 + sm, end: eh * 60 + em, title: e.title };
    })
    .sort((a, b) => a.start - b.start);

  // Find gaps
  let cursor = Math.max(workStart, currentHour * 60 + currentMin);

  for (const busy of busyTimes) {
    if (busy.start > cursor) {
      const duration = busy.start - cursor;
      if (duration >= 30) { // At least 30 min blocks
        blocks.push({
          start: formatMinutes(cursor),
          end: formatMinutes(busy.start),
          duration: duration >= 60 ? `${Math.floor(duration / 60)}h` : `${duration}min`,
          type: duration >= 120 ? 'deep' : duration >= 60 ? 'focus' : 'quick'
        });
      }
    }
    cursor = Math.max(cursor, busy.end);
  }

  // Check for time after last meeting
  if (cursor < workEnd) {
    const duration = workEnd - cursor;
    if (duration >= 30) {
      blocks.push({
        start: formatMinutes(cursor),
        end: formatMinutes(workEnd),
        duration: duration >= 60 ? `${Math.floor(duration / 60)}h` : `${duration}min`,
        type: duration >= 120 ? 'deep' : duration >= 60 ? 'focus' : 'wrap'
      });
    }
  }

  return blocks;
}

function formatMinutes(mins) {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')}${period}`;
}

export default router;
