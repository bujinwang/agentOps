/**
 * Enhanced Rate Limiting Middleware
 * Implements different rate limits for different endpoints and user types
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { logger } = require('../config/logger');

const sanitizeOptionsForTests = (options = {}) => {
  if (process.env.NODE_ENV === 'test') {
    const { onLimitReached, ...rest } = options;
    return rest;
  }
  return options;
};

// Redis store for distributed rate limiting
const getRedisStore = () => {
  try {
    const redis = require('../config/redis');
    return new RedisStore({
      client: redis.getRedisClient(),
      prefix: 'rl:',
      resetExpiryOnChange: true
    });
  } catch (error) {
    logger.warn('Redis not available for rate limiting, using memory store');
    return undefined;
  }
};

// General API rate limiter
const createGeneralLimiter = () => rateLimit(sanitizeOptionsForTests({
  store: getRedisStore(),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/health/detailed';
  },
  onLimitReached: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
}
}));

// Strict rate limiter for authentication endpoints
const createAuthLimiter = () => rateLimit(sanitizeOptionsForTests({
  store: getRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  onLimitReached: (req, res) => {
    logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      email: req.body?.email || 'unknown'
    });
}
}));

// API endpoints rate limiter (more permissive)
const createApiLimiter = () => rateLimit(sanitizeOptionsForTests({
  store: getRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for API endpoints
  message: {
    error: 'API rate limit exceeded',
    message: 'Too many API requests, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and metrics
    return req.path === '/health' || req.path === '/health/detailed' ||
           req.path === '/metrics' || req.path.startsWith('/api-docs');
  }
}));

// File upload rate limiter (stricter)
const createUploadLimiter = () => rateLimit(sanitizeOptionsForTests({
  store: getRedisStore(),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Only 10 uploads per hour
  message: {
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads, please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.userId || 'unknown'
    });
}
}));

// Admin endpoints rate limiter (most restrictive)
const createAdminLimiter = () => rateLimit(sanitizeOptionsForTests({
  store: getRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Only 20 admin requests per 15 minutes
  message: {
    error: 'Admin rate limit exceeded',
    message: 'Too many admin requests, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: (req, res) => {
    logger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.userId || 'unknown',
      userRole: req.user?.role || 'unknown'
    });
}
}));

// User-based rate limiter (per user instead of per IP)
const createUserLimiter = (options = {}) => rateLimit(sanitizeOptionsForTests({
  store: getRedisStore(),
  windowMs: options.windowMs || 15 * 60 * 1000,
  max: options.max || 100,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.user?.userId ? `user:${req.user.userId}` : req.ip;
  },
  message: options.message || {
    error: 'User rate limit exceeded',
    message: 'Too many requests from your account, please try again later.',
    retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: (req, res) => {
    logger.warn('User rate limit exceeded', {
      userId: req.user?.userId || 'unknown',
      ip: req.ip,
      path: req.path,
      method: req.method
    });
}
}));

// Burst rate limiter for handling traffic spikes
const createBurstLimiter = () => rateLimit(sanitizeOptionsForTests({
  store: getRedisStore(),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: {
    error: 'Burst rate limit exceeded',
    message: 'Too many requests in a short time, please slow down.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: (req, res) => {
    logger.warn('Burst rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
}
}));

// Export all rate limiters
module.exports = {
  generalLimiter: createGeneralLimiter(),
  authLimiter: createAuthLimiter(),
  apiLimiter: createApiLimiter(),
  uploadLimiter: createUploadLimiter(),
  adminLimiter: createAdminLimiter(),
  userLimiter: createUserLimiter(),
  burstLimiter: createBurstLimiter(),
  createUserLimiter,
  createCustomLimiter: (options) => rateLimit(sanitizeOptionsForTests({
    store: getRedisStore(),
    ...options,
    standardHeaders: true,
    legacyHeaders: false
  }))
};