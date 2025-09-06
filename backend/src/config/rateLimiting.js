/**
 * Enhanced Rate Limiting Configuration
 * Provides more granular control over API rate limiting
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { redisClient } = require('./redis');
const { logger } = require('./logger');

// Different rate limiting strategies for different endpoints
const RATE_LIMIT_STRATEGIES = {
  // General API endpoints
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  },
  
  // Lead operations
  LEAD_OPERATIONS: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50,
    message: 'Too many lead operations, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Search operations
  SEARCH: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20,
    message: 'Too many search requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // File upload
  FILE_UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many file uploads, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }
};

// Create rate limiter with Redis store if available
const createRateLimiter = (strategy, keyPrefix = 'rate_limit') => {
  const config = {
    ...strategy,
    store: redisClient ? new RedisStore({
      client: redisClient,
      prefix: `${keyPrefix}:`,
    }) : undefined,
    onLimitReached: (req, res, options) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    },
    handler: (req, res) => {
      res.status(429).json({
        status: 'error',
        message: strategy.message,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: res.getHeader('X-RateLimit-Reset'),
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  return rateLimit(config);
};

// Specific rate limiters for different endpoints
const generalRateLimiter = createRateLimiter(RATE_LIMIT_STRATEGIES.GENERAL, 'general');
const authRateLimiter = createRateLimiter(RATE_LIMIT_STRATEGIES.AUTH, 'auth');
const leadRateLimiter = createRateLimiter(RATE_LIMIT_STRATEGIES.LEAD_OPERATIONS, 'leads');
const searchRateLimiter = createRateLimiter(RATE_LIMIT_STRATEGIES.SEARCH, 'search');
const fileUploadRateLimiter = createRateLimiter(RATE_LIMIT_STRATEGIES.FILE_UPLOAD, 'file_upload');

// Dynamic rate limiter based on user type (premium users get higher limits)
const createDynamicRateLimiter = (baseStrategy, premiumMultiplier = 2) => {
  return (req, res, next) => {
    const strategy = { ...baseStrategy };
    
    // Check if user is premium (you would implement this logic)
    if (req.user && req.user.isPremium) {
      strategy.max = Math.floor(strategy.max * premiumMultiplier);
    }
    
    const limiter = createRateLimiter(strategy);
    return limiter(req, res, next);
  };
};

module.exports = {
  createRateLimiter,
  generalRateLimiter,
  authRateLimiter,
  leadRateLimiter,
  searchRateLimiter,
  fileUploadRateLimiter,
  createDynamicRateLimiter,
  RATE_LIMIT_STRATEGIES
};