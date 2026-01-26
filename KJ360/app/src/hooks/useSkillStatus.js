import { useState, useEffect, useCallback, useRef } from 'react';
import { api, formatCachedTasksForDisplay } from '../lib/api';

/**
 * useSkillStatus Hook
 *
 * Fetches and manages skill status (cached tasks, calendar, brief).
 * Features:
 * - Request deduplication (prevents duplicate concurrent requests)
 * - Cache-first loading pattern
 * - Background refresh
 * - Shared state across components (via module-level cache)
 */

// Module-level cache for sharing across components
let statusCache = {
  data: null,
  timestamp: null,
  promise: null // For request deduplication
};

const CACHE_TTL = 30 * 1000; // 30 seconds

export function useSkillStatus(options = {}) {
  const { autoRefresh = true, refreshInterval = 60000 } = options;

  const [status, setStatus] = useState(statusCache.data);
  const [loading, setLoading] = useState(!statusCache.data);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  /**
   * Fetch status with deduplication
   */
  const fetchStatus = useCallback(async (force = false) => {
    // Check if we have valid cached data
    const now = Date.now();
    if (!force && statusCache.data && statusCache.timestamp &&
        now - statusCache.timestamp < CACHE_TTL) {
      setStatus(statusCache.data);
      setLoading(false);
      return statusCache.data;
    }

    // If there's already a request in flight, wait for it
    if (statusCache.promise) {
      try {
        const result = await statusCache.promise;
        setStatus(result);
        setLoading(false);
        return result;
      } catch (err) {
        // Fall through to make a new request
      }
    }

    setLoading(true);
    setError(null);

    // Create new request promise
    statusCache.promise = api.skill.status()
      .then(data => {
        statusCache.data = data;
        statusCache.timestamp = Date.now();
        statusCache.promise = null;
        return data;
      })
      .catch(err => {
        statusCache.promise = null;
        throw err;
      });

    try {
      const result = await statusCache.promise;
      setStatus(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Force refresh (bypass cache)
   */
  const refresh = useCallback(() => fetchStatus(true), [fetchStatus]);

  /**
   * Invalidate cache (next fetch will be fresh)
   */
  const invalidate = useCallback(() => {
    statusCache.data = null;
    statusCache.timestamp = null;
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchStatus(true);
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchStatus]);

  // Derived values
  const tasks = status?.tasks?.tasks || [];
  const calendar = status?.calendar;
  const lastBrief = status?.lastBrief;

  return {
    // Raw status
    status,

    // Loading/error states
    loading,
    error,

    // Actions
    refresh,
    invalidate,

    // Convenience getters
    tasks,
    calendar,
    lastBrief,

    // Formatted for Things3 display
    thingsData: status?.tasks ? formatCachedTasksForDisplay(status.tasks) : null,

    // Timestamps
    lastFetched: statusCache.timestamp,
    cacheAge: statusCache.timestamp ? Date.now() - statusCache.timestamp : null
  };
}

/**
 * useThingsData Hook
 *
 * Fetches Things 3 upcoming tasks with cache-first pattern.
 * Uses shared cache to prevent duplicate requests across views.
 */

let thingsCache = {
  data: null,
  timestamp: null,
  promise: null
};

const THINGS_CACHE_TTL = 60 * 1000; // 1 minute

export function useThingsData(options = {}) {
  const { autoRefresh = false } = options;

  const [data, setData] = useState(thingsCache.data);
  const [loading, setLoading] = useState(!thingsCache.data);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();

    // Check cache
    if (!force && thingsCache.data && thingsCache.timestamp &&
        now - thingsCache.timestamp < THINGS_CACHE_TTL) {
      setData(thingsCache.data);
      setLoading(false);
      return thingsCache.data;
    }

    // Deduplicate in-flight requests
    if (thingsCache.promise) {
      try {
        const result = await thingsCache.promise;
        setData(result);
        setLoading(false);
        return result;
      } catch {
        // Fall through
      }
    }

    setLoading(true);

    thingsCache.promise = api.tasks.upcoming(force)
      .then(result => {
        thingsCache.data = result;
        thingsCache.timestamp = Date.now();
        thingsCache.promise = null;
        return result;
      })
      .catch(err => {
        thingsCache.promise = null;
        throw err;
      });

    try {
      const result = await thingsCache.promise;
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    days: data?.days || [],
    totalTasks: data?.totalTasks || 0,
    fromCache: data?.fromCache || false
  };
}

/**
 * useCalendarData Hook
 */

let calendarCache = {
  today: null,
  tomorrow: null,
  blocks: null,
  timestamp: null,
  promise: null
};

const CALENDAR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useCalendarData() {
  const [data, setData] = useState({
    today: calendarCache.today,
    tomorrow: calendarCache.tomorrow,
    blocks: calendarCache.blocks
  });
  const [loading, setLoading] = useState(!calendarCache.today);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();

    if (!force && calendarCache.today && calendarCache.timestamp &&
        now - calendarCache.timestamp < CALENDAR_CACHE_TTL) {
      setData({
        today: calendarCache.today,
        tomorrow: calendarCache.tomorrow,
        blocks: calendarCache.blocks
      });
      setLoading(false);
      return;
    }

    if (calendarCache.promise) {
      await calendarCache.promise;
      setData({
        today: calendarCache.today,
        tomorrow: calendarCache.tomorrow,
        blocks: calendarCache.blocks
      });
      setLoading(false);
      return;
    }

    setLoading(true);

    calendarCache.promise = Promise.all([
      api.calendar.today(),
      api.calendar.tomorrow(),
      api.calendar.availableBlocks()
    ]).then(([today, tomorrow, blocks]) => {
      calendarCache.today = today;
      calendarCache.tomorrow = tomorrow;
      calendarCache.blocks = blocks.blocks || [];
      calendarCache.timestamp = Date.now();
      calendarCache.promise = null;
      return { today, tomorrow, blocks: blocks.blocks };
    }).catch(err => {
      calendarCache.promise = null;
      throw err;
    });

    try {
      const result = await calendarCache.promise;
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    loading,
    error,
    refresh
  };
}

export default useSkillStatus;
