/**
 * KJ360 API Client
 * Centralized API utilities with request deduplication and error handling
 */

const API_BASE = '/api';

// Request deduplication cache
const pendingRequests = new Map();

/**
 * Fetch with deduplication - prevents duplicate concurrent requests
 */
async function fetchWithDedup(url, options = {}) {
  const method = options.method || 'GET';
  const key = `${method}:${url}`;

  // Return existing promise if request is in-flight
  if (method === 'GET' && pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetch(url, options)
    .then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(error.error || error.message || `API error: ${res.status}`);
      }
      return res.json();
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  if (method === 'GET') {
    pendingRequests.set(key, promise);
  }

  return promise;
}

/**
 * Main API client
 */
export const api = {
  /**
   * GET request
   */
  async get(path) {
    return fetchWithDedup(`${API_BASE}${path}`);
  },

  /**
   * POST request
   */
  async post(path, data = {}) {
    return fetchWithDedup(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Skill-specific endpoints
   */
  skill: {
    list: () => api.get('/skill/list'),
    invoke: (name, args = '') => api.post(`/skill/invoke/${name}`, { args }),
    status: () => api.get('/skill/status'),
    latestBrief: () => api.get('/skill/brief/latest'),
    refreshTasks: () => api.post('/skill/refresh/tasks'),
    refreshCalendar: () => api.post('/skill/refresh/calendar'),
  },

  /**
   * Task-specific endpoints
   */
  tasks: {
    upcoming: (refresh = false) =>
      api.get(`/tasks/things-upcoming${refresh ? '?refresh=true' : ''}`),
    today: () => api.get('/tasks/things-today'),
    projects: () => api.get('/tasks/things-projects'),
    complete: (taskName, uuid) =>
      api.post('/tasks/complete-things', { taskName, uuid }),
    completeVault: (filePath, lineNumber) =>
      api.post('/tasks/complete', { filePath, lineNumber }),
    sendToThings: (task) => api.post('/tasks/send-to-things', task),
    scanVault: () => api.post('/tasks/scan-vault'),
    getVaultCache: () => api.get('/tasks/scan-vault'),
  },

  /**
   * Calendar-specific endpoints
   */
  calendar: {
    today: () => api.get('/calendar/today'),
    tomorrow: () => api.get('/calendar/tomorrow'),
    week: () => api.get('/calendar/week'),
    availableBlocks: () => api.get('/calendar/available-blocks'),
  },

  /**
   * Health check
   */
  health: () => api.get('/health'),
};

/**
 * Utility: Format cached data for Things3 display
 */
export function formatCachedTasksForDisplay(cachedTasks) {
  if (!cachedTasks?.tasks?.length) return null;

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  return {
    days: [{
      date: dateStr,
      label: 'Today',
      dayName: today.toLocaleDateString('en-US', { weekday: 'long' }),
      dayShort: today.toLocaleDateString('en-US', { weekday: 'short' }),
      monthDay: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isToday: true,
      isTomorrow: false,
      tasks: cachedTasks.tasks.map((t, idx) => ({
        id: `cache-${idx}`,
        text: t.title,
        projectName: t.project || '',
        areaName: t.project || '',
        deadline: null,
        isOverdue: false,
        tags: [],
      })),
    }],
    totalTasks: cachedTasks.tasks.length,
    fromCache: true,
    cachedAt: cachedTasks.generatedAt,
  };
}

export default api;
