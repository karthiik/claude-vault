import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Vault configuration (edit config/vault.config.js for your vault)
import vaultConfig from './config/vault.config.js';

// Routes - Simplified architecture
import healthRoutes from './routes/health.js';
import vaultRoutes from './routes/vault.js';
import tasksRoutes from './routes/tasks.js';
import calendarRoutes from './routes/calendar.js';
import skillRoutes from './routes/skill.js';
import agentRoutes from './routes/agent.js';
import smartNowRoutes from './routes/smartnow.js';

// Legacy routes (keeping for now, will remove after testing)
import dashboardRoutes from './routes/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || vaultConfig.server?.port || 3600;

// Vault root is two levels up from server folder
const VAULT_ROOT = join(__dirname, '..', '..');

// Middleware
app.use(cors());
app.use(express.json());

// Make vault path and config available to routes
app.set('vaultRoot', VAULT_ROOT);
app.set('vaultConfig', vaultConfig);

// ============================================
// NEW SKILL-BASED API ROUTES
// ============================================
app.use('/api/skill', skillRoutes);     // Unified skill invocation
app.use('/api/agent', agentRoutes);     // Streaming agent with sessions
app.use('/api/health', healthRoutes);   // Health check
app.use('/api/vault', vaultRoutes);     // Vault file access
app.use('/api/tasks', tasksRoutes);     // Things 3 integration
app.use('/api/calendar', calendarRoutes); // icalBuddy integration
app.use('/api/smart-now', smartNowRoutes); // Smart Now - AI prioritization

// Legacy routes (for backward compatibility during transition)
app.use('/api/dashboard', dashboardRoutes);

// ============================================
// REMOVED ROUTES (skill-based architecture replaces these)
// ============================================
// - /api/chat → Use Claude Code directly or /api/skill/invoke
// - /api/agents → Use /api/skill/invoke with skills
// - /api/brief → Use /api/skill/invoke/morning-brief or /api/skill/invoke/weekly-review

// Serve static React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '..', 'app', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '..', 'app', 'dist', 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('[KJ360 Error]', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🌟 KJ360 Life Command Center v2.0                   ║
║      Skill-Based Architecture                         ║
║                                                       ║
║   Server: http://localhost:${PORT}                      ║
║   Vault:  ${VAULT_ROOT}
║                                                       ║
║   Core Endpoints:                                     ║
║   • GET  /api/skill/list        - List skills         ║
║   • POST /api/skill/invoke/:name - Run a skill        ║
║   • GET  /api/skill/brief/latest - Get latest brief   ║
║   • GET  /api/skill/status      - Get cached status   ║
║                                                       ║
║   Data Endpoints:                                     ║
║   • GET  /api/tasks/today       - Things 3 tasks      ║
║   • GET  /api/calendar/today    - Calendar events     ║
║   • POST /api/skill/refresh/*   - Refresh caches      ║
║                                                       ║
║   Skills Available:                                   ║
║   • /morning-brief  - Tactical daily brief            ║
║   • /weekly-review  - Reflective weekend review       ║
║   • /now           - What to focus on now             ║
║   • /capture       - Quick thought capture            ║
║   • /triage        - Process inbox items              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
