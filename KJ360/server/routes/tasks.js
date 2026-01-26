import { Router } from 'express';
import fs from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// ============================================
// Things 3 Sync Cache & Settings
// ============================================

// Sync settings (persisted via API, defaults here)
let syncSettings = {
  interval: 'realtime', // 'realtime', '1min', '5min', '15min', 'manual'
  lastSync: null,
  taskCount: 0
};

// Cache for Things 3 tasks
let things3Cache = {
  tasks: [],
  timestamp: null,
  isStale: true
};

// Cache for Things 3 Upcoming (7-day view)
let things3UpcomingCache = {
  data: null,
  timestamp: null,
  isStale: true
};

// Cache for Vault scan
let vaultScanCache = {
  tasks: [],
  timestamp: null,
  isStale: true
};

// Interval in ms
const SYNC_INTERVALS = {
  'realtime': 0,        // Always fetch
  '1min': 60 * 1000,
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  'manual': Infinity    // Never auto-refresh
};

// Check if a cache is still valid
function isCacheValid(cache) {
  if (syncSettings.interval === 'realtime') return false;
  if (syncSettings.interval === 'manual' && !cache.isStale) return true;
  if (!cache.timestamp) return false;

  const interval = SYNC_INTERVALS[syncSettings.interval] || 0;
  const age = Date.now() - cache.timestamp;
  return age < interval;
}

// Mark all caches as stale (for manual mode after changes)
function invalidateCache() {
  things3Cache.isStale = true;
  things3UpcomingCache.isStale = true;
}

// Mark vault cache as stale
function invalidateVaultCache() {
  vaultScanCache.isStale = true;
}

// Get sync settings
router.get('/sync-settings', (req, res) => {
  res.json({
    ...syncSettings,
    caches: {
      things3: {
        age: things3Cache.timestamp ? Date.now() - things3Cache.timestamp : null,
        valid: isCacheValid(things3Cache),
        timestamp: things3Cache.timestamp
      },
      things3Upcoming: {
        age: things3UpcomingCache.timestamp ? Date.now() - things3UpcomingCache.timestamp : null,
        valid: isCacheValid(things3UpcomingCache),
        timestamp: things3UpcomingCache.timestamp
      },
      vault: {
        age: vaultScanCache.timestamp ? Date.now() - vaultScanCache.timestamp : null,
        valid: isCacheValid(vaultScanCache),
        timestamp: vaultScanCache.timestamp,
        taskCount: vaultScanCache.tasks.length
      }
    }
  });
});

// Update sync settings
router.post('/sync-settings', (req, res) => {
  const { interval } = req.body;
  if (interval && SYNC_INTERVALS.hasOwnProperty(interval)) {
    syncSettings.interval = interval;
    // Invalidate cache when changing settings
    things3Cache.isStale = true;
    res.json({ status: 'success', settings: syncSettings });
  } else {
    res.status(400).json({ error: 'Invalid interval. Use: realtime, 1min, 5min, 15min, or manual' });
  }
});

// Force sync endpoint
router.post('/force-sync', async (req, res) => {
  const { target } = req.body; // 'things3', 'vault', or 'all'

  try {
    const results = {};

    if (!target || target === 'all' || target === 'things3') {
      things3Cache.isStale = true;
      things3UpcomingCache.isStale = true;
      const tasks = await getThings3Tasks(true);
      results.things3 = { taskCount: tasks.length, timestamp: things3Cache.timestamp };
    }

    if (!target || target === 'all' || target === 'vault') {
      vaultScanCache.isStale = true;
      results.vault = { status: 'cache invalidated' };
    }

    res.json({
      status: 'success',
      ...results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get "Now" view tasks using the algorithm from PRD
router.get('/now', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const { energy, source } = req.query; // Optional filters

  try {
    // Get tasks from both sources
    const [vaultTasks, thingsTasks] = await Promise.all([
      parseAllTasks(vaultRoot),
      getThings3Tasks()
    ]);

    // Combine based on source filter
    let allTasks;
    if (source === 'vault') {
      allTasks = vaultTasks;
    } else if (source === 'things') {
      allTasks = thingsTasks;
    } else {
      // Default: combine both, Things 3 tasks marked with source
      allTasks = [...vaultTasks, ...thingsTasks];
    }

    const today = new Date().toISOString().split('T')[0];

    // Apply the Now algorithm
    const overdue = allTasks.filter(t => t.deadline && t.deadline < today);

    // Due Today includes:
    // 1. Tasks with today's deadline
    // 2. Things 3 "Today" tasks without deadlines (they're in Today for a reason!)
    const dueToday = allTasks.filter(t =>
      t.deadline === today ||
      (t.source === 'things3' && !t.deadline)
    );

    // Get 3 undated tasks from Active vault projects (not Things 3, those go in dueToday)
    const undatedBuffer = allTasks
      .filter(t => !t.deadline && t.projectStatus === 'Active' && t.source !== 'things3')
      .slice(0, 3);

    let result = {
      overdue,
      dueToday,
      undatedBuffer,
      total: overdue.length + dueToday.length + undatedBuffer.length
    };

    // Apply energy filter if specified
    if (energy) {
      const energyTag = `#energy/${energy.toLowerCase()}`;
      result = {
        overdue: result.overdue.filter(t => t.tags?.includes(energyTag)),
        dueToday: result.dueToday.filter(t => t.tags?.includes(energyTag)),
        undatedBuffer: result.undatedBuffer.filter(t => t.tags?.includes(energyTag)),
        total: 0,
        filter: energy
      };
      result.total = result.overdue.length + result.dueToday.length + result.undatedBuffer.length;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tasks (unfiltered)
router.get('/all', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');

  try {
    const tasks = await parseAllTasks(vaultRoot);
    res.json({ tasks, count: tasks.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete a task
router.post('/complete', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const { taskId, filePath, lineNumber } = req.body;

  console.log('[Tasks] Complete request:', { filePath, lineNumber, vaultRoot });

  if (!filePath || lineNumber === undefined) {
    return res.status(400).json({ error: 'filePath and lineNumber required' });
  }

  try {
    const fullPath = join(vaultRoot, filePath);
    console.log('[Tasks] Full path:', fullPath);

    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    console.log('[Tasks] Line', lineNumber, ':', lines[lineNumber]?.substring(0, 80));

    // Replace the checkbox
    if (lines[lineNumber] && lines[lineNumber].includes('- [ ]')) {
      lines[lineNumber] = lines[lineNumber].replace('- [ ]', '- [x]');
      await fs.writeFile(fullPath, lines.join('\n'), 'utf-8');

      console.log('[Tasks] Task completed successfully:', filePath, 'line', lineNumber);

      // Remove from vault cache
      const vaultTaskId = `vault:${filePath}:${lineNumber}`;
      vaultScanCache.tasks = vaultScanCache.tasks.filter(t => t.id !== vaultTaskId);

      // Also invalidate the vault cache to ensure it's re-scanned
      invalidateVaultCache();

      res.json({
        status: 'success',
        message: 'Task completed',
        file: filePath,
        line: lineNumber
      });
    } else {
      console.log('[Tasks] No unchecked task found at line', lineNumber, 'content:', lines[lineNumber]);
      res.status(400).json({ error: 'No unchecked task at specified line' });
    }
  } catch (error) {
    console.error('[Tasks] Complete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Snooze a task (add/update deadline)
router.post('/snooze', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const { filePath, lineNumber, newDate } = req.body;

  if (!filePath || lineNumber === undefined || !newDate) {
    return res.status(400).json({ error: 'filePath, lineNumber, and newDate required' });
  }

  try {
    const fullPath = join(vaultRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    if (lines[lineNumber]) {
      // Remove existing date if present, add new one
      let line = lines[lineNumber];

      // Remove existing 📅 date
      line = line.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '');

      // Add new date at end
      line = line.trimEnd() + ` 📅 ${newDate}`;
      lines[lineNumber] = line;

      await fs.writeFile(fullPath, lines.join('\n'), 'utf-8');

      res.json({
        status: 'success',
        message: `Task snoozed to ${newDate}`,
        file: filePath,
        line: lineNumber
      });
    } else {
      res.status(400).json({ error: 'Line not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete a task in Things 3
router.post('/complete-things', async (req, res) => {
  const { taskName, uuid } = req.body;

  if (!taskName) {
    return res.status(400).json({ error: 'taskName required' });
  }

  try {
    // Use AppleScript to complete the task in Things 3
    const script = `
      tell application "Things3"
        set matchingToDos to to dos whose name is "${taskName.replace(/"/g, '\\"')}"
        if (count of matchingToDos) > 0 then
          set theToDo to item 1 of matchingToDos
          set status of theToDo to completed
          return "completed"
        else
          return "not found"
        end if
      end tell
    `;

    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const result = stdout.trim();

    if (result === 'completed') {
      invalidateCache(); // Refresh on next fetch
      res.json({ status: 'success', message: 'Task completed in Things 3' });
    } else {
      res.status(404).json({ error: 'Task not found in Things 3' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Snooze a task in Things 3 (set new deadline)
router.post('/snooze-things', async (req, res) => {
  const { taskName, uuid, newDate } = req.body;

  if (!taskName || !newDate) {
    return res.status(400).json({ error: 'taskName and newDate required' });
  }

  try {
    // Parse date for AppleScript format
    const [year, month, day] = newDate.split('-');

    // Use AppleScript to update the deadline in Things 3
    const script = `
      tell application "Things3"
        set matchingToDos to to dos whose name is "${taskName.replace(/"/g, '\\"')}"
        if (count of matchingToDos) > 0 then
          set theToDo to item 1 of matchingToDos
          set deadline of theToDo to date "${month}/${day}/${year}"
          return "snoozed"
        else
          return "not found"
        end if
      end tell
    `;

    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const result = stdout.trim();

    if (result === 'snoozed') {
      invalidateCache(); // Refresh on next fetch
      res.json({ status: 'success', message: `Task snoozed to ${newDate} in Things 3` });
    } else {
      res.status(404).json({ error: 'Task not found in Things 3' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a task to Things 3 Inbox (or specific project)
router.post('/send-to-things', async (req, res) => {
  const { title, notes, project, tags, deadline, when } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  try {
    // Build the AppleScript command
    let script = `
      tell application "Things3"
        set newToDo to make new to do with properties {name:"${title.replace(/"/g, '\\"')}"}
    `;

    // Add notes if provided
    if (notes) {
      script += `
        set notes of newToDo to "${notes.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
      `;
    }

    // Add deadline if provided
    if (deadline) {
      const [year, month, day] = deadline.split('-');
      script += `
        set deadline of newToDo to date "${month}/${day}/${year}"
      `;
    }

    // Add tags if provided
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        script += `
          try
            set tagRef to tag "${tag.replace(/"/g, '\\"')}"
            set tags of newToDo to tags of newToDo & {tagRef}
          end try
        `;
      }
    }

    // Move to project if specified, otherwise stays in Inbox
    if (project) {
      script += `
        try
          set projectRef to project "${project.replace(/"/g, '\\"')}"
          move newToDo to projectRef
        on error
          -- Project not found, task stays in Inbox
        end try
      `;
    }

    // Set "when" (Today, Evening, Someday, etc.)
    if (when === 'today') {
      script += `
        move newToDo to list "Today"
      `;
    }

    script += `
        return id of newToDo
      end tell
    `;

    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const taskId = stdout.trim();

    // Invalidate cache since we added a task
    invalidateCache();

    res.json({
      status: 'success',
      message: `Task "${title}" added to Things 3`,
      taskId
    });
  } catch (error) {
    console.error('[Tasks] Send to Things error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get list of Things 3 projects (for dropdown), grouped by area
router.get('/things-projects', async (req, res) => {
  try {
    // Simpler AppleScript - get all projects with their areas
    const { stdout, stderr } = await execAsync(`osascript -e '
      tell application "Things3"
        set output to ""
        repeat with proj in projects
          set projName to name of proj
          set areaName to ""
          try
            set areaName to name of area of proj
          end try
          set output to output & projName & "|||" & areaName & "
"
        end repeat
        return output
      end tell
    '`);

    if (stderr) {
      console.error('[Tasks] Things projects stderr:', stderr);
    }

    const lines = stdout.trim().split('\n').filter(l => l.trim());
    const projectsByArea = {};
    const areaOrder = [];

    lines.forEach(line => {
      const [name, area] = line.split('|||').map(s => s?.trim() || '');
      const areaKey = area || '__no_area__';

      if (!projectsByArea[areaKey]) {
        projectsByArea[areaKey] = [];
        areaOrder.push(areaKey);
      }

      if (name && !projectsByArea[areaKey].includes(name)) {
        projectsByArea[areaKey].push(name);
      }
    });

    // Build grouped structure, with areas first, then no-area at end
    const withArea = areaOrder.filter(a => a !== '__no_area__');
    const grouped = withArea.map(area => ({
      area,
      projects: projectsByArea[area] || []
    }));

    // Add no-area projects at the end
    if (projectsByArea['__no_area__']?.length > 0) {
      grouped.push({
        area: null,
        projects: projectsByArea['__no_area__']
      });
    }

    console.log('[Tasks] Things projects loaded:', grouped.length, 'groups');
    res.json({ grouped });
  } catch (error) {
    console.error('[Tasks] Things projects error:', error);
    res.json({ grouped: [] });
  }
});

// Get Things 3 Upcoming tasks (next 7 days, grouped by date)
router.get('/things-upcoming', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';

  try {
    // Return cached data if valid
    if (!forceRefresh && isCacheValid(things3UpcomingCache) && things3UpcomingCache.data) {
      console.log('[Tasks] Using cached Things 3 upcoming data (age:', Math.round((Date.now() - things3UpcomingCache.timestamp) / 1000), 's)');
      return res.json({
        ...things3UpcomingCache.data,
        fromCache: true,
        cacheAge: Date.now() - things3UpcomingCache.timestamp
      });
    }

    const data = await getThings3Upcoming();

    // Update cache
    things3UpcomingCache = {
      data,
      timestamp: Date.now(),
      isStale: false
    };

    res.json({ ...data, fromCache: false });
  } catch (error) {
    console.error('[Tasks] Things upcoming error:', error);
    // Return stale cache on error if available
    if (things3UpcomingCache.data) {
      return res.json({
        ...things3UpcomingCache.data,
        fromCache: true,
        stale: true,
        error: error.message
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Scan vault for triageable tasks (on-demand agent)
// POST = force refresh, GET = use cache if valid
router.post('/scan-vault', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const forceRefresh = req.body.refresh !== false; // Default to refresh on POST

  try {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid(vaultScanCache) && vaultScanCache.tasks.length >= 0) {
      console.log('[Vault Scan] Using cached data (age:', Math.round((Date.now() - vaultScanCache.timestamp) / 1000), 's)');
      return res.json({
        tasks: vaultScanCache.tasks,
        count: vaultScanCache.tasks.length,
        scannedAt: new Date(vaultScanCache.timestamp).toISOString(),
        fromCache: true,
        cacheAge: Date.now() - vaultScanCache.timestamp
      });
    }

    const tasks = await scanVaultForTriage(vaultRoot);

    // Update cache
    vaultScanCache = {
      tasks,
      timestamp: Date.now(),
      isStale: false
    };

    res.json({
      tasks,
      count: tasks.length,
      scannedAt: new Date().toISOString(),
      fromCache: false
    });
  } catch (error) {
    console.error('[Tasks] Vault scan error:', error);
    // Return stale cache on error if available
    if (vaultScanCache.tasks.length > 0) {
      return res.json({
        tasks: vaultScanCache.tasks,
        count: vaultScanCache.tasks.length,
        scannedAt: new Date(vaultScanCache.timestamp).toISOString(),
        fromCache: true,
        stale: true,
        error: error.message
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET endpoint to retrieve cached vault data without forcing refresh
router.get('/scan-vault', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');

  try {
    // Return cached data if available
    if (isCacheValid(vaultScanCache) && vaultScanCache.tasks.length >= 0) {
      console.log('[Vault Scan] Returning cached data (age:', Math.round((Date.now() - vaultScanCache.timestamp) / 1000), 's)');
      return res.json({
        tasks: vaultScanCache.tasks,
        count: vaultScanCache.tasks.length,
        scannedAt: vaultScanCache.timestamp ? new Date(vaultScanCache.timestamp).toISOString() : null,
        fromCache: true,
        cacheAge: vaultScanCache.timestamp ? Date.now() - vaultScanCache.timestamp : null
      });
    }

    // No valid cache, return empty with hint to scan
    res.json({
      tasks: [],
      count: 0,
      scannedAt: null,
      fromCache: false,
      needsScan: true
    });
  } catch (error) {
    console.error('[Tasks] Vault scan GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark a vault task as "sent to Things" (optional: add metadata to file)
router.post('/mark-triaged', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const { filePath, lineNumber } = req.body;

  if (!filePath || lineNumber === undefined) {
    return res.status(400).json({ error: 'filePath and lineNumber required' });
  }

  try {
    const fullPath = join(vaultRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    // Change - [ ] to - [>] (forwarded to Things)
    if (lines[lineNumber] && lines[lineNumber].includes('- [ ]')) {
      lines[lineNumber] = lines[lineNumber].replace('- [ ]', '- [>]');
      await fs.writeFile(fullPath, lines.join('\n'));

      // Remove from vault cache
      const taskId = `vault:${filePath}:${lineNumber}`;
      vaultScanCache.tasks = vaultScanCache.tasks.filter(t => t.id !== taskId);

      res.json({ status: 'success', message: 'Task marked as triaged' });
    } else {
      res.status(404).json({ error: 'Task not found at specified location' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Get tasks from Things 3 (with caching)
// Uses AppleScript directly since it provides full task details including tags
async function getThings3Tasks(forceRefresh = false) {
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && isCacheValid() && things3Cache.tasks.length >= 0) {
    console.log('[Tasks] Using cached Things 3 data (age:', Math.round((Date.now() - things3Cache.timestamp) / 1000), 's)');
    return things3Cache.tasks;
  }

  try {
    console.log('[Tasks] Fetching fresh data from Things 3...');
    let todayTasks = [];

    // Use AppleScript as primary method - it gives us tags, area, deadline, UUID
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

    todayTasks = stdout.trim().split('\n').filter(l => l).map((line, idx) => {
      const [title, project, area, tagsStr, deadline, uuid] = line.split('|||');

      // Convert tag names - keep original names for flexible matching
      const rawTags = tagsStr ? tagsStr.split(',').filter(t => t.trim()) : [];
      const tags = rawTags.map(t => `#${t.trim()}`);

      return {
        title,
        project: project || 'No Project',
        area: area || null,
        tags,
        deadline: deadline || null,
        uuid: uuid || `applescript-${idx}`,
        subtasks: [] // Things 3 checklist items not easily accessible via AppleScript
      };
    });

    console.log('[Tasks] Things 3 raw tasks:', todayTasks.length, 'tasks, sample tags:', todayTasks[0]?.tags);

    // Map Things 3 tasks to our format
    const mappedTasks = todayTasks.map((task, index) => ({
      id: `things3:${task.uuid || index}`,
      text: task.title || 'Untitled',
      deadline: task.deadline || null,
      tags: task.tags || [],
      filePath: null,
      lineNumber: null,
      projectStatus: 'Active',
      projectName: task.project || 'Things 3',
      area: task.area || null,
      source: 'things3',
      thingsUuid: task.uuid,
      subtasks: task.subtasks || []
    }));

    // Update cache
    things3Cache = {
      tasks: mappedTasks,
      timestamp: Date.now(),
      isStale: false
    };

    // Update sync settings
    syncSettings.lastSync = new Date().toISOString();
    syncSettings.taskCount = mappedTasks.length;

    return mappedTasks;
  } catch (error) {
    console.error('[Tasks] Things 3 error:', error.message);
    // Return stale cache on error if available
    if (things3Cache.tasks.length > 0) {
      console.log('[Tasks] Returning stale cache due to error');
      return things3Cache.tasks;
    }
    return [];
  }
}

// Helper: Parse all tasks from vault
async function parseAllTasks(vaultRoot) {
  const projectFiles = await glob(join(vaultRoot, '1-Projects', '**/*.md'));
  const dailyFiles = await glob(join(vaultRoot, 'Daily', '**/*.md'));
  const allFiles = [...projectFiles, ...dailyFiles];

  const tasks = [];

  for (const file of allFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    const lines = body.split('\n');
    const relativePath = file.replace(vaultRoot + '/', '');

    lines.forEach((line, index) => {
      // Match unchecked tasks: - [ ]
      const taskMatch = line.match(/^(\s*)-\s*\[\s*\]\s*(.+)$/);
      if (taskMatch) {
        const taskText = taskMatch[2];

        // Parse inline deadline: 📅 YYYY-MM-DD
        const deadlineMatch = taskText.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
        const deadline = deadlineMatch ? deadlineMatch[1] : null;

        // Parse energy tags
        const energyMatch = taskText.match(/#energy\/(quick|creative|deep)/i);
        const energy = energyMatch ? energyMatch[1].toLowerCase() : null;

        // Parse other inline tags
        const tags = taskText.match(/#[\w/]+/g) || [];

        // Determine project status:
        // 1. Use frontmatter status if available
        // 2. Mark as 'Completed' if in Completed Projects folder
        // 3. Default to 'Active' for other projects
        let projectStatus = frontmatter.status;
        if (!projectStatus) {
          if (relativePath.includes('Completed Projects') || relativePath.includes('4-Archive')) {
            projectStatus = 'Completed';
          } else if (relativePath.startsWith('1-Projects')) {
            projectStatus = 'Active';
          } else {
            projectStatus = 'Unknown';
          }
        }

        tasks.push({
          id: `${relativePath}:${index}`,
          text: taskText.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '').replace(/#[\w/]+/g, '').trim(),
          rawText: taskText,
          deadline,
          energy,
          tags,
          filePath: relativePath,
          lineNumber: index,
          projectStatus,
          projectName: relativePath.split('/').pop().replace('.md', ''),
          area: frontmatter.area || null
        });
      }
    });
  }

  return tasks;
}

// Helper: Get Things 3 Upcoming tasks (next 7 days)
async function getThings3Upcoming() {
  try {
    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate date 7 days from now
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // AppleScript to get tasks from Today list AND tasks with upcoming deadlines
    const { stdout } = await execAsync(`osascript -e '
      tell application "Things3"
        set output to ""
        set todayDate to current date
        set weekFromNow to todayDate + (7 * days)

        -- Get all tasks from Today list
        repeat with toDo in to dos of list "Today"
          set taskName to name of toDo
          set projectName to ""
          set areaName to ""
          set tagNames to ""
          set deadlineStr to ""
          set whenStr to ""
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

          -- Get activation date (when)
          try
            set w to activation date of toDo
            if w is not missing value then
              set y to year of w
              set m to month of w as integer
              set dy to day of w
              if m < 10 then set m to "0" & m
              if dy < 10 then set dy to "0" & dy
              set whenStr to (y as string) & "-" & (m as string) & "-" & (dy as string)
            end if
          end try

          set output to output & taskName & "|||" & projectName & "|||" & areaName & "|||" & tagNames & "|||" & deadlineStr & "|||" & taskId & "|||" & whenStr & "|||today\\n"
        end repeat

        -- Get scheduled tasks (Upcoming list) for next 7 days
        repeat with toDo in to dos of list "Upcoming"
          set taskName to name of toDo
          set projectName to ""
          set areaName to ""
          set tagNames to ""
          set deadlineStr to ""
          set whenStr to ""
          set taskId to id of toDo

          try
            set w to activation date of toDo
            if w is not missing value then
              -- Only include if within next 7 days
              if w ≤ weekFromNow then
                set y to year of w
                set m to month of w as integer
                set dy to day of w
                if m < 10 then set m to "0" & m
                if dy < 10 then set dy to "0" & dy
                set whenStr to (y as string) & "-" & (m as string) & "-" & (dy as string)
              else
                set whenStr to "skip"
              end if
            end if
          end try

          if whenStr is not "skip" and whenStr is not "" then
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

            set output to output & taskName & "|||" & projectName & "|||" & areaName & "|||" & tagNames & "|||" & deadlineStr & "|||" & taskId & "|||" & whenStr & "|||upcoming\\n"
          end if
        end repeat

        return output
      end tell
    ' 2>/dev/null`);

    // Parse output and group by date
    const tasks = stdout.trim().split('\n').filter(l => l).map((line, idx) => {
      const [title, project, area, tagsStr, deadline, uuid, when, listType] = line.split('|||');

      const rawTags = tagsStr ? tagsStr.split(',').filter(t => t.trim()) : [];
      const tags = rawTags.map(t => `#${t.trim()}`);

      // Determine the display date (when or today's date for Today list items)
      let displayDate = when;
      if (listType === 'today' && !when) {
        displayDate = today.toISOString().split('T')[0];
      }

      return {
        id: `things3:${uuid || idx}`,
        text: title || 'Untitled',
        deadline: deadline || null,
        when: displayDate || null,
        tags,
        projectName: project || 'No Project',
        area: area || null,
        source: 'things3',
        thingsUuid: uuid,
        listType: listType || 'today'
      };
    });

    // Group by date
    const grouped = {};
    const todayStr = today.toISOString().split('T')[0];

    // Initialize next 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      grouped[dateStr] = {
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
        dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: i === 0,
        isTomorrow: i === 1,
        tasks: []
      };
    }

    // Assign tasks to dates
    tasks.forEach(task => {
      const taskDate = task.when || task.deadline || todayStr;
      if (grouped[taskDate]) {
        grouped[taskDate].tasks.push(task);
      } else if (taskDate < todayStr) {
        // Overdue - add to today
        grouped[todayStr].tasks.push({ ...task, isOverdue: true });
      }
    });

    return {
      days: Object.values(grouped),
      totalTasks: tasks.length,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Tasks] Things upcoming error:', error.message);
    return { days: [], totalTasks: 0, error: error.message };
  }
}

// Helper: Scan vault for triageable tasks
async function scanVaultForTriage(vaultRoot) {
  const tasks = [];

  try {
    // Scan 1-Projects folder
    const projectFiles = await glob(join(vaultRoot, '1-Projects', '**/*.md'));

    // Scan Daily notes
    const dailyFiles = await glob(join(vaultRoot, 'Daily', '**/*.md'));

    // Scan Carrier Goal file (common locations)
    const carrierGoalPatterns = [
      join(vaultRoot, '0_Carrier_Goal.md'),
      join(vaultRoot, '0_Carrier_Goal', '*.md'),
      join(vaultRoot, '**/0_Carrier_Goal*.md'),
      join(vaultRoot, '**/Carrier_Goal*.md')
    ];

    let carrierGoalFiles = [];
    for (const pattern of carrierGoalPatterns) {
      const matches = await glob(pattern);
      carrierGoalFiles = [...carrierGoalFiles, ...matches];
    }

    // Combine and dedupe, excluding index files
    const allFilesRaw = [...new Set([...projectFiles, ...dailyFiles, ...carrierGoalFiles])];

    // Filter out project index files
    const allFiles = allFilesRaw.filter(file => {
      const fileName = file.split('/').pop().toLowerCase();
      // Exclude common index file patterns
      return !fileName.includes('index') &&
             !fileName.startsWith('0_') &&
             !fileName.startsWith('00_') &&
             !fileName.match(/^_.*index/i);
    });

    console.log(`[Vault Scan] Scanning ${allFiles.length} files (excluded ${allFilesRaw.length - allFiles.length} index files)...`);

    for (const file of allFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const { data: frontmatter, content: body } = matter(content);
      const relativePath = file.replace(vaultRoot + '/', '');

      // Calculate frontmatter offset - how many lines the frontmatter takes
      // gray-matter strips frontmatter, so we need to find where body starts in original
      const fullLines = content.split('\n');
      const bodyStartIndex = content.indexOf(body);
      const frontmatterLineCount = bodyStartIndex > 0
        ? content.substring(0, bodyStartIndex).split('\n').length - 1
        : 0;

      const lines = body.split('\n');

      // Determine source type
      let sourceType = 'project';
      if (relativePath.includes('Daily')) {
        sourceType = 'daily';
      } else if (relativePath.toLowerCase().includes('carrier') || relativePath.toLowerCase().includes('goal')) {
        sourceType = 'carrier_goal';
      }

      lines.forEach((line, index) => {
        // Match unchecked tasks: - [ ] (not - [x] or - [>])
        const taskMatch = line.match(/^(\s*)-\s*\[\s*\]\s*(.+)$/);
        if (taskMatch) {
          const taskText = taskMatch[2];

          // Calculate actual line number in full file (including frontmatter)
          const actualLineNumber = frontmatterLineCount + index;

          // Parse inline deadline: 📅 YYYY-MM-DD
          const deadlineMatch = taskText.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
          const deadline = deadlineMatch ? deadlineMatch[1] : null;

          // Parse energy tags
          const tags = taskText.match(/#[\w/]+/g) || [];

          // Clean task text
          const cleanText = taskText
            .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/#[\w/]+/g, '')
            .trim();

          tasks.push({
            id: `vault:${relativePath}:${actualLineNumber}`,
            text: cleanText,
            rawText: taskText,
            deadline,
            tags,
            filePath: relativePath,
            lineNumber: actualLineNumber,
            sourceType,
            sourceName: relativePath.split('/').pop().replace('.md', ''),
            projectName: frontmatter.project || relativePath.split('/')[1] || 'Vault'
          });
        }
      });
    }

    console.log(`[Vault Scan] Found ${tasks.length} triageable tasks`);
    return tasks;
  } catch (error) {
    console.error('[Vault Scan] Error:', error.message);
    return [];
  }
}

export default router;
