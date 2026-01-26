import { Router } from 'express';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import {
  getPrompts,
  getPrompt,
  updatePrompt,
  resetPrompts,
  getCurrentBriefType,
  isWeekend
} from '../config/briefPrompts.js';

const router = Router();

// In-memory cache for today's brief
let briefCache = {
  date: null,
  brief: null,
  generatedAt: null
};

// Brief history (last 10 days)
let briefHistory = [];

// ============================================
// PROMPT MANAGEMENT ENDPOINTS
// ============================================

// Get all prompts
router.get('/prompts', (req, res) => {
  res.json(getPrompts());
});

// Get specific prompt
router.get('/prompts/:type', (req, res) => {
  const { type } = req.params;
  const prompt = getPrompt(type);
  if (prompt) {
    res.json(prompt);
  } else {
    res.status(404).json({ error: 'Prompt type not found' });
  }
});

// Update a prompt
router.put('/prompts/:type', (req, res) => {
  const { type } = req.params;
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt field required' });
  }

  if (updatePrompt(type, prompt)) {
    res.json({ status: 'success', message: `${type} prompt updated` });
  } else {
    res.status(404).json({ error: 'Prompt type not found' });
  }
});

// Reset prompts to defaults
router.post('/prompts/reset', (req, res) => {
  resetPrompts();
  res.json({ status: 'success', message: 'Prompts reset to defaults' });
});

// ============================================
// BRIEF GENERATION
// ============================================

// Get current brief (from cache or generate)
router.get('/current', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Return cached brief if it's from today
  if (briefCache.date === today && briefCache.brief) {
    return res.json({
      ...briefCache.brief,
      fromCache: true,
      generatedAt: briefCache.generatedAt
    });
  }

  // No brief for today yet
  res.json({
    brief: null,
    message: 'No brief generated for today yet',
    briefType: getCurrentBriefType()
  });
});

// Generate a new brief
router.post('/generate', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const today = new Date().toISOString().split('T')[0];
  const briefType = getCurrentBriefType();

  console.log(`[Brief] Generating ${briefType} brief for ${today}...`);

  try {
    // Gather context based on brief type
    const context = await gatherBriefContext(vaultRoot, briefType);

    // Get the appropriate prompt
    const promptConfig = getPrompt(briefType);

    // Build the full prompt with context
    const fullPrompt = buildFullPrompt(promptConfig.prompt, context);

    console.log('[Brief] Context gathered, calling Claude Code...');

    // Call Claude Code to generate the brief
    const briefContent = await callClaudeCode(fullPrompt, vaultRoot);

    // Parse the response into structured sections
    const parsedBrief = parseBriefResponse(briefContent, briefType);

    // Save to cache
    briefCache = {
      date: today,
      brief: parsedBrief,
      generatedAt: new Date().toISOString()
    };

    // Add to history (keep last 10)
    briefHistory.unshift({
      date: today,
      brief: parsedBrief,
      generatedAt: briefCache.generatedAt
    });
    if (briefHistory.length > 10) {
      briefHistory.pop();
    }

    // Save to vault
    await saveBriefToVault(vaultRoot, today, parsedBrief, briefType);

    console.log('[Brief] Brief generated and saved successfully');

    res.json({
      ...parsedBrief,
      generatedAt: briefCache.generatedAt,
      briefType,
      savedToVault: true
    });

  } catch (error) {
    console.error('[Brief] Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get brief history
router.get('/history', (req, res) => {
  res.json({ briefs: briefHistory });
});

// Get brief for specific date
router.get('/date/:date', async (req, res) => {
  const { date } = req.params;
  const vaultRoot = req.app.get('vaultRoot');

  // Check cache first
  const cached = briefHistory.find(b => b.date === date);
  if (cached) {
    return res.json(cached);
  }

  // Try to load from vault
  try {
    const [year, month] = date.split('-');
    const briefPath = join(vaultRoot, 'Daily', year, month, 'Briefs', `${date}-brief.md`);
    const content = await fs.readFile(briefPath, 'utf-8');

    // Parse the saved brief
    const brief = parseVaultBrief(content);
    res.json({ date, brief, fromVault: true });
  } catch (error) {
    res.status(404).json({ error: 'Brief not found for this date' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function gatherBriefContext(vaultRoot, briefType) {
  const context = {
    date: new Date().toISOString().split('T')[0],
    dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    briefType
  };

  try {
    // Get grounding context from vault index files
    context.grounding = await getGroundingContext(vaultRoot);

    // Get Things 3 tasks
    context.tasks = await getThings3Context();

    // Get calendar events (via icalBuddy)
    context.calendar = await getCalendarContext();

    if (briefType === 'weekend') {
      // Get last 5 days of daily notes for reflection
      context.weeklyNotes = await getWeeklyNotesContext(vaultRoot);
    } else {
      // Get today's schedule focus
      context.todayFocus = await getTodayContext(vaultRoot);
    }

    // Get Full Circle areas distribution
    context.areas = await getAreasContext();

  } catch (error) {
    console.error('[Brief] Context gathering error:', error);
  }

  return context;
}

async function getThings3Context() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Get Today tasks
    const { stdout } = await execAsync(`osascript -e '
      tell application "Things3"
        set output to ""
        repeat with toDo in to dos of list "Today"
          set taskName to name of toDo
          set projectName to ""
          set deadlineStr to ""
          try
            set projectName to name of project of toDo
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
          set output to output & "- " & taskName
          if projectName is not "" then set output to output & " [" & projectName & "]"
          if deadlineStr is not "" then set output to output & " (due: " & deadlineStr & ")"
          set output to output & "\\n"
        end repeat
        return output
      end tell
    ' 2>/dev/null`);

    return stdout.trim() || 'No tasks in Things 3 Today list';
  } catch (error) {
    console.error('[Brief] Things 3 error:', error.message);
    return 'Unable to fetch Things 3 tasks';
  }
}

async function getCalendarContext() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Get today's events using icalBuddy
    const { stdout } = await execAsync(`icalBuddy -f -ea -nc -b "- " -ps "| - |" eventsToday 2>/dev/null || echo "Calendar not available"`);

    return stdout.trim() || 'No calendar events today';
  } catch (error) {
    console.error('[Brief] Calendar error:', error.message);
    return 'Unable to fetch calendar';
  }
}

async function getWeeklyNotesContext(vaultRoot) {
  try {
    const today = new Date();
    const notes = [];

    // Get last 5 days of daily notes (reduced from 7 for faster processing)
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const [year, month] = dateStr.split('-');

      const notePath = join(vaultRoot, 'Daily', year, month, `${dateStr}.md`);
      try {
        const content = await fs.readFile(notePath, 'utf-8');
        // Extract just the main content (skip frontmatter, limit length)
        const body = content.replace(/^---[\s\S]*?---\n?/, '').substring(0, 1500);
        notes.push(`### ${dateStr}\n${body}`);
      } catch (e) {
        // Note doesn't exist for this day
      }
    }

    return notes.length > 0 ? notes.join('\n\n') : 'No daily notes found for this week';
  } catch (error) {
    console.error('[Brief] Weekly notes error:', error.message);
    return 'Unable to fetch weekly notes';
  }
}

async function getTodayContext(vaultRoot) {
  const today = new Date().toISOString().split('T')[0];
  const [year, month] = today.split('-');
  const notePath = join(vaultRoot, 'Daily', year, month, `${today}.md`);

  try {
    const content = await fs.readFile(notePath, 'utf-8');
    return content.substring(0, 1500);
  } catch (error) {
    return 'No daily note for today yet';
  }
}

async function getAreasContext() {
  // This would ideally pull from the areas calculation
  // For now, return a placeholder that the dashboard already calculates
  return 'Area distribution will be calculated from task data';
}

async function getGroundingContext(vaultRoot) {
  const grounding = {
    areasIndex: null,
    careerIndex: null
  };

  try {
    // Load Areas Index - key intentions and Full Circle philosophy
    const areasPath = join(vaultRoot, '2-Areas', '0_Areas_Index.md');
    const areasContent = await fs.readFile(areasPath, 'utf-8');
    // Extract key sections: Word of Year, Areas & Intentions, Principles
    const wordMatch = areasContent.match(/## 2026 Word of the Year[\s\S]*?(?=\n---)/);
    const areasMatch = areasContent.match(/## Areas & Intentions[\s\S]*?(?=\n## 2026 Timeline)/);
    const principlesMatch = areasContent.match(/## Principles to Carry Forward[\s\S]*?(?=\n---)/);

    grounding.areasIndex = [
      wordMatch ? wordMatch[0].substring(0, 500) : '',
      areasMatch ? areasMatch[0].substring(0, 2000) : '',
      principlesMatch ? principlesMatch[0].substring(0, 800) : ''
    ].filter(s => s).join('\n\n');

    console.log('[Brief] Loaded Areas Index:', grounding.areasIndex.length, 'chars');
  } catch (error) {
    console.error('[Brief] Areas Index not found:', error.message);
    grounding.areasIndex = 'Areas Index not available';
  }

  try {
    // Load Career Index - vision, current focus, 2026 theme
    const careerPath = join(vaultRoot, '2-Areas', 'Career & Purpose', '0_Career_Purpose_Index.md');
    const careerContent = await fs.readFile(careerPath, 'utf-8');
    // Extract key sections: Vision, 2026 Theme, Current Focus
    const visionMatch = careerContent.match(/## Vision[\s\S]*?(?=\n---)/);
    const themeMatch = careerContent.match(/## 2026 Theme[\s\S]*?(?=\n---)/);
    const currentFocusMatch = careerContent.match(/### Current Focus[\s\S]*?(?=\n---)/);

    grounding.careerIndex = [
      visionMatch ? visionMatch[0].substring(0, 600) : '',
      themeMatch ? themeMatch[0].substring(0, 800) : '',
      currentFocusMatch ? currentFocusMatch[0].substring(0, 500) : ''
    ].filter(s => s).join('\n\n');

    console.log('[Brief] Loaded Career Index:', grounding.careerIndex.length, 'chars');
  } catch (error) {
    console.error('[Brief] Career Index not found:', error.message);
    grounding.careerIndex = 'Career Index not available';
  }

  return grounding;
}

function buildFullPrompt(basePrompt, context) {
  // Build a concise prompt with grounding context
  const contextSection = context.briefType === 'weekend'
    ? `### Last 5 Days Notes (Summary)
${(context.weeklyNotes || 'No notes available').substring(0, 1500)}`
    : `### Today's Focus
${(context.todayFocus || 'No note yet').substring(0, 800)}`;

  // Include grounding context for more personalized recommendations
  const groundingSection = context.grounding ? `
### GROUNDING CONTEXT (User's Vision & Intentions)

**Word of the Year & Life Areas:**
${(context.grounding.areasIndex || '').substring(0, 1500)}

**Career Vision & Current Focus:**
${(context.grounding.careerIndex || '').substring(0, 1200)}
` : '';

  return `${basePrompt}

---
## GROUNDING (Use this to personalize advice)
${groundingSection}

---
## DATA FOR ${context.date} (${context.dayOfWeek})

### Calendar
${(context.calendar || 'No events').substring(0, 1200)}

### Tasks
${(context.tasks || 'No tasks').substring(0, 1200)}

${contextSection}
---
Generate the brief now. Ground recommendations in the user's intentions and vision. Be concise but actionable.`;
}

async function callClaudeCode(prompt, vaultRoot) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  const os = await import('os');

  // Write prompt to a temp file to avoid shell escaping issues with large prompts
  const tmpDir = os.tmpdir();
  const promptFile = join(tmpDir, `kj360-brief-${Date.now()}.txt`);

  try {
    // Limit prompt size and write to temp file
    const trimmedPrompt = prompt.substring(0, 6000);
    await fs.writeFile(promptFile, trimmedPrompt, 'utf-8');

    console.log('[Brief] Wrote prompt to:', promptFile);
    console.log('[Brief] Prompt length:', trimmedPrompt.length, 'chars');

    // Use cat to pipe prompt to claude via stdin
    const { stdout, stderr } = await execAsync(
      `cat "${promptFile}" | claude --print`,
      {
        cwd: vaultRoot,
        timeout: 180000, // 3 minute timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      }
    );

    console.log('[Brief] Claude Code returned', stdout.length, 'chars');

    // Clean up temp file
    await fs.unlink(promptFile).catch(() => {});

    if (stdout.trim()) {
      return stdout.trim();
    } else {
      throw new Error('Claude Code returned empty response');
    }
  } catch (error) {
    // Clean up temp file on error
    await fs.unlink(promptFile).catch(() => {});

    if (error.killed || error.signal === 'SIGTERM') {
      throw new Error('Claude Code timed out after 3 minutes');
    }
    console.error('[Brief] Claude Code error:', error.message);
    throw error;
  }
}

function parseBriefResponse(content, briefType) {
  // Extract structured sections from the response
  const brief = {
    type: briefType,
    raw: content,
    theOneThing: null,
    overview: null,
    sections: []
  };

  // Try to extract "The One Thing" section
  const oneThingMatch = content.match(/#{1,3}\s*(?:1\.\s*)?The One Thing\s*\n([\s\S]*?)(?=\n#{1,3}|\n##|\Z)/i);
  if (oneThingMatch) {
    brief.theOneThing = {
      focus: oneThingMatch[1].trim().split('\n')[0].replace(/^[-*]\s*/, ''),
      reasoning: oneThingMatch[1].trim()
    };
  }

  // Extract overview (first paragraph or section)
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length > 0) {
    brief.overview = lines.slice(0, 3).join(' ').substring(0, 500);
  }

  return brief;
}

function parseVaultBrief(content) {
  // Parse a brief that was saved to the vault
  return {
    raw: content,
    overview: content.substring(0, 500)
  };
}

async function saveBriefToVault(vaultRoot, date, brief, briefType) {
  const [year, month] = date.split('-');
  const briefDir = join(vaultRoot, 'Daily', year, month, 'Briefs');
  const briefPath = join(briefDir, `${date}-brief.md`);

  try {
    // Ensure directory exists
    await fs.mkdir(briefDir, { recursive: true });

    // Format the brief as markdown
    const content = `---
date: ${date}
type: ${briefType}
generated: ${new Date().toISOString()}
---

# ${briefType === 'weekend' ? 'Weekend Reflection' : 'Daily Brief'} - ${date}

${brief.raw}
`;

    await fs.writeFile(briefPath, content, 'utf-8');
    console.log('[Brief] Saved to:', briefPath);

  } catch (error) {
    console.error('[Brief] Failed to save to vault:', error);
  }
}

// ============================================
// CRON JOB SETUP (called from server.js)
// ============================================

export function scheduleDailyBrief(app) {
  const vaultRoot = app.get('vaultRoot');

  // Check every minute if it's 6:00 AM
  setInterval(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Run at 6:00 AM
    if (hours === 6 && minutes === 0) {
      const today = now.toISOString().split('T')[0];

      // Only generate if we haven't already today
      if (briefCache.date !== today) {
        console.log('[Brief] 6 AM trigger - generating daily brief...');

        try {
          const briefType = getCurrentBriefType();
          const context = await gatherBriefContext(vaultRoot, briefType);
          const promptConfig = getPrompt(briefType);
          const fullPrompt = buildFullPrompt(promptConfig.prompt, context);
          const briefContent = await callClaudeCode(fullPrompt, vaultRoot);
          const parsedBrief = parseBriefResponse(briefContent, briefType);

          briefCache = {
            date: today,
            brief: parsedBrief,
            generatedAt: new Date().toISOString()
          };

          briefHistory.unshift({
            date: today,
            brief: parsedBrief,
            generatedAt: briefCache.generatedAt
          });

          await saveBriefToVault(vaultRoot, today, parsedBrief, briefType);

          console.log('[Brief] 6 AM brief generated successfully');
        } catch (error) {
          console.error('[Brief] 6 AM generation failed:', error);
        }
      }
    }
  }, 60000); // Check every minute

  console.log('[Brief] Daily brief scheduler started (6 AM trigger)');
}

export default router;
