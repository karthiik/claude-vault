/**
 * Claude Agent Service
 *
 * Provides Claude Code integration using best practices from Claude Agent SDK:
 * - Streaming responses via Server-Sent Events
 * - Session persistence for context resumption
 * - Structured skill execution with tool whitelisting
 * - Timeout handling and graceful error recovery
 *
 * Note: This implementation uses the claude CLI with streaming support.
 * For full Agent SDK integration, install @anthropic-ai/claude-agent-sdk
 */

import { spawn } from 'child_process';
import { join } from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { randomUUID } from 'crypto';
import os from 'os';

// Session storage (in production, use Redis or database)
const sessions = new Map();

// Default timeout for agent operations (10 minutes)
const AGENT_TIMEOUT_MS = 600000;

// Skill registry with tool configurations
export const skillRegistry = {
  'morning-brief': {
    description: 'Generate tactical morning brief with calendar, tasks, and focus recommendations',
    allowedTools: ['Read', 'Bash', 'Glob', 'Grep'],
    timeout: 120000, // 2 minutes
    cacheTTL: 4 * 60 * 60 * 1000, // 4 hours
  },
  'weekly-review': {
    description: 'Reflective weekend review analyzing the past week',
    allowedTools: ['Read', 'Bash', 'Glob', 'Grep'],
    timeout: 180000, // 3 minutes
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  },
  'now': {
    description: 'Determine what to focus on right now based on time, energy, and priorities',
    allowedTools: ['Read', 'Bash', 'Glob'],
    timeout: 60000, // 1 minute
  },
  'capture': {
    description: 'Quick capture a thought, task, or idea to inbox',
    allowedTools: ['Read', 'Write'],
    timeout: 30000, // 30 seconds
  },
  'triage': {
    description: 'Process inbox items and uncategorized tasks',
    allowedTools: ['Read', 'Write', 'Glob'],
    timeout: 120000, // 2 minutes
  },
  'code-review': {
    description: 'Review code for quality, bugs, and best practices',
    allowedTools: ['Read', 'Glob', 'Grep'],
    timeout: 180000,
  },
  'chat': {
    description: 'General conversation and assistance',
    allowedTools: ['Read', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
    timeout: 300000, // 5 minutes
  }
};

/**
 * Create or retrieve a session
 */
export function getOrCreateSession(sessionId = null) {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    session.lastAccessedAt = new Date();
    return session;
  }

  const newSessionId = sessionId || randomUUID();
  const session = {
    id: newSessionId,
    history: [],
    createdAt: new Date(),
    lastAccessedAt: new Date(),
  };
  sessions.set(newSessionId, session);
  return session;
}

/**
 * Add message to session history
 */
export function addToSessionHistory(sessionId, role, content) {
  const session = sessions.get(sessionId);
  if (session) {
    session.history.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
    // Keep only last 20 messages to manage context
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }
  }
}

/**
 * Execute a skill with streaming output
 *
 * @param {Object} options
 * @param {string} options.skillName - Name of the skill to execute
 * @param {string} options.prompt - User's prompt/input
 * @param {string} options.sessionId - Optional session ID for context resumption
 * @param {string} options.vaultRoot - Path to vault root
 * @param {function} options.onChunk - Callback for each streamed chunk
 * @param {function} options.onError - Callback for errors
 * @param {function} options.onComplete - Callback when complete
 */
export async function executeSkillWithStreaming({
  skillName,
  prompt,
  sessionId,
  vaultRoot,
  onChunk,
  onError,
  onComplete
}) {
  const skill = skillRegistry[skillName] || skillRegistry['chat'];
  const session = getOrCreateSession(sessionId);
  const timeout = skill.timeout || AGENT_TIMEOUT_MS;

  // Track the session ID
  onChunk?.({
    type: 'session',
    sessionId: session.id,
    isNew: !sessionId
  });

  try {
    // Build context from session history if resuming
    let contextPrompt = prompt;
    if (session.history.length > 0) {
      const recentHistory = session.history.slice(-5).map(m =>
        `${m.role}: ${m.content}`
      ).join('\n\n');
      contextPrompt = `Previous context:\n${recentHistory}\n\nCurrent request: ${prompt}`;
    }

    // Add user message to history
    addToSessionHistory(session.id, 'user', prompt);

    // Check for skill file
    const skillPath = join(vaultRoot, '.claude', 'skills', skillName, 'SKILL.md');
    let skillContent = '';

    try {
      skillContent = await fs.readFile(skillPath, 'utf-8');
      // Remove frontmatter
      skillContent = skillContent.replace(/^---[\s\S]*?---\n?/, '');
    } catch {
      // No skill file, use prompt directly
      skillContent = contextPrompt;
    }

    // Execute command injections if skill file exists
    if (skillContent.includes('!`')) {
      skillContent = await executeCommandInjections(skillContent, vaultRoot, onChunk);
    }

    // Combine skill content with user prompt if not in skill file
    const finalPrompt = skillContent.includes(prompt) ? skillContent : `${skillContent}\n\nUser request: ${contextPrompt}`;

    // Stream response from Claude
    const result = await streamClaudeResponse({
      prompt: finalPrompt,
      allowedTools: skill.allowedTools,
      timeout,
      vaultRoot,
      onChunk
    });

    // Add assistant response to history
    addToSessionHistory(session.id, 'assistant', result);

    onComplete?.({
      type: 'complete',
      sessionId: session.id,
      result,
      timestamp: new Date().toISOString()
    });

    return {
      sessionId: session.id,
      result
    };

  } catch (error) {
    onError?.({
      type: 'error',
      error: error.message,
      sessionId: session.id
    });
    throw error;
  }
}

/**
 * Execute !`command` injections in skill content
 */
async function executeCommandInjections(content, vaultRoot, onChunk) {
  const commandPattern = /!`([^`]+)`/g;
  const MAX_OUTPUT = 4000;

  // Whitelist of allowed commands
  const ALLOWED_PATTERNS = [
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

  const matches = [...content.matchAll(commandPattern)];

  if (matches.length === 0) return content;

  onChunk?.({
    type: 'status',
    message: `Executing ${matches.length} context injections...`
  });

  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const replacements = new Map();

  await Promise.all(matches.map(async (match) => {
    const cmd = match[1];
    const fullMatch = match[0];

    // Security check
    const isAllowed = ALLOWED_PATTERNS.some(p => p.test(cmd.trim()));
    if (!isAllowed) {
      replacements.set(fullMatch, `[Command not allowed]`);
      return;
    }

    try {
      const { stdout } = await execAsync(cmd, {
        cwd: vaultRoot,
        timeout: 15000
      });
      replacements.set(fullMatch, stdout.trim().substring(0, MAX_OUTPUT));
    } catch (err) {
      replacements.set(fullMatch, `[Error: ${err.message}]`);
    }
  }));

  // Single-pass replacement
  return content.replace(commandPattern, match => replacements.get(match) || match);
}

/**
 * Stream response from Claude CLI
 */
async function streamClaudeResponse({ prompt, allowedTools, timeout, vaultRoot, onChunk }) {
  return new Promise((resolve, reject) => {
    const tmpFile = join(os.tmpdir(), `kj360-agent-${Date.now()}.txt`);

    // Write prompt to temp file
    fsSync.writeFileSync(tmpFile, prompt, 'utf-8');

    // Build claude command with allowed tools
    const toolsArg = allowedTools?.length > 0
      ? `--allowedTools "${allowedTools.join(',')}"`
      : '';

    // Use claude with streaming (--print streams to stdout)
    const child = spawn('bash', [
      '-c',
      `cat "${tmpFile}" | claude --print ${toolsArg}`
    ], {
      cwd: vaultRoot,
      env: { ...process.env }
    });

    let result = '';
    let timeoutId;

    // Set timeout
    timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Agent timed out after ${timeout}ms`));
    }, timeout);

    // Stream stdout chunks
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      result += chunk;
      onChunk?.({
        type: 'text',
        content: chunk
      });
    });

    // Capture stderr for debugging
    child.stderr.on('data', (data) => {
      console.error('[Claude stderr]:', data.toString());
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);

      // Clean up temp file
      try {
        fsSync.unlinkSync(tmpFile);
      } catch {}

      if (code === 0) {
        resolve(result.trim());
      } else {
        reject(new Error(`Claude exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Get session info
 */
export function getSessionInfo(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  return {
    id: session.id,
    messageCount: session.history.length,
    createdAt: session.createdAt,
    lastAccessedAt: session.lastAccessedAt
  };
}

/**
 * List all active sessions
 */
export function listSessions() {
  return Array.from(sessions.entries()).map(([id, session]) => ({
    id,
    messageCount: session.history.length,
    createdAt: session.createdAt,
    lastAccessedAt: session.lastAccessedAt
  }));
}

/**
 * Clear old sessions (call periodically)
 */
export function cleanupSessions(maxAgeMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of sessions) {
    if (now - session.lastAccessedAt.getTime() > maxAgeMs) {
      sessions.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}

// Cleanup old sessions every hour
setInterval(() => {
  const cleaned = cleanupSessions();
  if (cleaned > 0) {
    console.log(`[ClaudeAgent] Cleaned up ${cleaned} old sessions`);
  }
}, 60 * 60 * 1000);

export default {
  skillRegistry,
  executeSkillWithStreaming,
  getOrCreateSession,
  getSessionInfo,
  listSessions,
  cleanupSessions
};
