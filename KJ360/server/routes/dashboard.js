import { Router } from 'express';
import fs from 'fs/promises';
import { join } from 'path';

const router = Router();

// ============================================
// Status Brief Cache & History
// ============================================

// Today's brief
let briefCache = {
  brief: null,
  generatedAt: null
};

// Historical briefs (last 9 days, index 0 = yesterday, index 8 = 9 days ago)
let briefHistory = [];

// Helper to get date string for storage key
function getDateKey(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ============================================
// THE ONE THING METHODOLOGY
// ============================================
// "What's the ONE Thing I can do such that by doing it
// everything else will be easier or unnecessary?"

function analyzeForTheOneThing(tasksData, context = {}) {
  const todayTasks = tasksData?.days?.[0]?.tasks || [];
  const allWeekTasks = tasksData?.days?.flatMap(d => d.tasks) || [];

  // Scoring criteria for "The One Thing":
  // 1. Deadline urgency (due today = highest)
  // 2. Blocking factor (does completing this unblock other things?)
  // 3. Strategic importance (alignment with goals)
  // 4. Leverage (will this make other tasks easier?)

  let candidates = todayTasks.map(task => {
    let score = 0;
    let reasons = [];

    // Deadline scoring
    if (task.deadline) {
      const daysUntil = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 0) {
        score += 30;
        reasons.push('due today or overdue');
      } else if (daysUntil === 1) {
        score += 20;
        reasons.push('due tomorrow');
      }
    }

    // Project importance (heuristic: tasks in named projects > inbox)
    if (task.projectName && task.projectName !== 'Inbox') {
      score += 10;
      reasons.push(`advances ${task.projectName}`);
    }

    // Energy tags indicate preparation/planning
    if (task.tags?.some(t => t.toLowerCase().includes('deep'))) {
      score += 15;
      reasons.push('requires deep focus');
    }

    // Check if task name suggests it unblocks others
    const blockingKeywords = ['prep', 'setup', 'create', 'send', 'schedule', 'confirm', 'access'];
    if (blockingKeywords.some(kw => task.text.toLowerCase().includes(kw))) {
      score += 10;
      reasons.push('likely unblocks other work');
    }

    return { task, score, reasons };
  });

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  const topCandidate = candidates[0];

  if (!topCandidate) {
    return {
      focus: "Clear your inbox and review upcoming week",
      reasoning: "No urgent tasks today - use this time for planning and preparation."
    };
  }

  // Generate reasoning
  const reasonText = topCandidate.reasons.length > 0
    ? topCandidate.reasons.join(', ')
    : 'highest priority based on analysis';

  return {
    focus: topCandidate.task.text,
    taskId: topCandidate.task.id,
    projectName: topCandidate.task.projectName,
    reasoning: `This ${reasonText}. Completing this first will set up the rest of your day for success.`,
    score: topCandidate.score
  };
}

// ============================================
// Brief Generator (will be replaced with Claude skill)
// ============================================
function generateBrief(tasksData, calendarData, emailData) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const todayTasks = tasksData?.days?.[0]?.tasks || [];
  const totalTasks = tasksData?.totalTasks || 0;
  const weekTasks = tasksData?.days?.flatMap(d => d.tasks) || [];

  // Analyze for The One Thing
  const theOneThing = analyzeForTheOneThing(tasksData);

  // Generate overview based on available data
  let overview = `${dateStr} - `;

  if (todayTasks.length > 0) {
    const projects = [...new Set(todayTasks.map(t => t.projectName).filter(Boolean))];
    overview += `${todayTasks.length} tasks due today across ${projects.length} project${projects.length !== 1 ? 's' : ''}. `;

    // Find high priority items
    const deadlineTasks = todayTasks.filter(t => t.deadline);
    if (deadlineTasks.length > 0) {
      overview += `${deadlineTasks.length} task${deadlineTasks.length !== 1 ? 's have' : ' has'} hard deadlines. `;
    }

    // Highlight meetings if we had calendar data
    overview += `Focus on "${theOneThing.focus}" as your primary objective - everything else flows from there.`;
  } else {
    overview += `No urgent tasks scheduled. Perfect day for deep work, clearing backlog, or strategic planning. `;
    overview += `Consider tackling something from your "someday" list.`;
  }

  return {
    date: getDateKey(0),
    overview,
    theOneThing,
    generatedAt: new Date().toISOString(),
    tasksAnalyzed: totalTasks,
    dayStats: {
      todayCount: todayTasks.length,
      weekCount: weekTasks.length,
      projectCount: new Set(todayTasks.map(t => t.projectName).filter(Boolean)).size
    },
    recommendations: [
      {
        id: 1,
        title: 'Use morning block for The One Thing',
        description: `Dedicate your first focused block to "${theOneThing.focus}" before meetings or distractions.`,
        confidence: 90,
        priority: 'high'
      },
      {
        id: 2,
        title: 'Batch similar tasks together',
        description: 'Group related tasks to reduce context switching overhead.',
        confidence: 85,
        priority: 'medium'
      },
      {
        id: 3,
        title: 'Review and close loops before EOD',
        description: 'End the day by reviewing progress and capturing any open items.',
        confidence: 80,
        priority: 'medium'
      }
    ],
    goals: [
      {
        id: 1,
        name: 'Growing Indy Hall',
        currentPercent: 50,
        targetPercent: 40,
        change: 10,
        insight: 'Priority tasks and upcoming events drive high IH focus this week',
        color: 'bg-green-500'
      },
      {
        id: 2,
        name: 'Building partnerships',
        currentPercent: 30,
        targetPercent: 35,
        change: -5,
        insight: 'Several partnership threads in queue need attention',
        color: 'bg-yellow-500'
      },
      {
        id: 3,
        name: 'Strengthening relationships',
        currentPercent: 20,
        targetPercent: 25,
        change: -5,
        insight: 'Scheduled meetings help; consider reaching out to warming contacts',
        color: 'bg-yellow-400'
      }
    ],
    patterns: [
      'Task clustering: Related items can be batched for efficiency',
      'Calendar awareness: Block time for deep work on The One Thing',
      'Follow-up queue: Several threads awaiting responses'
    ]
  };
}

// ============================================
// GET /api/dashboard/brief - Get today's cached brief
// ============================================
router.get('/brief', async (req, res) => {
  try {
    const todayKey = getDateKey(0);

    // Check if cached brief is from today
    if (briefCache.brief && briefCache.brief.date === todayKey) {
      res.json({
        ...briefCache.brief,
        fromCache: true,
        cacheAge: Date.now() - new Date(briefCache.generatedAt).getTime()
      });
    } else {
      res.json({
        overview: null,
        theOneThing: null,
        generatedAt: null,
        needsGeneration: true
      });
    }
  } catch (err) {
    console.error('Error fetching brief:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GET /api/dashboard/brief/history - Get last 9 days of briefs
// ============================================
router.get('/brief/history', async (req, res) => {
  try {
    // Return historical briefs (already filtered to last 9 days)
    res.json({
      briefs: briefHistory,
      count: briefHistory.length
    });
  } catch (err) {
    console.error('Error fetching brief history:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GET /api/dashboard/brief/:date - Get brief for specific date
// ============================================
router.get('/brief/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const todayKey = getDateKey(0);

    if (date === todayKey && briefCache.brief) {
      return res.json(briefCache.brief);
    }

    // Search history
    const historicalBrief = briefHistory.find(b => b.date === date);
    if (historicalBrief) {
      return res.json(historicalBrief);
    }

    res.json({
      date,
      overview: null,
      theOneThing: null,
      notFound: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// POST /api/dashboard/brief - Generate new brief for today
// ============================================
router.post('/brief', async (req, res) => {
  try {
    // Archive yesterday's brief if it exists and is from yesterday
    const yesterdayKey = getDateKey(1);
    if (briefCache.brief && briefCache.brief.date === yesterdayKey) {
      // Add to history (keep only last 9 days)
      briefHistory.unshift(briefCache.brief);
      if (briefHistory.length > 9) {
        briefHistory = briefHistory.slice(0, 9);
      }
    }

    // Fetch current tasks data
    const tasksRes = await fetch('http://localhost:3600/api/tasks/things-upcoming');
    const tasksData = await tasksRes.json();

    // Generate brief with The One Thing analysis
    const brief = generateBrief(tasksData, null, null);

    // Cache the brief
    briefCache = {
      brief,
      generatedAt: brief.generatedAt
    };

    res.json(brief);
  } catch (err) {
    console.error('Error generating brief:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// GET /api/dashboard/goals - Get goal configuration
// ============================================
router.get('/goals', async (req, res) => {
  try {
    // TODO: Load from vault config file
    const goals = [
      { id: 1, name: 'Growing Indy Hall', targetPercent: 40 },
      { id: 2, name: 'Building partnerships', targetPercent: 35 },
      { id: 3, name: 'Strengthening relationships', targetPercent: 25 }
    ];
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// POST /api/dashboard/goals - Update goal configuration
// ============================================
router.post('/goals', async (req, res) => {
  try {
    const { goals } = req.body;
    // TODO: Save to vault config file
    res.json({ success: true, goals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
