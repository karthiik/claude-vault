const express = require('express');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const app = express();
const PORT = 3333;

// Vault root (parent of Webapp folder)
const VAULT_ROOT = path.resolve(__dirname, '../../..');
const DAILY_FOLDER = path.join(VAULT_ROOT, 'Daily');
const TEMPLATE_PATH = path.join(VAULT_ROOT, 'Templates', 'Daily.md');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store for recent files (in-memory, persists while server runs)
let recentFiles = [];
const MAX_RECENT = 10;

// ============================================
// API Routes
// ============================================

// Get vault file tree
app.get('/api/files', (req, res) => {
  try {
    const tree = buildFileTree(VAULT_ROOT);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get file content
app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'Path required' });
  }

  const fullPath = path.join(VAULT_ROOT, filePath);

  // Security: ensure path is within vault
  if (!fullPath.startsWith(VAULT_ROOT)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Add to recent files
    addToRecent(filePath);

    res.json({ content, path: filePath });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

// Save file content
app.post('/api/file', (req, res) => {
  const { path: filePath, content } = req.body;

  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'Path and content required' });
  }

  const fullPath = path.join(VAULT_ROOT, filePath);

  // Security: ensure path is within vault
  if (!fullPath.startsWith(VAULT_ROOT)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get today's daily note (or create from template)
app.get('/api/daily', (req, res) => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const dailyPath = `Daily/${dateStr}.md`;
  const fullPath = path.join(VAULT_ROOT, dailyPath);

  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      addToRecent(dailyPath);
      res.json({ content, path: dailyPath, created: false });
    } else {
      // Create from template
      const content = createDailyNote(today);

      // Ensure Daily folder exists
      fs.mkdirSync(DAILY_FOLDER, { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');

      addToRecent(dailyPath);
      res.json({ content, path: dailyPath, created: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent files
app.get('/api/recent', (req, res) => {
  res.json(recentFiles);
});

// Get vision documents
app.get('/api/vision/:person', (req, res) => {
  const person = req.params.person;
  let filePath;

  if (person === 'karthik') {
    filePath = '3-Resources/Life/Me/2026 Vision and Intentions - Karthik.md';
  } else if (person === 'jamie') {
    filePath = '3-Resources/Life/Jamie/2025 Recap and 2026 Vision - Jamie.md';
  } else {
    return res.status(400).json({ error: 'Unknown person' });
  }

  const fullPath = path.join(VAULT_ROOT, filePath);

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ content, path: filePath });
  } catch (err) {
    res.status(404).json({ error: 'Vision file not found' });
  }
});

// ============================================
// Helper Functions
// ============================================

function buildFileTree(dir, relativePath = '') {
  const items = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // Sort: folders first, then files, alphabetically
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    // Skip hidden files and .obsidian folder
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules') continue;

    const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        path: entryPath,
        type: 'folder',
        children: buildFileTree(path.join(dir, entry.name), entryPath)
      });
    } else if (entry.name.endsWith('.md')) {
      items.push({
        name: entry.name,
        path: entryPath,
        type: 'file'
      });
    }
  }

  return items;
}

function addToRecent(filePath) {
  // Remove if already exists
  recentFiles = recentFiles.filter(f => f !== filePath);
  // Add to front
  recentFiles.unshift(filePath);
  // Trim to max
  recentFiles = recentFiles.slice(0, MAX_RECENT);
}

function createDailyNote(date) {
  // Read template
  let template;
  try {
    template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  } catch (err) {
    // Fallback minimal template
    return `# ${formatDate(date)}\n\n## Notes\n\n`;
  }

  // Process basic Templater-style date substitutions
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const weekNum = getWeekNumber(date);
  const dateStr = date.toISOString().split('T')[0];
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekFromNow = new Date(date);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  // Replace Templater syntax with actual values
  let content = template
    // Day name
    .replace(/<% tp\.date\.now\("dddd"\) %>/g, dayName)
    // Week number
    .replace(/<% tp\.date\.now\("W"\) %>/g, String(weekNum))
    // Today's date
    .replace(/<% tp\.date\.now\("YYYY-MM-DD"\) %>/g, dateStr)
    // Yesterday
    .replace(/<% tp\.date\.now\("YYYY-MM-DD", -1\) %>/g, yesterday.toISOString().split('T')[0])
    // Tomorrow
    .replace(/<% tp\.date\.now\("YYYY-MM-DD", 1\) %>/g, tomorrow.toISOString().split('T')[0])
    // Week from now
    .replace(/<% tp\.date\.now\("YYYY-MM-DD", 7\) %>/g, weekFromNow.toISOString().split('T')[0]);

  // Remove Templater JS blocks (they'll process in Obsidian)
  // Keep the static parts, replace JS blocks with placeholder
  content = content.replace(/<%\*[\s\S]*?_%>/g, '');

  // Replace randomSpark placeholder with a note
  content = content.replace(/<% randomSpark %>/g, '*Open in Obsidian for Daily Spark*');

  // Replace calendar placeholder
  content = content.replace(/<% calendar %>/g, '*Open in Obsidian for calendar*');

  return content;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║         Vision Dashboard Running              ║
║                                               ║
║   Local:  http://localhost:${PORT}              ║
║   Vault:  ${VAULT_ROOT}
╚═══════════════════════════════════════════════╝
  `);
});
