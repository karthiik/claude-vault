import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Vault root is two levels up from server/routes/
const VAULT_ROOT = join(__dirname, '..', '..', '..');

// ============================================
// SKILL INVOCATION API
// ============================================

/**
 * GET /api/skill/list
 * List all available skills
 */
router.get('/list', async (req, res) => {
  try {
    const skillsDir = join(VAULT_ROOT, '.claude', 'skills');
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });

    const skills = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = join(skillsDir, entry.name, 'SKILL.md');
        try {
          const content = await fs.readFile(skillPath, 'utf-8');
          // Extract frontmatter
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const nameMatch = frontmatter.match(/name:\s*(.+)/);
            const descMatch = frontmatter.match(/description:\s*(.+)/);
            skills.push({
              id: entry.name,
              name: nameMatch ? nameMatch[1].trim() : entry.name,
              description: descMatch ? descMatch[1].trim() : '',
            });
          }
        } catch (e) {
          // Skip if no SKILL.md
        }
      }
    }

    res.json({ skills });
  } catch (error) {
    console.error('[Skill] List error:', error);
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

/**
 * POST /api/skill/invoke/:skillName
 * Invoke a skill and return the result
 *
 * Strategy: Read the SKILL.md, execute any !`command` injections,
 * then pass the prepared prompt to claude --print
 */
router.post('/invoke/:skillName', async (req, res) => {
  const { skillName } = req.params;
  const { args = '' } = req.body;

  console.log(`[Skill] Invoking: ${skillName} with args: ${args}`);

  try {
    // Read skill file
    const skillPath = join(VAULT_ROOT, '.claude', 'skills', skillName, 'SKILL.md');
    let skillContent;
    try {
      skillContent = await fs.readFile(skillPath, 'utf-8');
    } catch {
      return res.status(404).json({ error: `Skill not found: ${skillName}` });
    }

    // Remove frontmatter
    skillContent = skillContent.replace(/^---[\s\S]*?---\n?/, '');

    // Replace $ARGUMENTS with actual args
    skillContent = skillContent.replace(/\$ARGUMENTS/g, args);

    // Execute !`command` injections with per-command output limits
    const MAX_COMMAND_OUTPUT = 4000; // Per-command limit to prevent bloat
    const commandPattern = /!`([^`]+)`/g;
    let match;
    const commandPromises = [];

    // Whitelist of allowed command prefixes for security
    const ALLOWED_COMMANDS = [
      /^osascript\s/,
      /^icalBuddy\s/,
      /^head\s/,
      /^tail\s/,
      /^cat\s/,
      /^ls\s/,
      /^grep\s/,
      /^wc\s/,
      /^date\s/,
      /^echo\s/,
    ];

    function isCommandAllowed(cmd) {
      const trimmed = cmd.trim();
      return ALLOWED_COMMANDS.some(pattern => pattern.test(trimmed));
    }

    while ((match = commandPattern.exec(skillContent)) !== null) {
      const cmd = match[1];
      const fullMatch = match[0];

      // Security check
      if (!isCommandAllowed(cmd)) {
        commandPromises.push(
          Promise.resolve({ fullMatch, result: `[Command not allowed: ${cmd.substring(0, 50)}...]` })
        );
        continue;
      }

      commandPromises.push(
        execAsync(cmd, { cwd: VAULT_ROOT, timeout: 15000 })
          .then(({ stdout }) => ({
            fullMatch,
            // Limit individual command output to prevent context bloat
            result: stdout.trim().substring(0, MAX_COMMAND_OUTPUT)
          }))
          .catch(err => ({ fullMatch, result: `[Error: ${err.message}]` }))
      );
    }

    // Wait for all command injections
    const results = await Promise.all(commandPromises);

    // Efficient single-pass replacement using Map
    const replacements = new Map(results.map(r => [r.fullMatch, r.result]));
    skillContent = skillContent.replace(/!`([^`]+)`/g, match => replacements.get(match) || match);

    console.log(`[Skill] Prepared prompt: ${skillContent.length} chars`);

    // Write prepared prompt to temp file - NO TRUNCATION
    // Let Claude handle context management with its 200k context window
    const os = await import('os');
    const tmpFile = join(os.tmpdir(), `kj360-skill-${Date.now()}.txt`);
    await fs.writeFile(tmpFile, skillContent, 'utf-8');

    // Invoke Claude with prepared prompt
    const { stdout, stderr } = await execAsync(
      `cat "${tmpFile}" | claude --print`,
      {
        cwd: VAULT_ROOT,
        timeout: 90000, // 90 second timeout
        maxBuffer: 1024 * 1024,
      }
    );

    // Cleanup
    await fs.unlink(tmpFile).catch(() => {});

    if (stderr) {
      console.warn(`[Skill] stderr: ${stderr}`);
    }

    const result = stdout.trim();
    console.log(`[Skill] Result length: ${result.length} chars`);

    // Save to cache if it's a brief
    if (skillName === 'morning-brief' || skillName === 'weekly-review') {
      await saveBriefToCache(skillName, result);
    }

    res.json({
      skill: skillName,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[Skill] Invocation error:`, error);

    if (error.killed || error.signal === 'SIGTERM') {
      return res.status(504).json({ error: 'Skill timed out' });
    }

    res.status(500).json({
      error: 'Skill invocation failed',
      details: error.message
    });
  }
});

/**
 * GET /api/skill/brief/latest
 * Get the latest cached brief
 */
router.get('/brief/latest', async (req, res) => {
  try {
    const cacheDir = join(VAULT_ROOT, 'system', 'briefs');
    const files = await fs.readdir(cacheDir);

    // Find most recent brief
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    if (jsonFiles.length === 0) {
      return res.json({ brief: null, message: 'No briefs generated yet' });
    }

    jsonFiles.sort().reverse();
    const latestFile = join(cacheDir, jsonFiles[0]);
    const content = await fs.readFile(latestFile, 'utf-8');
    const brief = JSON.parse(content);

    res.json({ brief });
  } catch (error) {
    console.error('[Skill] Brief fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch brief' });
  }
});

/**
 * GET /api/skill/status
 * Get current status from cache files
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      lastBrief: null,
      tasks: null,
      calendar: null,
    };

    // Check for cached data
    const cacheDir = join(VAULT_ROOT, 'system', 'cache');

    try {
      const tasksCache = join(cacheDir, 'things3-today.json');
      const tasksContent = await fs.readFile(tasksCache, 'utf-8');
      status.tasks = JSON.parse(tasksContent);
    } catch (e) { /* No cache */ }

    try {
      const calendarCache = join(cacheDir, 'calendar.json');
      const calendarContent = await fs.readFile(calendarCache, 'utf-8');
      status.calendar = JSON.parse(calendarContent);
    } catch (e) { /* No cache */ }

    // Get latest brief timestamp
    try {
      const briefsDir = join(VAULT_ROOT, 'system', 'briefs');
      const files = await fs.readdir(briefsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();
      if (jsonFiles.length > 0) {
        status.lastBrief = jsonFiles[0].replace('.json', '');
      }
    } catch (e) { /* No briefs */ }

    res.json(status);
  } catch (error) {
    console.error('[Skill] Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function saveBriefToCache(skillName, content) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const briefType = skillName === 'weekly-review' ? 'weekend' : 'weekday';

    const briefData = {
      type: briefType,
      skill: skillName,
      content,
      generatedAt: now.toISOString(),
    };

    // Save to system/briefs/
    const briefsDir = join(VAULT_ROOT, 'system', 'briefs');
    await fs.mkdir(briefsDir, { recursive: true });

    const filename = `${dateStr}-${briefType}.json`;
    await fs.writeFile(
      join(briefsDir, filename),
      JSON.stringify(briefData, null, 2)
    );

    console.log(`[Skill] Brief saved to system/briefs/${filename}`);

    // Also save as markdown to Daily folder
    const dailyDir = join(VAULT_ROOT, 'Daily', now.getFullYear().toString(),
      String(now.getMonth() + 1).padStart(2, '0'), 'Briefs');
    await fs.mkdir(dailyDir, { recursive: true });

    const mdFilename = `${dateStr}-${briefType}.md`;
    await fs.writeFile(
      join(dailyDir, mdFilename),
      `# ${briefType === 'weekend' ? 'Weekend Review' : 'Morning Brief'} — ${dateStr}\n\n${content}`
    );

    console.log(`[Skill] Brief saved to Daily/.../Briefs/${mdFilename}`);

  } catch (error) {
    console.error('[Skill] Failed to save brief:', error);
  }
}

// ============================================
// AUTO-GENERATE BRIEF IF STALE
// ============================================

/**
 * GET /api/skill/brief/today
 * Get today's brief, auto-generate if missing or stale
 *
 * Query params:
 * - autoGenerate=true (default) - trigger generation if no brief for today
 * - maxAge=14400000 (4 hours in ms) - regenerate if older than this
 */
router.get('/brief/today', async (req, res) => {
  const autoGenerate = req.query.autoGenerate !== 'false';
  const maxAge = parseInt(req.query.maxAge) || 4 * 60 * 60 * 1000; // 4 hours default

  try {
    const today = new Date().toISOString().split('T')[0];
    const isWeekend = [0, 6].includes(new Date().getDay());
    const briefType = isWeekend ? 'weekend' : 'weekday';
    const expectedFilename = `${today}-${briefType}.json`;

    const briefsDir = join(VAULT_ROOT, 'system', 'briefs');
    const briefPath = join(briefsDir, expectedFilename);

    // Check if today's brief exists
    let brief = null;
    let isStale = false;

    try {
      const content = await fs.readFile(briefPath, 'utf-8');
      brief = JSON.parse(content);

      // Check if stale
      const generatedAt = new Date(brief.generatedAt).getTime();
      const age = Date.now() - generatedAt;
      isStale = age > maxAge;

      if (!isStale) {
        return res.json({
          brief,
          status: 'cached',
          age: Math.round(age / 1000 / 60), // age in minutes
          isWeekend
        });
      }
    } catch {
      // No brief for today
    }

    // No brief or stale - return what we have and optionally trigger generation
    if (!autoGenerate) {
      return res.json({
        brief,
        status: brief ? 'stale' : 'missing',
        needsGeneration: true,
        isWeekend
      });
    }

    // Return immediately with status, generation happens async
    res.json({
      brief,
      status: brief ? 'stale' : 'missing',
      generating: true,
      isWeekend,
      skillToRun: isWeekend ? 'weekly-review' : 'morning-brief'
    });

  } catch (error) {
    console.error('[Skill] Brief today error:', error);
    res.status(500).json({ error: 'Failed to check brief status' });
  }
});

/**
 * POST /api/skill/brief/generate
 * Generate today's brief (morning-brief or weekly-review based on day)
 */
router.post('/brief/generate', async (req, res) => {
  const isWeekend = [0, 6].includes(new Date().getDay());
  const skillName = isWeekend ? 'weekly-review' : 'morning-brief';

  console.log(`[Skill] Auto-generating ${skillName}...`);

  try {
    // Read skill file
    const skillPath = join(VAULT_ROOT, '.claude', 'skills', skillName, 'SKILL.md');
    let skillContent;
    try {
      skillContent = await fs.readFile(skillPath, 'utf-8');
    } catch {
      return res.status(404).json({ error: `Skill not found: ${skillName}` });
    }

    // Remove frontmatter
    skillContent = skillContent.replace(/^---[\s\S]*?---\n?/, '');

    // Execute command injections
    const MAX_COMMAND_OUTPUT = 4000;
    const commandPattern = /!`([^`]+)`/g;
    const ALLOWED_COMMANDS = [
      /^osascript\s/,
      /^icalBuddy\s/,
      /^head\s/,
      /^tail\s/,
      /^cat\s/,
      /^ls\s/,
      /^grep\s/,
      /^wc\s/,
      /^date\s/,
      /^echo\s/,
    ];

    const matches = [...skillContent.matchAll(commandPattern)];
    const replacements = new Map();

    await Promise.all(matches.map(async (match) => {
      const cmd = match[1];
      const fullMatch = match[0];
      const isAllowed = ALLOWED_COMMANDS.some(p => p.test(cmd.trim()));

      if (!isAllowed) {
        replacements.set(fullMatch, `[Command not allowed]`);
        return;
      }

      try {
        const { stdout } = await execAsync(cmd, { cwd: VAULT_ROOT, timeout: 15000 });
        replacements.set(fullMatch, stdout.trim().substring(0, MAX_COMMAND_OUTPUT));
      } catch (err) {
        replacements.set(fullMatch, `[Error: ${err.message}]`);
      }
    }));

    skillContent = skillContent.replace(commandPattern, match => replacements.get(match) || match);

    // Write to temp file and invoke claude
    const os = await import('os');
    const tmpFile = join(os.tmpdir(), `kj360-brief-${Date.now()}.txt`);
    await fs.writeFile(tmpFile, skillContent, 'utf-8');

    const { stdout } = await execAsync(
      `cat "${tmpFile}" | claude --print --allowedTools "Read,Bash,Glob,Grep"`,
      { cwd: VAULT_ROOT, timeout: 180000 }
    );

    // Clean up temp file
    try { await fs.unlink(tmpFile); } catch {}

    const result = stdout.trim();

    // Save to cache
    await saveBriefToCache(skillName, result);

    res.json({
      result,
      skill: skillName,
      isWeekend,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Skill] Brief generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CACHE REFRESH ENDPOINTS
// ============================================

/**
 * POST /api/skill/refresh/tasks
 * Refresh Things 3 cache
 */
router.post('/refresh/tasks', async (req, res) => {
  try {
    const { stdout } = await execAsync(`osascript -e '
      tell application "Things3"
        set output to "["
        set firstItem to true
        repeat with toDo in to dos of list "Today"
          if not firstItem then set output to output & ","
          set firstItem to false
          set taskName to name of toDo
          set projectName to ""
          try
            set projectName to name of project of toDo
          end try
          set output to output & "{\\"title\\":\\"" & taskName & "\\",\\"project\\":\\"" & projectName & "\\"}"
        end repeat
        set output to output & "]"
        return output
      end tell
    '`);

    const tasks = JSON.parse(stdout.trim());
    const cacheData = {
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
      tasks
    };

    const cacheDir = join(VAULT_ROOT, 'system', 'cache');
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(
      join(cacheDir, 'things3-today.json'),
      JSON.stringify(cacheData, null, 2)
    );

    res.json(cacheData);
  } catch (error) {
    console.error('[Skill] Tasks refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh tasks' });
  }
});

/**
 * POST /api/skill/refresh/calendar
 * Refresh calendar cache
 */
router.post('/refresh/calendar', async (req, res) => {
  try {
    const { stdout } = await execAsync(
      `icalBuddy -f -ea -nc -b "" -ps "|||" -po "datetime,title,location" eventsToday 2>/dev/null || echo ""`
    );

    const events = stdout.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split('|||');
        return {
          time: parts[0]?.trim() || '',
          title: parts[1]?.trim() || '',
          location: parts[2]?.trim() || ''
        };
      });

    const cacheData = {
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
      events
    };

    const cacheDir = join(VAULT_ROOT, 'system', 'cache');
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(
      join(cacheDir, 'calendar.json'),
      JSON.stringify(cacheData, null, 2)
    );

    res.json(cacheData);
  } catch (error) {
    console.error('[Skill] Calendar refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh calendar' });
  }
});

export default router;
