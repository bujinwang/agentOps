const redis = require('redis');

let client;
let isConnected = false;
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  lastReset: new Date()
};

// Cache configuration
const CACHE_CONFIG = {
  // Default TTL values (in seconds)
  user: 300,        // 5 minutes
  leads: 180,       // 3 minutes
  dashboard: 120,   // 2 minutes
  search: 600,      // 10 minutes
  analytics: 1800,  // 30 minutes
  templates: 3600,  // 1 hour
  metadata: 7200,   // 2 hours

  // Cache key prefixes
  prefixes: {
    user: 'user:',
    leads: 'leads:',
    dashboard: 'dashboard:',
    search: 'search:',
    analytics: 'analytics:',
    templates: 'templates:',
    metadata: 'metadata:',
    session: 'session:'
  },

  // Compression settings
  compression: {
    enabled: true,
    threshold: 1024, // Compress if > 1KB
    algorithm: 'gzip'
  }
};

const connectRedis = async () => {
  try {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB) || 0,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    };

    client = redis.createClient(config);

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      isConnected = false;
    });

    client.on('connect', () => {
      console.log('Redis Client Connected');
      isConnected = true;
    });

    client.on('ready', () => {
      console.log('Redis Client Ready');
      isConnected = true;
    });

    client.on('end', () => {
      console.log('Redis Client Disconnected');
      isConnected = false;
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('Redis connection failed:', error);
    // Don't throw error, allow app to start without Redis
    console.warn('App starting without Redis - caching and job queues will be disabled');
    return null;
  }
};

const getRedisClient = () => {
  return client;
};

const isRedisConnected = () => {
  return isConnected;
};

const closeRedis = async () => {
  if (client) {
    await client.disconnect();
    console.log('Redis connection closed');
  }
};

// Cache helper functions
const cacheSet = async (key, value, ttl = 3600) => {
  if (!isConnected || !client) return false;
  try {
    const serializedValue = JSON.stringify(value);
    await client.setEx(key, ttl, serializedValue);
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
};

const cacheGet = async (key) => {
  if (!isConnected || !client) return null;
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

const cacheDel = async (key) => {
  if (!isConnected || !client) return false;
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
};

const cacheExists = async (key) => {
  if (!isConnected || !client) return false;
  try {
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Cache exists error:', error);
    cacheStats.errors++;
    return false;
  }
};

// Advanced caching functions
const cacheSetWithCompression = async (key, value, ttl = 3600) => {
  if (!isConnected || !client) return false;

  try {
    let serializedValue = JSON.stringify(value);

    // Compress if enabled and value is large enough
    if (CACHE_CONFIG.compression.enabled && serializedValue.length > CACHE_CONFIG.compression.threshold) {
      const zlib = require('zlib');
      const compressed = zlib.gzipSync(Buffer.from(serializedValue));
      serializedValue = compressed.toString('base64');
      // Store compressed data with compression flag
      await client.setEx(`${key}:compressed`, ttl, '1');
    }

    await client.setEx(key, ttl, serializedValue);
    cacheStats.sets++;
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    cacheStats.errors++;
    return false;
  }
};

const cacheGetWithDecompression = async (key) => {
  if (!isConnected || !client) return null;

  try {
    // Check if data is compressed
    const isCompressed = await client.get(`${key}:compressed`);

    let value = await client.get(key);
    if (!value) {
      cacheStats.misses++;
      return null;
    }

    cacheStats.hits++;

    if (isCompressed === '1') {
      // Decompress the data
      const zlib = require('zlib');
      const compressed = Buffer.from(value, 'base64');
      const decompressed = zlib.gunzipSync(compressed);
      value = decompressed.toString();
    }

    return JSON.parse(value);
  } catch (error) {
    console.error('Cache get error:', error);
    cacheStats.errors++;
    return null;
  }
};

// Cache invalidation patterns
const invalidateByPattern = async (pattern) => {
  if (!isConnected || !client) return 0;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      cacheStats.deletes += keys.length;
      console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
    }
    return keys.length;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    cacheStats.errors++;
    return 0;
  }
};

const invalidateUserCache = async (userId) => {
  const patterns = [
    `${CACHE_CONFIG.prefixes.user}${userId}:*`,
    `${CACHE_CONFIG.prefixes.dashboard}${userId}:*`,
    `${CACHE_CONFIG.prefixes.leads}user:${userId}:*`
  ];

  let totalInvalidated = 0;
  for (const pattern of patterns) {
    totalInvalidated += await invalidateByPattern(pattern);
  }

  return totalInvalidated;
};

const invalidateLeadCache = async (leadId, userId = null) => {
  const patterns = [
    `${CACHE_CONFIG.prefixes.leads}${leadId}`,
    `${CACHE_CONFIG.prefixes.leads}list:*`
  ];

  if (userId) {
    patterns.push(`${CACHE_CONFIG.prefixes.dashboard}${userId}:*`);
  }

  let totalInvalidated = 0;
  for (const pattern of patterns) {
    totalInvalidated += await invalidateByPattern(pattern);
  }

  return totalInvalidated;
};

// Cache warming strategies
const warmUserCache = async (userId) => {
  try {
    // Import User model dynamically to avoid circular dependencies
    const User = require('../models/User');

    // Warm dashboard data
    const dashboardData = await User.getDashboardData(userId);
    if (dashboardData) {
      await cacheSetWithCompression(
        `${CACHE_CONFIG.prefixes.dashboard}${userId}:data`,
        dashboardData,
        CACHE_CONFIG.dashboard
      );
    }

    console.log(`Cache warmed for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Cache warming error:', error);
    return false;
  }
};

const warmFrequentlyAccessedData = async () => {
  try {
    console.log('Starting cache warming for frequently accessed data...');

    // Warm metadata and configuration data
    const metadata = {
      leadStatuses: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Lost'],
      leadPriorities: ['Low', 'Medium', 'High', 'Urgent'],
      timestamp: new Date().toISOString()
    };

    await cacheSetWithCompression(
      `${CACHE_CONFIG.prefixes.metadata}lead-options`,
      metadata,
      CACHE_CONFIG.metadata
    );

    console.log('Cache warming completed');
    return true;
  } catch (error) {
    console.error('Cache warming error:', error);
    return false;
  }
};

// Cache analytics and monitoring
const getCacheStats = () => {
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? (cacheStats.hits / total * 100).toFixed(2) : 0;

  return {
    ...cacheStats,
    hitRate: `${hitRate}%`,
    totalRequests: total,
    uptime: Date.now() - cacheStats.lastReset.getTime()
  };
};

const resetCacheStats = () => {
  cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    lastReset: new Date()
  };
};

// TTL management
const extendTTL = async (key, additionalSeconds = 3600) => {
  if (!isConnected || !client) return false;

  try {
    const ttl = await client.ttl(key);
    if (ttl > 0) {
      await client.expire(key, ttl + additionalSeconds);
      return true;
    }
    return false;
  } catch (error) {
    console.error('TTL extension error:', error);
    return false;
  }
};

const getTTL = async (key) => {
  if (!isConnected || !client) return -2;

  try {
    return await client.ttl(key);
  } catch (error) {
    console.error('TTL check error:', error);
    return -2;
  }
};

// Batch operations
const batchSet = async (keyValuePairs, ttl = 3600) => {
  if (!isConnected || !client) return false;

  try {
    const pipeline = client.multi();

    for (const [key, value] of keyValuePairs) {
      const serializedValue = JSON.stringify(value);
      pipeline.setEx(key, ttl, serializedValue);
    }

    await pipeline.exec();
    cacheStats.sets += keyValuePairs.length;
    return true;
  } catch (error) {
    console.error('Batch set error:', error);
    cacheStats.errors++;
    return false;
  }
};

const batchGet = async (keys) => {
  if (!isConnected || !client) return new Array(keys.length).fill(null);

  try {
    const values = await client.mGet(keys);
    const results = values.map(value => {
      if (value) {
        cacheStats.hits++;
        return JSON.parse(value);
      } else {
        cacheStats.misses++;
        return null;
      }
    });

    return results;
  } catch (error) {
    console.error('Batch get error:', error);
    cacheStats.errors++;
    return new Array(keys.length).fill(null);
  }
};

// Cache key generation utilities
const generateCacheKey = (prefix, ...parts) => {
  return `${CACHE_CONFIG.prefixes[prefix] || prefix}${parts.join(':')}`;
};

// Cache warming on startup
const initializeCache = async () => {
  if (isConnected && client) {
    try {
      await warmFrequentlyAccessedData();
      console.log('Redis cache initialized with frequently accessed data');
    } catch (error) {
      console.error('Cache initialization error:', error);
    }
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected,
  closeRedis,
  cacheSet,
  cacheGet,
  cacheDel,
  cacheExists,
  // Advanced caching functions
  cacheSetWithCompression,
  cacheGetWithDecompression,
  invalidateByPattern,
  invalidateUserCache,
  invalidateLeadCache,
  warmUserCache,
  warmFrequentlyAccessedData,
  getCacheStats,
  resetCacheStats,
  extendTTL,
  getTTL,
  batchSet,
  batchGet,
  generateCacheKey,
  initializeCache,
  // Configuration
  CACHE_CONFIG,
};