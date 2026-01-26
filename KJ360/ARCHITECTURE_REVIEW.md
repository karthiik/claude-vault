# KJ360 Architecture Review & Optimization Plan

**Review Date:** January 24, 2026
**Reviewer:** Claude (Software Architect)
**Codebase Version:** 2.0 (Skill-Based Architecture)

---

## Executive Summary

KJ360 is a well-architected personal productivity system with a clean separation between frontend (React/Vite) and backend (Express). The recent transition to a skill-based architecture is a significant improvement. However, there are several optimization opportunities across performance, code organization, error handling, and Anthropic best practices for Claude Code integration.

**Overall Grade: B+**

| Category | Score | Notes |
|----------|-------|-------|
| Architecture | A- | Clean skill-based model, good separation of concerns |
| Performance | B | Cache-first approach is good, but several inefficiencies |
| Error Handling | C+ | Basic try/catch, lacks structured error codes |
| Code Organization | B+ | Well-structured, some duplication |
| Testing | F | No tests present |
| TypeScript | F | Pure JavaScript, no type safety |
| Claude Code Integration | B | Works, but not following all best practices |

---

## 1. Critical Issues (Fix Immediately)

### 1.1 Prompt Truncation in Skill Invocation

**File:** `server/routes/skill.js:116`

```javascript
// PROBLEM: Arbitrary truncation loses context
await fs.writeFile(tmpFile, skillContent.substring(0, 6000), 'utf-8');
```

**Issue:** The 6000 character limit arbitrarily truncates skill prompts, potentially cutting off critical instructions or context data. This can cause incomplete or incorrect brief generation.

**Recommendation:**
```javascript
// Let Claude handle context management - it has 200k context window
// Only truncate individual command outputs, not the final prompt
const MAX_COMMAND_OUTPUT = 4000; // Per-command limit

// In the command injection loop:
.then(({ stdout }) => ({
  fullMatch,
  result: stdout.trim().substring(0, MAX_COMMAND_OUTPUT)
}))

// Don't truncate final prompt - let Claude manage it
await fs.writeFile(tmpFile, skillContent, 'utf-8');
```

### 1.2 No Request Deduplication

**Files:** `Dashboard.jsx`, `Now.jsx`

Both views call `/api/skill/status` independently when mounted. If user rapidly switches between views, this creates redundant API calls.

**Recommendation:** Implement a simple request cache or use React Query/SWR:

```javascript
// Simple in-memory deduplication (add to a shared module)
const pendingRequests = new Map();

export async function fetchWithDedup(url, options = {}) {
  const key = `${options.method || 'GET'}:${url}`;

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetch(url, options)
    .then(res => res.json())
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, promise);
  return promise;
}
```

### 1.3 Memory Leak in Cache Objects

**File:** `server/routes/tasks.js`

Global cache objects (`things3Cache`, `things3UpcomingCache`, `vaultScanCache`) never get garbage collected and grow unbounded over time.

**Recommendation:** Add cache size limits and cleanup:

```javascript
const MAX_CACHE_SIZE = 100; // Max cached items
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function cleanupCache(cache) {
  const now = Date.now();
  if (cache.timestamp && now - cache.timestamp > CACHE_TTL) {
    cache.tasks = [];
    cache.data = null;
    cache.isStale = true;
  }
}

// Call periodically
setInterval(() => {
  cleanupCache(things3Cache);
  cleanupCache(things3UpcomingCache);
  cleanupCache(vaultScanCache);
}, 5 * 60 * 1000); // Every 5 minutes
```

---

## 2. Performance Optimizations

### 2.1 Frontend Bundle Optimization

**Current State:** All views loaded eagerly on initial bundle.

**Recommendation:** Implement code splitting with React.lazy:

```javascript
// App.jsx
import { Suspense, lazy } from 'react';

// Lazy load views
const DashboardView = lazy(() => import('./views/Dashboard'));
const NowView = lazy(() => import('./views/Now'));
const SettingsView = lazy(() => import('./views/Settings'));

// In Routes:
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/" element={<DashboardView />} />
    <Route path="/now" element={<NowView />} />
    <Route path="/settings" element={<SettingsView />} />
  </Routes>
</Suspense>
```

**Impact:** ~30-40% reduction in initial bundle size.

### 2.2 Memoize MarkdownRenderer

**File:** `components/MarkdownRenderer.jsx`

The `parseMarkdown` function runs on every render, even when content hasn't changed.

**Recommendation:**
```javascript
import { useMemo } from 'react';

export default function MarkdownRenderer({ content, className = '' }) {
  const html = useMemo(() => {
    if (!content) return '';
    return parseMarkdown(content);
  }, [content]);

  if (!html) return null;

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### 2.3 Memoize Dashboard Widgets

**File:** `views/Dashboard.jsx`

All 10 widgets re-render when any state changes.

**Recommendation:** Wrap widgets with `React.memo`:

```javascript
const StatusBriefWidget = React.memo(function StatusBriefWidget({
  brief, loading, onRefresh, onNavigate, briefHistory
}) {
  // ... existing implementation
});

const FocusRecommendationsWidget = React.memo(function FocusRecommendationsWidget({
  thingsData
}) {
  // ... existing implementation
});

// Apply to all widgets
```

### 2.4 Parallel Command Execution Optimization

**File:** `server/routes/skill.js`

Commands are executed in parallel but with sequential replacement.

**Recommendation:** Use a more efficient replacement strategy:

```javascript
// Current: O(n) replacements
for (const { fullMatch, result } of results) {
  skillContent = skillContent.replace(fullMatch, result);
}

// Better: Single pass replacement
const replacements = new Map(results.map(r => [r.fullMatch, r.result]));
skillContent = skillContent.replace(
  commandPattern,
  match => replacements.get(match) || match
);
```

### 2.5 Batch osascript Calls

**File:** `server/routes/tasks.js`

Multiple separate osascript calls for Things 3 operations.

**Recommendation:** Combine into single AppleScript when possible:

```javascript
// Instead of separate calls for today, projects, areas:
const { stdout } = await execAsync(`osascript -e '
  tell application "Things3"
    set output to "{"

    -- Today tasks
    set output to output & "\\"today\\": ["
    -- ... tasks ...
    set output to output & "],"

    -- Projects
    set output to output & "\\"projects\\": ["
    -- ... projects ...
    set output to output & "]"

    set output to output & "}"
    return output
  end tell
'`);

const data = JSON.parse(stdout);
// Now have both today tasks and projects in one call
```

---

## 3. Claude Code Best Practices

### 3.1 Skill File Structure

**Current Skills:** Good structure, but missing some metadata.

**Recommendation:** Add more metadata for better skill management:

```markdown
---
name: morning-brief
description: Generate tactical morning brief with calendar, tasks, and focus recommendations
version: 1.0.0
author: KJ360
allowed-tools: Read, Bash, Glob, Grep
timeout: 90000
cache-ttl: 14400000  # 4 hours in ms
output-format: markdown
tags: [brief, daily, productivity]
---
```

### 3.2 Command Injection Security

**File:** `server/routes/skill.js`

The `!`command`` injection pattern executes arbitrary shell commands.

**Recommendation:** Whitelist allowed commands:

```javascript
const ALLOWED_COMMANDS = [
  /^osascript\s/,
  /^icalBuddy\s/,
  /^head\s/,
  /^tail\s/,
  /^cat\s/,
  /^ls\s/,
  /^grep\s/,
];

function isCommandAllowed(cmd) {
  return ALLOWED_COMMANDS.some(pattern => pattern.test(cmd.trim()));
}

// In the command execution loop:
if (!isCommandAllowed(cmd)) {
  return { fullMatch, result: '[Command not allowed]' };
}
```

### 3.3 Structured Skill Output

**Recommendation:** Have skills return structured JSON for better parsing:

```markdown
# In SKILL.md:
Output your response as JSON with this structure:
{
  "summary": "One sentence overview",
  "theOneThing": "Most important focus",
  "sections": [
    { "title": "Section Name", "content": "..." }
  ],
  "metadata": {
    "taskCount": 5,
    "calendarEvents": 3,
    "generatedAt": "ISO timestamp"
  }
}
```

---

## 4. Error Handling Improvements

### 4.1 Implement Error Codes

**Recommendation:** Create structured error responses:

```javascript
// server/lib/errors.js
export class AppError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

export const ErrorCodes = {
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  SKILL_TIMEOUT: 'SKILL_TIMEOUT',
  THINGS3_UNAVAILABLE: 'THINGS3_UNAVAILABLE',
  CALENDAR_UNAVAILABLE: 'CALENDAR_UNAVAILABLE',
  VAULT_READ_ERROR: 'VAULT_READ_ERROR',
  CACHE_MISS: 'CACHE_MISS',
};
```

### 4.2 Add Retry Logic

```javascript
// server/lib/retry.js
export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, delay = 1000, backoff = 2 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, delay * Math.pow(backoff, attempt - 1)));
    }
  }
}

// Usage:
const result = await withRetry(
  () => execAsync(osascriptCommand),
  { maxRetries: 3, delay: 500 }
);
```

### 4.3 Frontend Error Boundaries

```javascript
// components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Widget error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">Something went wrong</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-sm text-gray-400 hover:text-white mt-2"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrap each widget:
<ErrorBoundary>
  <StatusBriefWidget {...props} />
</ErrorBoundary>
```

---

## 5. Code Organization

### 5.1 Extract Shared Utilities

**Create:** `app/src/lib/api.js`

```javascript
const API_BASE = '/api';

export const api = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async post(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  // Skill-specific helpers
  skill: {
    invoke: (name, args) => api.post(`/skill/invoke/${name}`, { args }),
    status: () => api.get('/skill/status'),
    latestBrief: () => api.get('/skill/brief/latest'),
    refresh: (type) => api.post(`/skill/refresh/${type}`),
  },

  tasks: {
    upcoming: (refresh = false) => api.get(`/tasks/things-upcoming${refresh ? '?refresh=true' : ''}`),
    complete: (data) => api.post('/tasks/complete-things', data),
  }
};
```

### 5.2 Create Custom Hooks

**Create:** `app/src/hooks/useSkillStatus.js`

```javascript
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export function useSkillStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.skill.status();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, error, refresh };
}
```

### 5.3 Consolidate Cache Logic

**Create:** `server/lib/cache.js`

```javascript
export class Cache {
  constructor(options = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes
    this.data = null;
    this.timestamp = null;
    this.isStale = true;
  }

  isValid() {
    if (this.isStale || !this.timestamp) return false;
    return Date.now() - this.timestamp < this.ttl;
  }

  get() {
    return this.data;
  }

  set(data) {
    this.data = data;
    this.timestamp = Date.now();
    this.isStale = false;
  }

  invalidate() {
    this.isStale = true;
  }

  getAge() {
    return this.timestamp ? Date.now() - this.timestamp : null;
  }
}

// Usage:
const things3Cache = new Cache({ ttl: 5 * 60 * 1000 });
const calendarCache = new Cache({ ttl: 15 * 60 * 1000 });
```

---

## 6. Testing Strategy

### 6.1 Add Vitest for Unit Tests

```bash
cd app && npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Create:** `app/vitest.config.js`
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
```

### 6.2 Example Component Test

**Create:** `app/src/components/__tests__/MarkdownRenderer.test.jsx`

```javascript
import { render, screen } from '@testing-library/react';
import MarkdownRenderer from '../MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders headers correctly', () => {
    render(<MarkdownRenderer content="# Hello World" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Hello World');
  });

  it('renders bold text', () => {
    render(<MarkdownRenderer content="**bold text**" />);
    expect(screen.getByText('bold text')).toHaveClass('font-semibold');
  });

  it('handles null content', () => {
    const { container } = render(<MarkdownRenderer content={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

### 6.3 API Route Tests

```bash
cd server && npm install -D vitest supertest
```

**Create:** `server/routes/__tests__/skill.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('Skill API', () => {
  it('GET /api/skill/list returns skills array', async () => {
    const res = await request(app).get('/api/skill/list');
    expect(res.status).toBe(200);
    expect(res.body.skills).toBeInstanceOf(Array);
  });

  it('GET /api/skill/status returns cache status', async () => {
    const res = await request(app).get('/api/skill/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tasks');
    expect(res.body).toHaveProperty('calendar');
  });

  it('POST /api/skill/invoke/unknown returns 404', async () => {
    const res = await request(app)
      .post('/api/skill/invoke/nonexistent')
      .send({});
    expect(res.status).toBe(404);
  });
});
```

---

## 7. TypeScript Migration Path

### Phase 1: Add TypeScript Support

```bash
cd app && npm install -D typescript @types/node
cd server && npm install -D typescript @types/express @types/node ts-node
```

### Phase 2: Create Type Definitions

**Create:** `app/src/types/index.ts`

```typescript
export interface Task {
  id: string;
  text: string;
  deadline: string | null;
  tags: string[];
  projectName: string;
  areaName: string;
  isOverdue?: boolean;
  source: 'things3' | 'vault';
}

export interface DayGroup {
  date: string;
  dayName: string;
  dayShort: string;
  monthDay: string;
  isToday: boolean;
  isTomorrow: boolean;
  tasks: Task[];
}

export interface ThingsData {
  days: DayGroup[];
  totalTasks: number;
  fetchedAt: string;
  fromCache?: boolean;
}

export interface Brief {
  content: string;
  generatedAt: string;
  type: 'weekday' | 'weekend';
  skill: string;
}

export interface SkillStatus {
  tasks: { tasks: Task[]; generatedAt: string } | null;
  calendar: { events: CalendarEvent[]; generatedAt: string } | null;
  lastBrief: string | null;
}
```

### Phase 3: Gradual Migration

1. Rename `.jsx` → `.tsx` one file at a time
2. Start with leaf components (MarkdownRenderer, AreaBadge)
3. Move up to views and App.jsx
4. Add strict mode after all files converted

---

## 8. Monitoring & Logging

### 8.1 Add Structured Logging

```bash
cd server && npm install pino pino-pretty
```

**Create:** `server/lib/logger.js`

```javascript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    }
  }
});

// Usage:
logger.info({ skill: 'morning-brief', duration: 1234 }, 'Skill invoked');
logger.error({ error: err.message, stack: err.stack }, 'Skill failed');
```

### 8.2 Add Performance Metrics

```javascript
// server/middleware/metrics.js
const metrics = {
  requests: 0,
  errors: 0,
  skillInvocations: {},
  cacheHits: 0,
  cacheMisses: 0,
  avgResponseTime: 0,
};

export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  metrics.requests++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.avgResponseTime = (metrics.avgResponseTime + duration) / 2;

    if (res.statusCode >= 400) {
      metrics.errors++;
    }
  });

  next();
}

export function getMetrics() {
  return { ...metrics, uptime: process.uptime() };
}

// Add endpoint:
router.get('/api/metrics', (req, res) => {
  res.json(getMetrics());
});
```

---

## 9. Implementation Priority

### Immediate (This Week)
1. ✅ Fix prompt truncation in skill.js
2. ✅ Add React.memo to Dashboard widgets
3. ✅ Memoize MarkdownRenderer
4. Add request deduplication

### Short-term (Next 2 Weeks)
5. Implement error boundaries
6. Add structured logging
7. Create shared API utilities
8. Add basic unit tests for critical paths

### Medium-term (Next Month)
9. Implement code splitting
10. Begin TypeScript migration
11. Add E2E tests with Playwright
12. Implement performance metrics

### Long-term (Next Quarter)
13. Complete TypeScript migration
14. Add comprehensive test coverage (>80%)
15. Implement file watchers for real-time updates
16. Add Redis for distributed caching (if scaling needed)

---

## 10. Appendix: File-by-File Recommendations

| File | Priority | Recommendation |
|------|----------|----------------|
| `server/routes/skill.js` | HIGH | Remove 6000 char truncation, add command whitelist |
| `app/src/views/Dashboard.jsx` | HIGH | Memoize widgets, extract hooks |
| `app/src/views/Now.jsx` | MEDIUM | Dedup API calls, add error handling |
| `app/src/components/MarkdownRenderer.jsx` | MEDIUM | Add useMemo |
| `server/routes/tasks.js` | MEDIUM | Consolidate cache logic, add cleanup |
| `app/src/App.jsx` | LOW | Add code splitting, error boundary |
| `server/server.js` | LOW | Add metrics middleware, structured logging |

---

*This review follows Anthropic's Claude Code best practices and focuses on performance, maintainability, and security.*
