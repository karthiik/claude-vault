import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import vaultConfig from '../config/vault.config.js';

const execAsync = promisify(exec);
const router = Router();

// ============================================
// SMART NOW API
// AI-prioritized tasks + filtered calendar
// ============================================

// Build routine patterns from config
const ROUTINE_PATTERNS = (vaultConfig.routineMeetingPatterns || [
  'standup', 'stand-up', 'daily sync', 'lunch', 'break', 'coffee',
  'team sync', 'quick sync', 'check-in', 'weekly sync', 'office hours',
  'focus time', 'blocked', 'do not disturb', 'out of office', 'commute', 'travel'
]).map(p => new RegExp(p.replace(/[-\s]/g, '[-\\s]?'), 'i'));

// Full Circle area mapping from config
const AREA_MAPPING = vaultConfig.thingsMapping || {
  'health': 'health', 'fitness': 'health', 'gym': 'health', 'wellness': 'health',
  'relationships': 'relationships', 'family': 'relationships', 'friends': 'relationships',
  'career': 'career', 'work': 'career', 'professional': 'career',
  'finances': 'finances', 'finance': 'finances', 'money': 'finances',
  'learning': 'learning', 'education': 'learning', 'study': 'learning',
  'joy': 'joy', 'fun': 'joy', 'hobbies': 'joy', 'travel': 'joy',
  'home': 'home', 'house': 'home', 'household': 'home',
  'contribution': 'contribution', 'legacy': 'contribution', 'mentoring': 'contribution'
};

/**
 * Map a Things 3 area/project to a Full Circle area
 */
function mapToFullCircleArea(thingsArea, projectName) {
  const searchTerms = [
    thingsArea?.toLowerCase(),
    projectName?.toLowerCase()
  ].filter(Boolean);

  for (const term of searchTerms) {
    for (const [keyword, area] of Object.entries(AREA_MAPPING)) {
      if (term.includes(keyword)) {
        return area;
      }
    }
  }

  return 'career'; // Default fallback
}

/**
 * Calculate priority score for a task (0-100)
 */
function calculateTaskScore(task, calendarEvents, currentHour) {
  let score = 50; // Base score

  const today = new Date().toISOString().split('T')[0];

  // 1. Deadline pressure (25 points max)
  if (task.deadline) {
    if (task.deadline === today) {
      score += 25; // Due today = max urgency
    } else if (task.deadline < today) {
      score += 30; // Overdue = even higher
    } else {
      const daysUntil = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 2) score += 15;
      else if (daysUntil <= 7) score += 5;
    }
  }

  // 2. Energy match with time of day (20 points max)
  const energyPhase = getEnergyPhase(currentHour);
  const taskEnergy = detectTaskEnergy(task);

  if (energyPhase === 'peak' && taskEnergy === 'deep') {
    score += 20; // Deep work during peak hours
  } else if (energyPhase === 'low' && taskEnergy === 'quick') {
    score += 15; // Quick tasks during low energy
  } else if (energyPhase === 'moderate' && taskEnergy === 'creative') {
    score += 15;
  }

  // 3. Calendar fit (15 points max)
  // Boost quick tasks if there's a meeting soon
  const nextMeeting = calendarEvents.find(e => {
    if (!e.time) return false;
    const [h, m] = e.time.split(':').map(Number);
    const eventMins = h * 60 + m;
    const nowMins = currentHour * 60 + new Date().getMinutes();
    return eventMins > nowMins && eventMins - nowMins <= 60;
  });

  if (nextMeeting && taskEnergy === 'quick') {
    score += 15; // Quick win before meeting
  }

  // 4. Things 3 "Today" list bonus (10 points)
  if (task.source === 'things3') {
    score += 10; // Already prioritized by user
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Determine energy phase based on time of day
 */
function getEnergyPhase(hour) {
  if (hour >= 6 && hour < 11) return 'peak';      // Morning peak
  if (hour >= 11 && hour < 13) return 'moderate'; // Late morning
  if (hour >= 13 && hour < 15) return 'low';      // Post-lunch dip
  if (hour >= 15 && hour < 17) return 'moderate'; // Afternoon recovery
  if (hour >= 17 && hour < 19) return 'low';      // Evening wind-down
  return 'low';
}

/**
 * Detect task energy level from tags or text
 */
function detectTaskEnergy(task) {
  const text = (task.text || '').toLowerCase();
  const tags = (task.tags || []).map(t => t.toLowerCase());

  // Check explicit tags
  if (tags.some(t => t.includes('deep') || t.includes('focus'))) return 'deep';
  if (tags.some(t => t.includes('quick') || t.includes('fast'))) return 'quick';
  if (tags.some(t => t.includes('creative'))) return 'creative';

  // Infer from task text
  if (text.includes('review') || text.includes('analyze') || text.includes('plan') || text.includes('strategy')) {
    return 'deep';
  }
  if (text.includes('reply') || text.includes('email') || text.includes('book') || text.includes('schedule') || text.includes('call')) {
    return 'quick';
  }
  if (text.includes('draft') || text.includes('create') || text.includes('design') || text.includes('write')) {
    return 'creative';
  }

  return 'quick'; // Default
}

/**
 * Check if a calendar event is routine (should be filtered)
 */
function isRoutineEvent(event) {
  const title = event.title || '';
  return ROUTINE_PATTERNS.some(pattern => pattern.test(title));
}

// ============================================
// AI INSIGHT STRATEGIES
// 1. Gap Finder - Opportunistic time slots
// 2. Strategic Guardian - Protect high-priority work
// 3. Full Circle Pulse - Life balance check
// ============================================

/**
 * Strategic keywords from config (indicate high-priority strategic work)
 */
const STRATEGIC_KEYWORDS = vaultConfig.strategicKeywords || [
  'thesis', 'innovation', 'strategy', 'vision',
  'thought leader', 'speaking', 'article', 'linkedin', 'substack',
  'learning', 'mentor', 'create', 'build', 'launch'
];

/**
 * Operational keywords from config (indicate reactive work)
 */
const OPERATIONAL_KEYWORDS = vaultConfig.operationalKeywords || [
  'review', 'approve', 'sync', 'follow up', 'reply', 'email',
  'meeting', 'call', '1:1', 'budget', 'contract', 'issue'
];

/**
 * Detect if a task is strategic (vs operational)
 */
function isStrategicTask(task) {
  const text = (task.text || '').toLowerCase();
  const project = (task.projectName || '').toLowerCase();
  const combined = `${text} ${project}`;

  return STRATEGIC_KEYWORDS.some(kw => combined.includes(kw));
}

/**
 * Detect if a task is operational/reactive
 */
function isOperationalTask(task) {
  const text = (task.text || '').toLowerCase();
  return OPERATIONAL_KEYWORDS.some(kw => text.includes(kw));
}

/**
 * INSIGHT STRATEGY 1: GAP FINDER
 * Find opportunistic time slots between meetings
 */
function generateGapFinderInsight(tasks, calendarEvents, currentHour) {
  const now = new Date();
  const currentMins = currentHour * 60 + now.getMinutes();

  // Parse events into time slots
  const slots = calendarEvents
    .filter(e => e.time && e.time !== 'All day')
    .map(e => {
      const [h, m] = e.time.split(':').map(Number);
      const startMins = h * 60 + m;
      const endMins = startMins + (e.duration || 60);
      return { start: startMins, end: endMins, title: e.title };
    })
    .sort((a, b) => a.start - b.start);

  // Find gaps from now until end of day
  const gaps = [];
  let searchFrom = currentMins;

  for (const slot of slots) {
    if (slot.start > searchFrom) {
      const gapMins = slot.start - searchFrom;
      if (gapMins >= 15) {
        gaps.push({
          startMins: searchFrom,
          duration: gapMins,
          beforeMeeting: slot.title
        });
      }
    }
    searchFrom = Math.max(searchFrom, slot.end);
  }

  // Add gap after last meeting until 6pm
  const endOfDay = 18 * 60;
  if (searchFrom < endOfDay) {
    gaps.push({
      startMins: searchFrom,
      duration: endOfDay - searchFrom,
      beforeMeeting: null
    });
  }

  if (gaps.length === 0 || tasks.length === 0) return null;

  // Find the best gap and match a task
  const bestGap = gaps[0];
  const gapHours = Math.floor(bestGap.duration / 60);
  const gapMins = bestGap.duration % 60;
  const gapStr = gapHours > 0
    ? `${gapHours}h${gapMins > 0 ? ` ${gapMins}m` : ''}`
    : `${gapMins}m`;

  // Match task energy to gap size
  let matchedTask;
  if (bestGap.duration >= 60) {
    // Long gap: deep or creative work
    matchedTask = tasks.find(t => detectTaskEnergy(t) === 'deep')
               || tasks.find(t => isStrategicTask(t))
               || tasks[0];
  } else if (bestGap.duration >= 30) {
    // Medium gap: creative or moderate tasks
    matchedTask = tasks.find(t => detectTaskEnergy(t) === 'creative')
               || tasks[0];
  } else {
    // Short gap: quick wins only
    matchedTask = tasks.find(t => detectTaskEnergy(t) === 'quick')
               || tasks.find(t => !isStrategicTask(t));
  }

  if (!matchedTask) return null;

  const contextStr = bestGap.beforeMeeting
    ? ` before "${truncate(bestGap.beforeMeeting, 20)}"`
    : '';

  return {
    id: 'gap-finder',
    type: 'opportunity',
    icon: '⏱️',
    message: `${gapStr} gap${contextStr}. "${truncate(matchedTask.text, 35)}" fits.`,
    action: bestGap.duration >= 30 ? 'Use this window' : 'Quick win',
    taskId: matchedTask.id,
    meta: { gapMinutes: bestGap.duration }
  };
}

/**
 * INSIGHT STRATEGY 2: STRATEGIC GUARDIAN
 * Protect high-priority strategic work from operational creep
 */
function generateStrategicGuardianInsight(tasks, calendarEvents) {
  // Find strategic tasks
  const strategicTasks = tasks.filter(t => isStrategicTask(t));
  const operationalTasks = tasks.filter(t => isOperationalTask(t));

  if (strategicTasks.length === 0) return null;

  const topStrategic = strategicTasks[0];
  const today = new Date().toISOString().split('T')[0];

  // Check if strategic task has a deadline approaching
  let urgencyNote = '';
  if (topStrategic.deadline) {
    const daysUntil = Math.ceil(
      (new Date(topStrategic.deadline) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 0) {
      urgencyNote = ' — overdue';
    } else if (daysUntil <= 3) {
      urgencyNote = ` — ${daysUntil} day${daysUntil > 1 ? 's' : ''} left`;
    } else if (daysUntil <= 7) {
      urgencyNote = ` — due this week`;
    }
  }

  // Calculate operational load
  const operationalRatio = tasks.length > 0
    ? operationalTasks.length / tasks.length
    : 0;

  // Count meetings today
  const meetingCount = calendarEvents.filter(e => !e.isAllDay).length;

  // Generate appropriate message based on context
  if (operationalRatio > 0.6 && strategicTasks.length > 0) {
    // Too much operational work crowding strategic
    return {
      id: 'strategic-guardian',
      type: 'guardian',
      icon: '🛡️',
      message: `Operational tasks dominating. "${truncate(topStrategic.text, 30)}" needs protected time${urgencyNote}.`,
      action: 'Protect 30 min',
      taskId: topStrategic.id,
      meta: { operationalRatio, meetingCount }
    };
  }

  if (meetingCount >= 4 && strategicTasks.length > 0) {
    // Meeting-heavy day
    return {
      id: 'strategic-guardian',
      type: 'guardian',
      icon: '🛡️',
      message: `${meetingCount} meetings today. Timebox one for "${truncate(topStrategic.text, 30)}"${urgencyNote}.`,
      action: 'Block time',
      taskId: topStrategic.id,
      meta: { operationalRatio, meetingCount }
    };
  }

  if (urgencyNote && strategicTasks.length > 0) {
    // Strategic task with deadline
    return {
      id: 'strategic-guardian',
      type: 'guardian',
      icon: '🛡️',
      message: `"${truncate(topStrategic.text, 35)}"${urgencyNote}. What's the smallest next step?`,
      action: 'Start now',
      taskId: topStrategic.id,
      meta: { operationalRatio, meetingCount }
    };
  }

  return null;
}

/**
 * INSIGHT STRATEGY 3: FULL CIRCLE PULSE
 * Track life area balance and surface neglected areas
 */
function generateFullCirclePulseInsight(tasks, vaultTasks) {
  const allTasks = [...tasks, ...vaultTasks];

  // Count tasks by area
  const areaCounts = {};
  const areaLabels = {
    health: '🏃 Health',
    relationships: '💛 Relationships',
    career: '🚀 Career',
    finances: '💰 Finances',
    learning: '📚 Learning',
    joy: '🎨 Joy',
    home: '🏠 Home',
    contribution: '🌟 Contribution'
  };

  // Initialize all areas
  Object.keys(areaLabels).forEach(a => areaCounts[a] = 0);

  allTasks.forEach(t => {
    const area = t.fullCircleArea || 'career';
    areaCounts[area] = (areaCounts[area] || 0) + 1;
  });

  const totalTasks = allTasks.length;
  if (totalTasks < 2) return null;

  // Find dominant and neglected areas
  const sorted = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0];
  const neglected = sorted.filter(([area, count]) => count === 0);

  // Calculate dominance percentage
  const dominancePercent = Math.round((dominant[1] / totalTasks) * 100);

  // Priority neglected areas (these fuel energy for strategic work)
  const priorityNeglected = neglected.filter(([area]) =>
    ['health', 'relationships', 'joy'].includes(area)
  );

  if (dominancePercent >= 60 && priorityNeglected.length > 0) {
    // Heavy imbalance with energy-fueling areas neglected
    const neglectedLabels = priorityNeglected
      .slice(0, 2)
      .map(([a]) => areaLabels[a])
      .join(', ');

    // Find a task from neglected area in vault
    const rebalanceTask = vaultTasks.find(t =>
      priorityNeglected.some(([a]) => t.fullCircleArea === a)
    );

    return {
      id: 'full-circle-pulse',
      type: 'balance',
      icon: '⚖️',
      message: `${areaLabels[dominant[0]]} at ${dominancePercent}%. ${neglectedLabels} could use attention.`,
      action: rebalanceTask ? 'Quick rebalance' : 'Notice this',
      taskId: rebalanceTask?.id,
      meta: { areaCounts, dominancePercent }
    };
  }

  if (dominant[1] >= 4 && neglected.length >= 3) {
    // Many areas neglected
    return {
      id: 'full-circle-pulse',
      type: 'balance',
      icon: '⚖️',
      message: `${neglected.length} life areas have no tasks today. Full Circle check: what's being crowded out?`,
      action: 'Review balance',
      meta: { areaCounts, neglectedCount: neglected.length }
    };
  }

  return null;
}

/**
 * Generate AI insights using all three strategies
 */
function generateInsights(tasks, calendarEvents, vaultTasks, currentHour) {
  const insights = [];

  // Strategy 1: Gap Finder (opportunistic time slots)
  const gapInsight = generateGapFinderInsight(tasks, calendarEvents, currentHour);
  if (gapInsight) insights.push(gapInsight);

  // Strategy 2: Strategic Guardian (protect important work)
  const guardianInsight = generateStrategicGuardianInsight(tasks, calendarEvents);
  if (guardianInsight) insights.push(guardianInsight);

  // Strategy 3: Full Circle Pulse (life balance)
  const pulseInsight = generateFullCirclePulseInsight(tasks, vaultTasks);
  if (pulseInsight) insights.push(pulseInsight);

  // Fallback: If no insights generated, show vault triage nudge
  if (insights.length === 0 && vaultTasks.length > 0) {
    insights.push({
      id: 'triage-fallback',
      type: 'nudge',
      icon: '📥',
      message: `${vaultTasks.length} vault tasks to triage. Start with "${truncate(vaultTasks[0].text, 35)}"`,
      action: 'Triage',
      taskId: vaultTasks[0].id
    });
  }

  return insights;
}

/**
 * Truncate text to max length
 */
function truncate(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

/**
 * Format time for display
 */
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')}${period}`;
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * GET /api/smart-now
 * Returns prioritized tasks + filtered calendar + AI insights
 */
router.get('/', async (req, res) => {
  try {
    const currentHour = new Date().getHours();

    // Fetch data in parallel
    const [thingsData, calendarData, vaultData] = await Promise.all([
      fetchThings3Tasks(),
      fetchTodayCalendar(),
      fetchVaultTasks(req.app.get('vaultRoot'))
    ]);

    // Process calendar - separate important from routine
    const allEvents = calendarData.events || [];
    const importantEvents = [];
    const routineEvents = [];

    for (const event of allEvents) {
      if (isRoutineEvent(event)) {
        routineEvents.push({ ...event, filtered: true });
      } else {
        // Add AI notes for important events
        const aiNote = generateEventNote(event, thingsData);
        importantEvents.push({ ...event, aiNote, filtered: false });
      }
    }

    // Score and sort Things 3 tasks
    const scoredTasks = thingsData.map(task => ({
      ...task,
      score: calculateTaskScore(task, importantEvents, currentHour),
      energy: detectTaskEnergy(task),
      fullCircleArea: mapToFullCircleArea(task.area, task.projectName)
    })).sort((a, b) => b.score - a.score);

    // Split into focus (top 3) and later
    const focusTasks = scoredTasks.slice(0, 3);
    const laterTasks = scoredTasks.slice(3);

    // Process vault tasks
    const processedVault = vaultData.map(task => ({
      ...task,
      energy: detectTaskEnergy(task),
      fullCircleArea: mapToFullCircleArea(null, task.projectName)
    }));

    // Generate AI insights
    const insights = generateInsights(scoredTasks, importantEvents, processedVault, currentHour);

    res.json({
      // Tasks
      focus: focusTasks,
      later: laterTasks,
      vault: processedVault,

      // Calendar
      calendar: {
        important: importantEvents,
        routineCount: routineEvents.length,
        date: calendarData.date,
        dayName: calendarData.dayName
      },

      // AI
      insights,

      // Meta
      timestamp: new Date().toISOString(),
      energyPhase: getEnergyPhase(currentHour)
    });

  } catch (error) {
    console.error('[SmartNow] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate AI note for a calendar event
 */
function generateEventNote(event, tasks) {
  const eventTitle = (event.title || '').toLowerCase();

  // Find related tasks
  const related = tasks.find(t => {
    const taskText = (t.text || '').toLowerCase();
    // Check for keyword overlap
    const eventWords = eventTitle.split(/\s+/).filter(w => w.length > 3);
    return eventWords.some(word => taskText.includes(word));
  });

  if (related) {
    return `Prep: "${related.text}"`;
  }

  return null;
}

// ============================================
// DATA FETCHERS
// ============================================

async function fetchThings3Tasks() {
  try {
    const { stdout } = await execAsync(`osascript -e '
      tell application "Things3"
        set output to ""
        repeat with toDo in to dos of list "Today"
          set taskName to name of toDo
          set projectName to ""
          set areaName to ""
          set tagNames to ""
          set deadlineStr to ""
          set taskId to id of toDo

          try
            set projectName to name of project of toDo
          end try

          try
            set areaName to name of area of toDo
          end try

          try
            set taskTags to tags of toDo
            repeat with t in taskTags
              set tagNames to tagNames & name of t & ","
            end repeat
          end try

          try
            set d to deadline of toDo
            if d is not missing value then
              set y to year of d
              set m to month of d as integer
              set dy to day of d
              if m < 10 then set m to "0" & m
              if dy < 10 then set dy to "0" & dy
              set deadlineStr to (y as string) & "-" & (m as string) & "-" & (dy as string)
            end if
          end try

          set output to output & taskName & "|||" & projectName & "|||" & areaName & "|||" & tagNames & "|||" & deadlineStr & "|||" & taskId & "\\n"
        end repeat
        return output
      end tell
    ' 2>/dev/null`);

    return stdout.trim().split('\n').filter(l => l).map((line, idx) => {
      const [title, project, area, tagsStr, deadline, uuid] = line.split('|||');
      const tags = tagsStr ? tagsStr.split(',').filter(t => t.trim()).map(t => `#${t.trim()}`) : [];

      return {
        id: `things3:${uuid || idx}`,
        text: title || 'Untitled',
        projectName: project || null,
        area: area || null,
        tags,
        deadline: deadline || null,
        source: 'things3',
        thingsUuid: uuid
      };
    });
  } catch (error) {
    console.error('[SmartNow] Things3 fetch error:', error.message);
    return [];
  }
}

async function fetchTodayCalendar() {
  try {
    const { stdout } = await execAsync(
      `icalBuddy -f -ea -nc -b "" -ps "|||" -po "datetime,title,location,attendees,calendar" -df "%H:%M" -tf "%H:%M" eventsToday 2>/dev/null || echo ""`
    );

    const events = [];
    const lines = stdout.trim().split('\n').filter(l => l.trim());

    for (const line of lines) {
      const parts = line.split('|||').map(p => p.trim());
      if (parts.length >= 2) {
        const timeMatch = parts[0].match(/^(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?/);

        let startTime = null;
        let endTime = null;
        let duration = null;

        if (timeMatch) {
          startTime = timeMatch[1];
          endTime = timeMatch[2] || null;

          if (startTime && endTime) {
            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);
            duration = (eh * 60 + em) - (sh * 60 + sm);
          }
        }

        // Parse attendees
        const attendeesStr = parts[3] || '';
        const attendees = attendeesStr
          .split(',')
          .map(a => a.trim())
          .filter(a => a && !a.includes('@') && a.length < 40)
          .slice(0, 3);

        events.push({
          time: startTime || 'All day',
          endTime,
          duration,
          title: parts[1] || 'Untitled',
          location: parts[2] || null,
          attendees: attendees.length > 0 ? attendees : null,
          calendar: parts[4] || null,
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

    return {
      date: new Date().toISOString().split('T')[0],
      dayName: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      events
    };
  } catch (error) {
    console.error('[SmartNow] Calendar fetch error:', error.message);
    return { events: [], date: new Date().toISOString().split('T')[0] };
  }
}

async function fetchVaultTasks(vaultRoot) {
  if (!vaultRoot) return [];

  // Get folder names from config
  const folders = vaultConfig.folders || { projects: '1-Projects', daily: 'Daily' };

  try {
    // Import dependencies for vault scanning
    const { glob } = await import('glob');
    const fs = await import('fs/promises');
    const matter = (await import('gray-matter')).default;
    const { join } = await import('path');

    const tasks = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoMs = sevenDaysAgo.getTime();

    // === 1. Scan Daily files from last 7 days (by filename date) ===
    const dailyFiles = await glob(join(vaultRoot, folders.daily, '**/*.md'));

    const recentDailyFiles = dailyFiles.filter(file => {
      const fileName = file.split('/').pop();

      // Skip _Index files
      if (fileName.includes('_Index') || fileName.includes('_index')) {
        return false;
      }

      // Extract date from filename (expects format like 2026-01-26.md)
      const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return false;

      const fileDate = new Date(dateMatch[1]);
      return fileDate >= sevenDaysAgo;
    });

    // Sort daily files by date descending (most recent first)
    recentDailyFiles.sort((a, b) => {
      const dateA = a.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
      const dateB = b.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
      return dateB.localeCompare(dateA);
    });

    // === 2. Scan Project files modified in last 7 days (by mtime) ===
    const projectFiles = await glob(join(vaultRoot, folders.projects, '**/*.md'));

    const recentProjectFiles = [];
    for (const file of projectFiles) {
      const fileName = file.split('/').pop();

      // Skip _Index files
      if (fileName.includes('_Index') || fileName.includes('_index')) {
        continue;
      }

      // Check file modification time
      try {
        const stat = await fs.stat(file);
        if (stat.mtimeMs >= sevenDaysAgoMs) {
          recentProjectFiles.push({ file, mtime: stat.mtimeMs });
        }
      } catch {
        // Skip files that can't be stat'd
      }
    }

    // Sort project files by modification time descending
    recentProjectFiles.sort((a, b) => b.mtime - a.mtime);

    // === 3. Process all files and extract tasks ===
    const allFiles = [
      ...recentDailyFiles.map(f => ({ file: f, sourceType: 'daily' })),
      ...recentProjectFiles.map(f => ({ file: f.file, sourceType: 'project' }))
    ];

    for (const { file, sourceType } of allFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const { content: body } = matter(content);
        const relativePath = file.replace(vaultRoot + '/', '');
        const fileName = file.split('/').pop().replace('.md', '');

        const lines = body.split('\n');
        lines.forEach((line, index) => {
          // Match unchecked tasks: - [ ] task text
          // Exclude already triaged tasks: - [>] or - [x]
          const taskMatch = line.match(/^(\s*)-\s*\[\s*\]\s*(.+)$/);
          if (taskMatch) {
            const taskText = taskMatch[2];
            const deadlineMatch = taskText.match(/📅\s*(\d{4}-\d{2}-\d{2})/);

            tasks.push({
              id: `vault:${relativePath}:${index}`,
              text: taskText.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '').replace(/#[\w/]+/g, '').trim(),
              deadline: deadlineMatch ? deadlineMatch[1] : null,
              filePath: relativePath,
              lineNumber: index,
              sourceType,
              projectName: fileName
            });
          }
        });
      } catch {
        // Skip files that can't be read
      }
    }

    return tasks;
  } catch (error) {
    console.error('[SmartNow] Vault scan error:', error.message);
    return [];
  }
}

export default router;
