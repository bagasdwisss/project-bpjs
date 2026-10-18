// server/utils/cache.js - Smart In-Memory Cache-Aside Pattern for BPJSTK Regulation & Settings
class SmartCache {
  constructor() {
    this.store = new Map();
    // Default TTL: 5 minutes (300,000 ms)
    this.defaultTTL = 5 * 60 * 1000;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.store.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  del(key) {
    this.store.delete(key);
  }

  // Delete all keys matching a prefix or wildcard
  delPattern(pattern) {
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern) || key.includes(pattern)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }

  /**
   * Cache-Aside Wrapper:
   * Retrieves data from cache; if miss, executes fetchFn, stores result, and returns.
   */
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await fetchFn();
    if (fresh !== undefined && fresh !== null) {
      this.set(key, fresh, ttl);
    }
    return fresh;
  }
}

export const cache = new SmartCache();
export default cache;
