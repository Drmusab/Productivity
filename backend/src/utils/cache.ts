/**
 * @fileoverview Simple in-memory cache utility for frequently accessed data.
 * Implements TTL (time-to-live) based caching with automatic cleanup.
 * @module utils/cache
 */

interface CacheItem {
  value: any;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL support
 */
class Cache {
  private store: Map<string, CacheItem>;
  private timers: Map<string, NodeJS.Timeout>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) { // Default: 5 minutes
    this.store = new Map();
    this.timers = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Store a value in cache with optional TTL
   */
  set(key: string, value: any, ttl: number | null = null): void {
    const timeToLive = ttl !== null ? ttl : this.defaultTTL;
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // Store the value
    this.store.set(key, {
      value,
      expiresAt: Date.now() + timeToLive
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, timeToLive);

    this.timers.set(key, timer);
  }

  /**
   * Retrieve a value from cache
   */
  get(key: string): any {
    const item = this.store.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Check if a key exists in cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.store.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.store.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }

  /**
   * Get or set cache value with a factory function
   * @param {string} key - Cache key
   * @param {Function} factory - Async function to generate value if not cached
   * @param {number} ttl - Time to live in milliseconds (uses default if not specified)
   * @returns {Promise<*>} Cached or generated value
   */
  async getOrSet(key, factory, ttl = null) {
    const cached = this.get(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

// Export singleton instance with configurable default TTL
const defaultTTL = process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 300000;
const cache = new Cache(defaultTTL);

export default cache;
