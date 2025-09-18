/**
 * Advanced Caching Service
 * Multi-layer caching with Redis and in-memory fallback
 */

const { logger } = require('../config/logger');

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 300,        // 5 minutes default
  maxMemoryItems: 1000,   // Max items in memory cache
  compressionThreshold: 1024, // Compress items larger than 1KB
  redisPrefix: 'cache:',
  layers: {
    memory: true,         // In-memory cache
    redis: true,          // Redis cache
    database: false       // Future: Database cache
  }
};

// In-memory cache storage
const memoryCache = new Map();

// Cache statistics
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  memoryItems: 0,
  redisItems: 0
};

// Cache entry structure
class CacheEntry {
  constructor(value, ttl = CACHE_CONFIG.defaultTTL) {
    this.value = value;
    this.timestamp = Date.now();
    this.ttl = ttl;
    this.expiresAt = this.timestamp + (ttl * 1000);
    this.accessCount = 0;
    this.lastAccessed = this.timestamp;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  touch() {
    this.accessCount++;
    this.lastAccessed = Date.now();
  }

  getAge() {
    return Date.now() - this.timestamp;
  }

  getTimeToLive() {
    return Math.max(0, this.expiresAt - Date.now());
  }
}

// Redis client (lazy loaded)
let redisClient = null;

const getRedisClient = () => {
  if (!redisClient && CACHE_CONFIG.layers.redis) {
    try {
      const redis = require('../config/redis');
      redisClient = redis.getRedisClient();
    } catch (error) {
      logger.warn('Redis not available for caching:', error.message);
      CACHE_CONFIG.layers.redis = false;
    }
  }
  return redisClient;
};

// Memory cache operations
const memoryCacheOps = {
  get: (key) => {
    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (entry.isExpired()) {
      memoryCache.delete(key);
      cacheStats.memoryItems = Math.max(0, cacheStats.memoryItems - 1);
      return null;
    }

    entry.touch();
    return entry.value;
  },

  set: (key, value, ttl = CACHE_CONFIG.defaultTTL) => {
    // Clean up expired entries if cache is full
    if (memoryCache.size >= CACHE_CONFIG.maxMemoryItems) {
      memoryCacheOps.cleanup();
    }

    // Remove existing entry if it exists
    if (memoryCache.has(key)) {
      cacheStats.memoryItems = Math.max(0, cacheStats.memoryItems - 1);
    }

    const entry = new CacheEntry(value, ttl);
    memoryCache.set(key, entry);
    cacheStats.memoryItems++;
    cacheStats.sets++;
  },

  delete: (key) => {
    if (memoryCache.delete(key)) {
      cacheStats.memoryItems = Math.max(0, cacheStats.memoryItems - 1);
      cacheStats.deletes++;
      return true;
    }
    return false;
  },

  clear: () => {
    const size = memoryCache.size;
    memoryCache.clear();
    cacheStats.memoryItems = 0;
    cacheStats.deletes += size;
  },

  cleanup: () => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of memoryCache.entries()) {
      if (entry.isExpired()) {
        memoryCache.delete(key);
        cleaned++;
      }
    }

    cacheStats.memoryItems = Math.max(0, cacheStats.memoryItems - cleaned);
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  },

  stats: () => ({
    items: cacheStats.memoryItems,
    size: memoryCache.size,
    hitRate: cacheStats.hits + cacheStats.misses > 0
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)
      : 0
  })
};

// Redis cache operations
const redisCacheOps = {
  get: async (key) => {
    const client = getRedisClient();
    if (!client) return null;

    try {
      const redisKey = CACHE_CONFIG.redisPrefix + key;
      const value = await client.get(redisKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis cache get error:', error);
      cacheStats.errors++;
      return null;
    }
  },

  set: async (key, value, ttl = CACHE_CONFIG.defaultTTL) => {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const redisKey = CACHE_CONFIG.redisPrefix + key;
      const serializedValue = JSON.stringify(value);
      await client.setex(redisKey, ttl, serializedValue);
      cacheStats.sets++;
      return true;
    } catch (error) {
      logger.error('Redis cache set error:', error);
      cacheStats.errors++;
      return false;
    }
  },

  delete: async (key) => {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const redisKey = CACHE_CONFIG.redisPrefix + key;
      const result = await client.del(redisKey);
      if (result > 0) {
        cacheStats.deletes++;
      }
      return result > 0;
    } catch (error) {
      logger.error('Redis cache delete error:', error);
      cacheStats.errors++;
      return false;
    }
  },

  clear: async () => {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const pattern = CACHE_CONFIG.redisPrefix + '*';
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
        cacheStats.deletes += keys.length;
      }
      return true;
    } catch (error) {
      logger.error('Redis cache clear error:', error);
      cacheStats.errors++;
      return false;
    }
  }
};

// Main cache service
class CacheService {
  constructor() {
    // Start cleanup interval for memory cache
    setInterval(() => {
      memoryCacheOps.cleanup();
    }, 60000); // Clean up every minute
  }

  // Get value from cache
  async get(key, options = {}) {
    const { skipMemory = false, skipRedis = false } = options;

    // Try memory cache first (if enabled)
    if (CACHE_CONFIG.layers.memory && !skipMemory) {
      const value = memoryCacheOps.get(key);
      if (value !== null) {
        cacheStats.hits++;
        return value;
      }
    }

    // Try Redis cache (if enabled)
    if (CACHE_CONFIG.layers.redis && !skipRedis) {
      const value = await redisCacheOps.get(key);
      if (value !== null) {
        cacheStats.hits++;
        // Also store in memory cache for faster future access
        if (CACHE_CONFIG.layers.memory && !skipMemory) {
          memoryCacheOps.set(key, value, options.ttl);
        }
        return value;
      }
    }

    cacheStats.misses++;
    return null;
  }

  // Set value in cache
  async set(key, value, options = {}) {
    const { ttl = CACHE_CONFIG.defaultTTL, skipMemory = false, skipRedis = false } = options;

    // Store in memory cache (if enabled)
    if (CACHE_CONFIG.layers.memory && !skipMemory) {
      memoryCacheOps.set(key, value, ttl);
    }

    // Store in Redis cache (if enabled)
    if (CACHE_CONFIG.layers.redis && !skipRedis) {
      await redisCacheOps.set(key, value, ttl);
    }
  }

  // Delete value from cache
  async delete(key) {
    let deleted = false;

    // Delete from memory cache
    if (CACHE_CONFIG.layers.memory) {
      deleted = memoryCacheOps.delete(key) || deleted;
    }

    // Delete from Redis cache
    if (CACHE_CONFIG.layers.redis) {
      deleted = await redisCacheOps.delete(key) || deleted;
    }

    return deleted;
  }

  // Clear all cache
  async clear() {
    // Clear memory cache
    if (CACHE_CONFIG.layers.memory) {
      memoryCacheOps.clear();
    }

    // Clear Redis cache
    if (CACHE_CONFIG.layers.redis) {
      await redisCacheOps.clear();
    }
  }

  // Get or set (cache-aside pattern)
  async getOrSet(key, valueFn, options = {}) {
    let value = await this.get(key, options);

    if (value === null) {
      try {
        value = await valueFn();
        if (value !== null && value !== undefined) {
          await this.set(key, value, options);
        }
      } catch (error) {
        logger.error('Error in cache getOrSet:', error);
        cacheStats.errors++;
      }
    }

    return value;
  }

  // Get cache statistics
  getStats() {
    const memoryStats = CACHE_CONFIG.layers.memory ? memoryCacheOps.stats() : null;
    const redisStats = CACHE_CONFIG.layers.redis ? { available: true } : { available: false };

    return {
      overall: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        sets: cacheStats.sets,
        deletes: cacheStats.deletes,
        errors: cacheStats.errors,
        hitRate: cacheStats.hits + cacheStats.misses > 0
          ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)
          : 0
      },
      memory: memoryStats,
      redis: redisStats,
      config: CACHE_CONFIG
    };
  }

  // Health check
  async healthCheck() {
    const health = {
      memory: CACHE_CONFIG.layers.memory,
      redis: false,
      overall: false
    };

    // Check Redis connectivity
    if (CACHE_CONFIG.layers.redis) {
      try {
        const client = getRedisClient();
        if (client) {
          await client.ping();
          health.redis = true;
        }
      } catch (error) {
        logger.warn('Redis health check failed:', error.message);
      }
    }

    health.overall = health.memory || health.redis;
    return health;
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Cache middleware for Express routes
const cacheMiddleware = (options = {}) => {
  const {
    ttl = CACHE_CONFIG.defaultTTL,
    keyFn = (req) => `${req.method}:${req.originalUrl}`,
    condition = () => true
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests or if condition fails
    if (req.method !== 'GET' || !condition(req)) {
      return next();
    }

    const cacheKey = keyFn(req);

    try {
      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug('Cache hit for:', cacheKey);
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = function(data) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, { ttl }).catch(error => {
            logger.error('Cache middleware error:', error);
          });
        }

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Cache invalidation helpers
const cacheInvalidation = {
  // Invalidate user-specific cache
  invalidateUserCache: async (userId) => {
    const patterns = [
      `user:${userId}:*`,
      `leads:user:${userId}:*`,
      `tasks:user:${userId}:*`
    ];

    for (const pattern of patterns) {
      // In a real implementation, you'd use Redis SCAN or KEYS
      // For now, we'll clear broader patterns
      await cacheService.clear();
    }
  },

  // Invalidate lead-specific cache
  invalidateLeadCache: async (leadId) => {
    const patterns = [
      `lead:${leadId}`,
      `lead:${leadId}:*`,
      `leads:*:${leadId}`
    ];

    // Clear cache (simplified implementation)
    await cacheService.clear();
  },

  // Invalidate all cache for a resource type
  invalidateResourceCache: async (resourceType) => {
    // Clear cache (simplified implementation)
    await cacheService.clear();
  }
};

module.exports = {
  CacheService,
  cacheService,
  cacheMiddleware,
  cacheInvalidation,
  CACHE_CONFIG
};