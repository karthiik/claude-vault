/**
 * Agent Routes
 *
 * Provides Server-Sent Events (SSE) streaming for Claude agent interactions.
 * Follows Claude Agent SDK patterns for:
 * - Real-time streaming responses
 * - Session management and context resumption
 * - Structured skill invocation
 */

import { Router } from 'express';
import {
  executeSkillWithStreaming,
  skillRegistry,
  getSessionInfo,
  listSessions,
  getOrCreateSession
} from '../services/claudeAgent.js';

const router = Router();

/**
 * GET /api/agent/skills
 * List available skills with their configurations
 */
router.get('/skills', (req, res) => {
  const skills = Object.entries(skillRegistry).map(([name, config]) => ({
    name,
    description: config.description,
    timeout: config.timeout,
    allowedTools: config.allowedTools
  }));

  res.json({ skills });
});

/**
 * POST /api/agent/invoke
 * Invoke a skill with Server-Sent Events streaming
 *
 * Body:
 * - skillName: string (required) - Name of the skill to invoke
 * - prompt: string (required) - User's prompt/input
 * - sessionId: string (optional) - Session ID to resume context
 *
 * Returns: SSE stream with message types:
 * - session: { sessionId, isNew } - Session info
 * - status: { message } - Status updates
 * - text: { content } - Streamed text chunks
 * - complete: { result, timestamp } - Final result
 * - error: { error } - Error message
 */
router.post('/invoke', async (req, res) => {
  const { skillName, prompt, sessionId } = req.body;
  const vaultRoot = req.app.get('vaultRoot');

  if (!skillName || !prompt) {
    return res.status(400).json({
      error: 'skillName and prompt are required'
    });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Helper to send SSE events
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await executeSkillWithStreaming({
      skillName,
      prompt,
      sessionId,
      vaultRoot,
      onChunk: sendEvent,
      onError: (error) => {
        sendEvent(error);
      },
      onComplete: (result) => {
        sendEvent(result);
        sendEvent({ type: 'done' });
        res.end();
      }
    });
  } catch (error) {
    sendEvent({
      type: 'error',
      error: error.message
    });
    sendEvent({ type: 'done' });
    res.end();
  }
});

/**
 * POST /api/agent/chat
 * General chat endpoint with streaming (uses 'chat' skill)
 */
router.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  const vaultRoot = req.app.get('vaultRoot');

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await executeSkillWithStreaming({
      skillName: 'chat',
      prompt: message,
      sessionId,
      vaultRoot,
      onChunk: sendEvent,
      onError: (error) => sendEvent(error),
      onComplete: (result) => {
        sendEvent(result);
        sendEvent({ type: 'done' });
        res.end();
      }
    });
  } catch (error) {
    sendEvent({ type: 'error', error: error.message });
    sendEvent({ type: 'done' });
    res.end();
  }
});

/**
 * GET /api/agent/sessions
 * List all active sessions
 */
router.get('/sessions', (req, res) => {
  const sessions = listSessions();
  res.json({ sessions });
});

/**
 * GET /api/agent/sessions/:sessionId
 * Get session info
 */
router.get('/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = getSessionInfo(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ session });
});

/**
 * POST /api/agent/sessions
 * Create a new session
 */
router.post('/sessions', (req, res) => {
  const session = getOrCreateSession();
  res.json({
    sessionId: session.id,
    createdAt: session.createdAt
  });
});

/**
 * Non-streaming invoke for simpler use cases
 * POST /api/agent/invoke-sync
 */
router.post('/invoke-sync', async (req, res) => {
  const { skillName, prompt, sessionId } = req.body;
  const vaultRoot = req.app.get('vaultRoot');

  if (!skillName || !prompt) {
    return res.status(400).json({
      error: 'skillName and prompt are required'
    });
  }

  try {
    let finalResult = '';
    let capturedSessionId = sessionId;

    await executeSkillWithStreaming({
      skillName,
      prompt,
      sessionId,
      vaultRoot,
      onChunk: (chunk) => {
        if (chunk.type === 'text') {
          finalResult += chunk.content;
        }
        if (chunk.type === 'session') {
          capturedSessionId = chunk.sessionId;
        }
      },
      onComplete: () => {},
      onError: (error) => {
        throw new Error(error.error);
      }
    });

    res.json({
      result: finalResult,
      sessionId: capturedSessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
