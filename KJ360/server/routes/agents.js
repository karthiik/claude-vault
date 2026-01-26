import { Router } from 'express';
import {
  startAgentJob,
  getJobStatus
} from '../services/agentRunner.js';

const router = Router();

// Available agents list
const AGENTS = ['tasks', 'calendar', 'things-sync', 'inbox-scanner', 'nurture-checker'];

/**
 * POST /api/agents/run
 * Start a parallel agent job
 *
 * Body: { agents: ["tasks", "calendar", "things-sync"] }
 * Returns: { jobId: "abc123" }
 */
router.post('/run', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');
  const { agents } = req.body;

  if (!agents || !Array.isArray(agents) || agents.length === 0) {
    return res.status(400).json({
      error: 'agents array required',
      available: AGENTS
    });
  }

  // Validate agent names
  const invalid = agents.filter(a => !AGENTS.includes(a));
  if (invalid.length > 0) {
    return res.status(400).json({
      error: `Unknown agents: ${invalid.join(', ')}`,
      available: AGENTS
    });
  }

  try {
    const jobId = await startAgentJob(agents, vaultRoot);
    res.json({ jobId, agents, status: 'started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/status/:jobId
 * Poll for job status
 */
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJobStatus(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

/**
 * GET /api/agents/available
 * List available agents
 */
router.get('/available', (req, res) => {
  res.json({
    agents: AGENTS,
    descriptions: {
      tasks: 'Parse vault for Now View tasks (Overdue + Today + 3 Undated)',
      calendar: 'Query icalBuddy for today\'s events',
      'things-sync': 'Bi-directional sync with Things 3',
      'inbox-scanner': 'Count and list inbox items, flag stale ones',
      'nurture-checker': 'Check relationship health, flag needing attention'
    }
  });
});

/**
 * POST /api/agents/morning-prep
 * Convenience endpoint to run all morning prep agents
 */
router.post('/morning-prep', async (req, res) => {
  const vaultRoot = req.app.get('vaultRoot');

  const morningAgents = ['tasks', 'calendar', 'things-sync', 'inbox-scanner', 'nurture-checker'];

  try {
    const jobId = await startAgentJob(morningAgents, vaultRoot);
    res.json({
      jobId,
      agents: morningAgents,
      status: 'started',
      message: 'Running morning prep bundle...'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
