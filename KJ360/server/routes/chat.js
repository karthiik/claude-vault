import { Router } from 'express';
import { spawn } from 'child_process';
import { join } from 'path';
import fs from 'fs/promises';
import {
  extractEntities,
  lookupMemories,
  buildContextInjection,
  checkAmbiguousEntities
} from '../services/memory.js';
import { createAuditEntry, logChatSession } from '../services/audit.js';

const router = Router();

// In-memory session store (would use Redis in production)
const sessions = new Map();

// Chat with Claude Code
router.post('/', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const { message, sessionId = 'default' } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message required' });
  }

  // Get or create session
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      messages: [],
      entities: { people: [], projects: [], areas: [], tags: [] }
    });
  }
  const session = sessions.get(sessionId);

  try {
    // Check for slash commands first
    if (message.startsWith('/')) {
      const result = await handleSlashCommand(message, vaultRoot);
      session.messages.push({ role: 'user', content: message });
      session.messages.push({ role: 'assistant', content: result.message });
      return res.json(result);
    }

    // --- Agent Framework: Entity Extraction & Context Injection ---

    // 1. Extract entities from user message
    const entities = await extractEntities(message, vaultRoot);

    // 2. Check for ambiguous entities
    const ambiguous = await checkAmbiguousEntities(entities, vaultRoot);
    if (ambiguous.length > 0) {
      // Ask user to disambiguate
      const amb = ambiguous[0];
      return res.json({
        type: 'disambiguation',
        message: `I found multiple matches for "${amb.query}": ${amb.matches.join(', ')}. Which one did you mean?`,
        options: amb.matches,
        originalMessage: message
      });
    }

    // 3. Lookup relevant memories
    const memories = await lookupMemories(entities, vaultRoot);

    // 4. Build context injection
    const contextInjection = buildContextInjection(entities, memories);

    // 5. Call Claude Code with injected context
    const response = await callClaudeCode(message, vaultRoot, contextInjection);

    // 6. Log session for memory catching
    session.messages.push({ role: 'user', content: message });
    session.messages.push({ role: 'assistant', content: response.message });

    // 7. Create audit entry
    await createAuditEntry(vaultRoot, 'the-star', {
      actions: [`Processed user message: "${message.slice(0, 50)}..."`],
      decisions: memories.length > 0
        ? [`Injected ${memories.length} relevant memories into context`]
        : [],
      entitiesTouched: [...entities.people, ...entities.projects],
      allFieldsPresent: true,
      entityLinksResolved: ambiguous.length === 0
    });

    res.json({
      ...response,
      entitiesDetected: entities,
      memoriesInjected: memories.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle disambiguation response
router.post('/disambiguate', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const { originalMessage, selectedEntity, sessionId = 'default' } = req.body;

  // Replace ambiguous reference with selected entity
  const clarifiedMessage = `Regarding ${selectedEntity}: ${originalMessage}`;

  // Re-process with clarified message
  const entities = await extractEntities(clarifiedMessage, vaultRoot);
  const memories = await lookupMemories(entities, vaultRoot);
  const contextInjection = buildContextInjection(entities, memories);
  const response = await callClaudeCode(clarifiedMessage, vaultRoot, contextInjection);

  res.json({
    ...response,
    entitiesDetected: entities,
    memoriesInjected: memories.length
  });
});

// Get session history
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ messages: session.messages });
});

// Clear session
router.delete('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  sessions.delete(sessionId);
  res.json({ status: 'success', message: 'Session cleared' });
});

// Handle slash commands
async function handleSlashCommand(message, vaultRoot) {
  const [command, ...args] = message.slice(1).split(' ');
  const argText = args.join(' ');

  switch (command.toLowerCase()) {
    case 'now':
      return {
        type: 'slash_command',
        command: 'now',
        message: 'Fetching Now View tasks...',
        action: 'redirect',
        target: '/now'
      };

    case 'dashboard':
      return {
        type: 'slash_command',
        command: 'dashboard',
        message: 'Generating dashboard...',
        action: 'generate_dashboard'
      };

    case 'startday':
      // Generate and populate today's Daily note with live data
      const startdayResult = await generateStartday(vaultRoot);
      return {
        type: 'slash_command',
        command: 'startday',
        message: startdayResult.message,
        file: startdayResult.file
      };

    case 'inbox':
      if (!argText) {
        return {
          type: 'error',
          message: 'Usage: /inbox <text to capture>'
        };
      }
      // Create inbox file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${timestamp.slice(0, 16)}-capture.md`;
      const filePath = join(vaultRoot, '0-Inbox', fileName);

      await fs.writeFile(filePath, `# Quick Capture\n\n${argText}\n\n---\nCaptured: ${new Date().toLocaleString()}\n`, 'utf-8');

      // Create audit entry
      await createAuditEntry(vaultRoot, 'the-star', {
        actions: [`Created inbox capture: ${fileName}`],
        filesCreated: [`0-Inbox/${fileName}`],
        allFieldsPresent: true,
        entityLinksResolved: true
      });

      return {
        type: 'slash_command',
        command: 'inbox',
        message: `✓ Captured to Inbox: ${fileName}`,
        file: `0-Inbox/${fileName}`
      };

    case 'sync':
      return {
        type: 'slash_command',
        command: 'sync',
        message: 'Syncing with Things 3...',
        action: 'run_agents',
        agents: ['things-sync']
      };

    case 'agents':
    case 'prep':
      // Run morning prep bundle
      return {
        type: 'slash_command',
        command: 'agents',
        message: 'Running morning prep agents (tasks, calendar, things-sync, inbox, nurture)...',
        action: 'run_agents',
        agents: ['tasks', 'calendar', 'things-sync', 'inbox-scanner', 'nurture-checker']
      };

    case 'pause':
      return {
        type: 'slash_command',
        command: 'pause',
        message: 'Session paused. State saved.',
        action: 'pause_session'
      };

    case 'memory':
      // Debug command to show recent memories
      try {
        const memories = await fs.readFile(
          join(vaultRoot, 'KJ360/system/memories.jsonl'),
          'utf-8'
        );

        const recentMemories = memories
          .trim()
          .split('\n')
          .filter(Boolean)
          .slice(-5)
          .map(line => JSON.parse(line))
          .map(m => `[${m.type}] ${m.content}`)
          .join('\n');

        return {
          type: 'slash_command',
          command: 'memory',
          message: recentMemories || 'No memories yet.'
        };
      } catch {
        return {
          type: 'slash_command',
          command: 'memory',
          message: 'No memories yet.'
        };
      }

    case 'help':
      return {
        type: 'slash_command',
        command: 'help',
        message: `Available commands:
• /now - Show Now View tasks
• /startday - Populate today's Daily note with live data
• /prep or /agents - Run all morning prep agents in parallel
• /dashboard - Generate morning dashboard
• /inbox <text> - Quick capture to inbox
• /sync - Sync with Things 3
• /pause - Pause and save session
• /help - Show this help`
      };

    default:
      return {
        type: 'error',
        message: `Unknown command: /${command}. Type /help for available commands.`
      };
  }
}

// Call Claude Code CLI with context injection
async function callClaudeCode(message, vaultRoot, contextInjection = null) {
  return new Promise((resolve, reject) => {
    // Build the prompt with optional context injection
    let fullPrompt = message;
    if (contextInjection) {
      fullPrompt = `${contextInjection}\n\nUser request: ${message}`;
    }

    // Build the claude command
    const claudeProcess = spawn('claude', [
      '--print',
      '--dangerously-skip-permissions',
      fullPrompt
    ], {
      cwd: vaultRoot,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    claudeProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    claudeProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    claudeProcess.on('close', (code) => {
      if (code !== 0 && !stdout) {
        resolve({
          type: 'error',
          message: stderr || `Claude Code exited with code ${code}`,
          code
        });
      } else {
        resolve({
          type: 'response',
          message: stdout.trim(),
          tokensUsed: null // TODO: Parse from output if available
        });
      }
    });

    claudeProcess.on('error', (error) => {
      // Claude might not be installed
      resolve({
        type: 'error',
        message: `Claude Code not available. Install with: npm install -g @anthropic-ai/claude-code\n\nError: ${error.message}`
      });
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      claudeProcess.kill();
      resolve({
        type: 'timeout',
        message: 'Request timed out after 60 seconds'
      });
    }, 60000);
  });
}

// Generate /startday content for Daily note
async function generateStartday(vaultRoot) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dailyFile = join(vaultRoot, 'Daily', `${dateStr}.md`);

  try {
    // Run all agents to get fresh data
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Get Things 3 today tasks
    let thingsTasks = [];
    try {
      const { stdout } = await execAsync('things-cli today --json 2>/dev/null || echo "[]"');
      thingsTasks = JSON.parse(stdout) || [];
    } catch { thingsTasks = []; }

    // Get calendar events via icalBuddy
    let events = [];
    try {
      const { stdout } = await execAsync('icalBuddy -nc -nrd -npn -ea -b "" eventsToday 2>/dev/null || echo ""');
      events = stdout.trim().split('\n').filter(e => e.trim());
    } catch { events = []; }

    // Get inbox count
    let inboxCount = 0;
    try {
      const inboxFiles = await fs.readdir(join(vaultRoot, '0-Inbox'));
      inboxCount = inboxFiles.filter(f => f.endsWith('.md')).length;
    } catch { inboxCount = 0; }

    // Build the Morning Brief content
    const thingsTasksList = thingsTasks.length > 0
      ? thingsTasks.map(t => `- ${t.title || t.name}`).join('\n')
      : '- No tasks in Things 3 Today';

    const meetingsTable = events.length > 0
      ? events.map(e => `| ${e} | | | |`).join('\n')
      : '| *No meetings today* | | | |';

    // Read existing daily file to update
    let existingContent = '';
    try {
      existingContent = await fs.readFile(dailyFile, 'utf-8');
    } catch {
      // File doesn't exist - will be created by Templater
      return {
        message: `📅 Daily note for ${dateStr} doesn't exist yet. Create it in Obsidian first, then run /startday to populate it.`,
        file: null
      };
    }

    // Update the Things 3: Today section
    const thingsSection = `### ✅ Things 3: Today\n\n${thingsTasksList}`;
    const thingsRegex = /### ✅ Things 3: Today\n\n[\s\S]*?(?=\n###|\n---)/;

    if (existingContent.match(thingsRegex)) {
      existingContent = existingContent.replace(thingsRegex, thingsSection + '\n');
    }

    // Update heads up with inbox count if stale items
    if (inboxCount > 0) {
      const headsUpMatch = existingContent.match(/### ⚠️ Heads Up\n\n([\s\S]*?)(?=\n---)/);
      if (headsUpMatch && !headsUpMatch[1].includes('Inbox')) {
        const updatedHeadsUp = headsUpMatch[0] + `\n${inboxCount}. **Inbox has ${inboxCount} items** — process or delegate.`;
        existingContent = existingContent.replace(headsUpMatch[0], updatedHeadsUp);
      }
    }

    await fs.writeFile(dailyFile, existingContent, 'utf-8');

    // Create audit entry
    await createAuditEntry(vaultRoot, 'the-star', {
      actions: [`Populated Daily note: ${dateStr}`],
      filesModified: [`Daily/${dateStr}.md`],
      data: {
        thingsTasksCount: thingsTasks.length,
        eventsCount: events.length,
        inboxCount
      }
    });

    return {
      message: `✓ Populated ${dateStr}.md:\n• ${thingsTasks.length} Things 3 tasks\n• ${events.length} calendar events\n• ${inboxCount} inbox items`,
      file: `Daily/${dateStr}.md`
    };
  } catch (error) {
    return {
      message: `Error generating startday: ${error.message}`,
      file: null
    };
  }
}

export default router;
