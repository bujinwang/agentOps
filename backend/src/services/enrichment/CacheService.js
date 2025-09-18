const redis = require('../../config/redis');

class CacheService {
  constructor() {
    this.redis = redis;
    this.defaultTTL = 3600; // 1 hour default
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<Object|null>} Cached data or null
   */
  async get(key) {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data);

      // Check if data has expired
      if (parsed.expiresAt && new Date() > new Date(parsed.expiresAt)) {
        await this.delete(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, data, ttl = this.defaultTTL) {
    try {
      const cacheData = {
        data,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + ttl * 1000),
      };

      await this.redis.setex(key, ttl, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Existence status
   */
  async exists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    try {
      const info = await this.redis.info();
      const lines = info.split('\n');
      const stats = {};

      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key] = value;
        }
      });

      return {
        connected_clients: stats.connected_clients,
        used_memory: stats.used_memory,
        total_connections_received: stats.total_connections_received,
        keyspace_hits: stats.keyspace_hits,
        keyspace_misses: stats.keyspace_misses,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {};
    }
  }

  /**
   * Clear all enrichment-related cache
   * @returns {Promise<number>} Number of keys deleted
   */
  async clearEnrichmentCache() {
    try {
      const keys = await this.redis.keys('enrichment:*');
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Clear enrichment cache error:', error);
      return 0;
    }
  }

  /**
   * Set multiple cache entries
   * @param {Object} entries - Key-value pairs to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async mset(entries, ttl = this.defaultTTL) {
    try {
      const pipeline = this.redis.multi();

      Object.entries(entries).forEach(([key, data]) => {
        const cacheData = {
          data,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + ttl * 1000),
        };
        pipeline.setex(key, ttl, JSON.stringify(cacheData));
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get multiple cache entries
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} Key-value pairs of cached data
   */
  async mget(keys) {
    try {
      const values = await this.redis.mget(keys);
      const result = {};

      keys.forEach((key, index) => {
        const value = values[index];
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (!parsed.expiresAt || new Date() <= new Date(parsed.expiresAt)) {
              result[key] = parsed.data;
            }
          } catch (error) {
            // Invalid JSON, skip this key
          }
        }
      });

      return result;
    } catch (error) {
      console.error('Cache mget error:', error);
      return {};
    }
  }

  /**
   * Set cache with custom expiration
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @param {Date} expiresAt - Specific expiration date
   * @returns {Promise<boolean>} Success status
   */
  async setWithExpiration(key, data, expiresAt) {
    try {
      const ttl = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

      const cacheData = {
        data,
        createdAt: new Date(),
        expiresAt,
      };

      await this.redis.setex(key, ttl, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('Cache setWithExpiration error:', error);
      return false;
    }
  }

  /**
   * Get cache TTL (time to live)
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds, -2 if key doesn't exist, -1 if no expiration
   */
  async getTTL(key) {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error('Cache getTTL error:', error);
      return -2;
    }
  }

  /**
   * Extend cache TTL
   * @param {string} key - Cache key
   * @param {number} ttl - New TTL in seconds
   * @returns {Promise<boolean>} Success status
   */
  async extendTTL(key, ttl) {
    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error('Cache extendTTL error:', error);
      return false;
    }
  }

  /**
   * Get all enrichment cache keys
   * @returns {Promise<string[]>} Array of cache keys
   */
  async getEnrichmentKeys() {
    try {
      return await this.redis.keys('enrichment:*');
    } catch (error) {
      console.error('Cache getEnrichmentKeys error:', error);
      return [];
    }
  }

  /**
   * Warm up cache with frequently accessed data
   * @param {Object} data - Data to warm cache with
   * @returns {Promise<boolean>} Success status
   */
  async warmCache(data) {
    try {
      const entries = {};

      // Create cache entries for different data types
      if (data.leads) {
        data.leads.forEach(lead => {
          entries[`enrichment:${lead.id}`] = lead.enrichmentData;
        });
      }

      if (data.property) {
        Object.entries(data.property).forEach(([key, value]) => {
          entries[`property:${key}`] = value;
        });
      }

      if (data.social) {
        Object.entries(data.social).forEach(([key, value]) => {
          entries[`social:${key}`] = value;
        });
      }

      await this.mset(entries, this.defaultTTL);
      return true;
    } catch (error) {
      console.error('Cache warm up error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();