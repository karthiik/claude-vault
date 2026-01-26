/**
 * Cache Class
 *
 * Centralized caching utility with TTL support, staleness tracking,
 * and automatic cleanup. Replaces scattered cache objects across routes.
 *
 * Features:
 * - Configurable TTL (time-to-live)
 * - Staleness tracking for manual invalidation
 * - Age calculation for cache status
 * - Automatic cleanup of expired entries
 * - JSON serialization helpers
 */

export class Cache {
  /**
   * Create a new cache instance
   * @param {Object} options
   * @param {number} options.ttl - Time-to-live in milliseconds (default: 5 minutes)
   * @param {string} options.name - Cache name for logging
   * @param {number} options.maxSize - Maximum entries (for map-based caches)
   */
  constructor(options = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.name = options.name || 'unnamed';
    this.maxSize = options.maxSize || 100;

    this.data = null;
    this.timestamp = null;
    this.isStale = true;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Check if cache is valid (not stale and within TTL)
   * @param {string} mode - 'realtime' | 'manual' | 'auto' (default)
   * @returns {boolean}
   */
  isValid(mode = 'auto') {
    // Realtime mode never uses cache
    if (mode === 'realtime') return false;

    // Manual mode uses cache until explicitly invalidated
    if (mode === 'manual' && !this.isStale) return true;

    // Auto mode checks TTL
    if (this.isStale || !this.timestamp) return false;
    return Date.now() - this.timestamp < this.ttl;
  }

  /**
   * Get cached data if valid
   * @param {string} mode - Cache mode
   * @returns {any} Cached data or null
   */
  get(mode = 'auto') {
    if (this.isValid(mode)) {
      this.hits++;
      return this.data;
    }
    this.misses++;
    return null;
  }

  /**
   * Set cache data
   * @param {any} data - Data to cache
   * @returns {Cache} this (for chaining)
   */
  set(data) {
    this.data = data;
    this.timestamp = Date.now();
    this.isStale = false;
    return this;
  }

  /**
   * Mark cache as stale (will be refreshed on next access)
   * @returns {Cache} this (for chaining)
   */
  invalidate() {
    this.isStale = true;
    return this;
  }

  /**
   * Clear cache completely
   * @returns {Cache} this (for chaining)
   */
  clear() {
    this.data = null;
    this.timestamp = null;
    this.isStale = true;
    return this;
  }

  /**
   * Get cache age in milliseconds
   * @returns {number|null}
   */
  getAge() {
    return this.timestamp ? Date.now() - this.timestamp : null;
  }

  /**
   * Get cache age in human-readable format
   * @returns {string}
   */
  getAgeString() {
    const age = this.getAge();
    if (!age) return 'never';
    if (age < 1000) return `${age}ms`;
    if (age < 60000) return `${Math.round(age / 1000)}s`;
    if (age < 3600000) return `${Math.round(age / 60000)}m`;
    return `${Math.round(age / 3600000)}h`;
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      name: this.name,
      hasData: this.data !== null,
      isStale: this.isStale,
      age: this.getAge(),
      ageString: this.getAgeString(),
      timestamp: this.timestamp,
      ttl: this.ttl,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? Math.round((this.hits / (this.hits + this.misses)) * 100)
        : 0
    };
  }

  /**
   * Get data with metadata (useful for API responses)
   * @returns {Object}
   */
  getWithMetadata() {
    return {
      data: this.data,
      fromCache: true,
      cacheAge: this.getAge(),
      cacheAgeString: this.getAgeString(),
      cachedAt: this.timestamp ? new Date(this.timestamp).toISOString() : null
    };
  }
}

/**
 * MapCache Class
 *
 * Key-value cache with LRU eviction for storing multiple items.
 * Useful for caching individual items by ID.
 */
export class MapCache {
  constructor(options = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000;
    this.name = options.name || 'map-cache';
    this.maxSize = options.maxSize || 100;
    this.cache = new Map();
  }

  /**
   * Get item by key
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Set item by key
   * @param {string} key
   * @param {any} data
   */
  set(key, data) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Check if key exists and is valid
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete item by key
   * @param {string} key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all items
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }

  /**
   * Cleanup expired entries
   * @returns {number} Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

/**
 * Create a file-backed cache that persists to disk
 */
export class FileCache extends Cache {
  constructor(options = {}) {
    super(options);
    this.filePath = options.filePath;
  }

  /**
   * Load cache from file
   */
  async load() {
    if (!this.filePath) return;

    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.filePath, 'utf-8');
      const { data, timestamp } = JSON.parse(content);

      this.data = data;
      this.timestamp = timestamp;
      this.isStale = false;

      // Check if loaded data is within TTL
      if (Date.now() - timestamp > this.ttl) {
        this.isStale = true;
      }
    } catch {
      // File doesn't exist or is invalid
      this.clear();
    }
  }

  /**
   * Save cache to file
   */
  async save() {
    if (!this.filePath || !this.data) return;

    try {
      const fs = await import('fs/promises');
      const { dirname } = await import('path');

      // Ensure directory exists
      await fs.mkdir(dirname(this.filePath), { recursive: true });

      await fs.writeFile(this.filePath, JSON.stringify({
        data: this.data,
        timestamp: this.timestamp
      }), 'utf-8');
    } catch (err) {
      console.error(`[FileCache] Failed to save ${this.name}:`, err.message);
    }
  }

  /**
   * Set and persist
   */
  async setAndSave(data) {
    this.set(data);
    await this.save();
    return this;
  }
}

export default Cache;
