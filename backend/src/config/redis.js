const redis = require('redis');

let client;
let isConnected = false;

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
    return false;
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
};