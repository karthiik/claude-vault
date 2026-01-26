/**
 * KJ360 Parallel Agent Runner
 *
 * Spawns multiple agents concurrently via Promise.all
 * Tracks job status for polling from frontend
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// In-memory job store (would use Redis in production)
const jobs = new Map();

// Available agents and their implementations
const AGENTS = {
  tasks: runTasksAgent,
  calendar: runCalendarAgent,
  'things-sync': runThingsSyncAgent,
  'inbox-scanner': runInboxScannerAgent,
  'nurture-checker': runNurtureCheckerAgent,
};

/**
 * Start a parallel agent job
 * @param {string[]} agentNames - List of agents to run
 * @param {string} vaultRoot - Path to vault
 * @returns {string} jobId
 */
export async function startAgentJob(agentNames, vaultRoot) {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Initialize job
  jobs.set(jobId, {
    status: 'running',
    startedAt: new Date().toISOString(),
    agents: agentNames,
    results: {},
    errors: {}
  });

  // Run agents in parallel (non-blocking)
  runAgentsParallel(jobId, agentNames, vaultRoot);

  return jobId;
}

/**
 * Get job status
 */
export function getJobStatus(jobId) {
  return jobs.get(jobId) || null;
}

/**
 * Run agents in parallel and update job status
 */
async function runAgentsParallel(jobId, agentNames, vaultRoot) {
  const job = jobs.get(jobId);

  const agentPromises = agentNames.map(async (name) => {
    const agentFn = AGENTS[name];
    if (!agentFn) {
      return { name, error: `Unknown agent: ${name}` };
    }

    try {
      const result = await agentFn(vaultRoot);
      return { name, result };
    } catch (error) {
      return { name, error: error.message };
    }
  });

  const results = await Promise.all(agentPromises);

  // Update job with results
  for (const { name, result, error } of results) {
    if (error) {
      job.errors[name] = error;
    } else {
      job.results[name] = result;
    }
  }

  job.status = 'complete';
  job.completedAt = new Date().toISOString();

  // Log to simple JSON file
  await logAgentRun(jobId, job, vaultRoot);
}

/**
 * Simple JSON logging (not fancy audit trails)
 */
async function logAgentRun(jobId, job, vaultRoot) {
  const logDir = join(vaultRoot, 'KJ360/system/logs');
  const today = new Date().toISOString().split('T')[0];
  const logFile = join(logDir, `${today}-agents.jsonl`);

  try {
    await fs.mkdir(logDir, { recursive: true });
    const entry = JSON.stringify({ jobId, ...job }) + '\n';
    await fs.appendFile(logFile, entry);
  } catch (err) {
    console.error('[AgentRunner] Failed to log:', err.message);
  }
}

// ============================================================
// AGENT IMPLEMENTATIONS
// ============================================================

/**
 * Tasks Agent - Parse vault for Now View tasks
 */
async function runTasksAgent(vaultRoot) {
  const glob = (await import('glob')).glob;
  const matter = (await import('gray-matter')).default;

  const projectFiles = await glob(join(vaultRoot, '1-Projects', '**/*.md'));
  const tasks = [];
  const today = new Date().toISOString().split('T')[0];

  for (const file of projectFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    const lines = body.split('\n');
    const relativePath = file.replace(vaultRoot + '/', '');

    lines.forEach((line, index) => {
      const taskMatch = line.match(/^(\s*)-\s*\[\s*\]\s*(.+)$/);
      if (taskMatch) {
        const taskText = taskMatch[2];
        const deadlineMatch = taskText.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
        const deadline = deadlineMatch ? deadlineMatch[1] : null;

        tasks.push({
          id: `${relativePath}:${index}`,
          text: taskText.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '').trim(),
          deadline,
          filePath: relativePath,
          lineNumber: index,
          projectStatus: frontmatter.status || 'Unknown',
          projectName: relativePath.split('/').pop().replace('.md', '')
        });
      }
    });
  }

  // Apply Now algorithm
  const overdue = tasks.filter(t => t.deadline && t.deadline < today);
  const dueToday = tasks.filter(t => t.deadline === today);
  const undatedBuffer = tasks
    .filter(t => !t.deadline && t.projectStatus === 'Active')
    .slice(0, 3);

  return {
    overdue,
    dueToday,
    undatedBuffer,
    total: overdue.length + dueToday.length + undatedBuffer.length
  };
}

/**
 * Calendar Agent - Query icalBuddy for today's events
 */
async function runCalendarAgent(vaultRoot) {
  try {
    // Check if icalBuddy is available
    const { stdout } = await execAsync('which icalBuddy');
    if (!stdout.trim()) {
      return { events: [], error: 'icalBuddy not installed' };
    }

    // Get today's events
    const { stdout: events } = await execAsync(
      'icalBuddy -nc -nrd -npn -ea -b "• " eventsToday 2>/dev/null || echo "No events"'
    );

    const eventList = events
      .trim()
      .split('\n')
      .filter(line => line.startsWith('• '))
      .map(line => line.slice(2));

    return {
      events: eventList,
      count: eventList.length,
      date: new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    return { events: [], error: error.message };
  }
}

/**
 * Things 3 Sync Agent - Bi-directional sync
 */
async function runThingsSyncAgent(vaultRoot) {
  try {
    // Try to get today's tasks from Things 3
    const { stdout: todayTasks } = await execAsync(
      'things-cli today --json 2>/dev/null || echo "[]"'
    ).catch(() => ({ stdout: '[]' }));

    // Try to get inbox
    const { stdout: inboxTasks } = await execAsync(
      'things-cli inbox --json 2>/dev/null || echo "[]"'
    ).catch(() => ({ stdout: '[]' }));

    let today = [];
    let inbox = [];

    try {
      today = JSON.parse(todayTasks);
    } catch { today = []; }

    try {
      inbox = JSON.parse(inboxTasks);
    } catch { inbox = []; }

    return {
      today: Array.isArray(today) ? today : [],
      inbox: Array.isArray(inbox) ? inbox : [],
      todayCount: Array.isArray(today) ? today.length : 0,
      inboxCount: Array.isArray(inbox) ? inbox.length : 0,
      synced: true
    };
  } catch (error) {
    return {
      today: [],
      inbox: [],
      todayCount: 0,
      inboxCount: 0,
      synced: false,
      error: error.message
    };
  }
}

/**
 * Inbox Scanner Agent - Count and list inbox items
 */
async function runInboxScannerAgent(vaultRoot) {
  const inboxPath = join(vaultRoot, '0-Inbox');

  try {
    const files = await fs.readdir(inboxPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    const items = await Promise.all(
      mdFiles.slice(0, 10).map(async (file) => {
        const content = await fs.readFile(join(inboxPath, file), 'utf-8');
        const firstLine = content.split('\n').find(l => l.trim()) || file;
        const stat = await fs.stat(join(inboxPath, file));

        return {
          file,
          title: firstLine.replace(/^#\s*/, ''),
          createdAt: stat.birthtime.toISOString(),
          ageHours: Math.round((Date.now() - stat.birthtime.getTime()) / 3600000)
        };
      })
    );

    // Flag stale items (>24 hours old)
    const stale = items.filter(i => i.ageHours > 24);

    return {
      count: mdFiles.length,
      items,
      staleCount: stale.length,
      staleItems: stale
    };
  } catch (error) {
    return { count: 0, items: [], error: error.message };
  }
}

/**
 * Nurture Checker Agent - Check relationship health
 */
async function runNurtureCheckerAgent(vaultRoot) {
  const glob = (await import('glob')).glob;
  const matter = (await import('gray-matter')).default;

  const peoplePath = join(vaultRoot, '3-Resources/People');

  try {
    const files = await glob(join(peoplePath, '*.md'));
    const today = new Date();
    const relationships = [];

    // Priority thresholds (days)
    const thresholds = {
      Core: 7,
      Peripheral: 30,
      Casual: 90
    };

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const { data: frontmatter } = matter(content);

      if (frontmatter.type !== 'relationship') continue;

      const lastContact = frontmatter.last_contact
        ? new Date(frontmatter.last_contact)
        : null;

      const daysSince = lastContact
        ? Math.round((today - lastContact) / 86400000)
        : 999;

      const threshold = thresholds[frontmatter.priority] || 30;
      const needsAttention = daysSince > threshold;

      relationships.push({
        name: file.split('/').pop().replace('.md', ''),
        priority: frontmatter.priority || 'Unknown',
        lastContact: frontmatter.last_contact || 'Never',
        daysSince,
        threshold,
        needsAttention
      });
    }

    const needingAttention = relationships.filter(r => r.needsAttention);

    return {
      total: relationships.length,
      needingAttention: needingAttention.length,
      relationships: needingAttention.slice(0, 5) // Top 5 needing attention
    };
  } catch (error) {
    return { total: 0, needingAttention: 0, relationships: [], error: error.message };
  }
}

// ============================================================
// BACKGROUND GARDENING
// ============================================================

let gardeningInterval = null;

/**
 * Start background gardening loop (every 5 minutes)
 */
export function startBackgroundGardening(vaultRoot) {
  if (gardeningInterval) return;

  console.log('[Gardening] Starting background loop (every 5 min)');

  gardeningInterval = setInterval(async () => {
    console.log('[Gardening] Running background tasks...');

    try {
      // Run lightweight gardening agents
      await Promise.all([
        runInboxScannerAgent(vaultRoot),
        runNurtureCheckerAgent(vaultRoot),
        runThingsSyncAgent(vaultRoot)
      ]);

      console.log('[Gardening] Complete');
    } catch (error) {
      console.error('[Gardening] Error:', error.message);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Stop background gardening
 */
export function stopBackgroundGardening() {
  if (gardeningInterval) {
    clearInterval(gardeningInterval);
    gardeningInterval = null;
    console.log('[Gardening] Stopped');
  }
}

export default {
  startAgentJob,
  getJobStatus,
  startBackgroundGardening,
  stopBackgroundGardening,
  AGENTS: Object.keys(AGENTS)
};
