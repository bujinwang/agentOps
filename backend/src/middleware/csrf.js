/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

const crypto = require('crypto');
const { logger } = require('../config/logger');

// CSRF token configuration
const CSRF_CONFIG = {
  secretLength: 32,
  tokenLength: 64,
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000 // 1 hour
  }
};

// Generate CSRF secret
const generateSecret = () => {
  return crypto.randomBytes(CSRF_CONFIG.secretLength).toString('hex');
};

// Generate CSRF token from secret
const generateToken = (secret) => {
  return crypto.createHash('sha256')
    .update(secret + Date.now().toString())
    .digest('hex')
    .substring(0, CSRF_CONFIG.tokenLength);
};

// CSRF protection middleware
const csrfProtection = (options = {}) => {
  const config = { ...CSRF_CONFIG, ...options };

  return (req, res, next) => {
    try {
      // Skip CSRF for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Skip CSRF for API endpoints that use JWT authentication
      if (req.path.startsWith('/api/') && req.headers.authorization) {
        return next();
      }

      // Skip CSRF for health checks and public endpoints
      if (req.path === '/health' || req.path === '/health/detailed' ||
          req.path === '/metrics' || req.path.startsWith('/api-docs')) {
        return next();
      }

      // Get CSRF token from request
      const tokenFromHeader = req.headers[config.headerName.toLowerCase()];
      const tokenFromBody = req.body?._csrf;
      const tokenFromQuery = req.query._csrf;

      const providedToken = tokenFromHeader || tokenFromBody || tokenFromQuery;

      // Get secret from session/cookie
      const secret = req.session?.csrfSecret || req.cookies?.[config.cookieName];

      if (!secret) {
        logger.warn('CSRF secret not found', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        return res.status(403).json({
          error: 'CSRF protection',
          message: 'CSRF secret not found. Please refresh the page.'
        });
      }

      if (!providedToken) {
        logger.warn('CSRF token missing', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        return res.status(403).json({
          error: 'CSRF protection',
          message: 'CSRF token missing'
        });
      }

      // Verify token
      const expectedToken = generateToken(secret);

      if (!crypto.timingSafeEqual(
        Buffer.from(providedToken, 'hex'),
        Buffer.from(expectedToken, 'hex')
      )) {
        logger.warn('CSRF token mismatch', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          providedToken: providedToken.substring(0, 8) + '...',
          expectedToken: expectedToken.substring(0, 8) + '...'
        });
        return res.status(403).json({
          error: 'CSRF protection',
          message: 'CSRF token invalid'
        });
      }

      next();
    } catch (error) {
      logger.error('CSRF protection error:', error);
      return res.status(500).json({
        error: 'CSRF protection',
        message: 'CSRF verification failed'
      });
    }
  };
};

// Middleware to set CSRF token
const csrfToken = (options = {}) => {
  const config = { ...CSRF_CONFIG, ...options };

  return (req, res, next) => {
    try {
      // Generate secret if not exists
      if (!req.session?.csrfSecret) {
        if (!req.session) req.session = {};
        req.session.csrfSecret = generateSecret();
      }

      const secret = req.session.csrfSecret;
      const token = generateToken(secret);

      // Set token in cookie
      res.cookie(config.cookieName, secret, config.cookieOptions);

      // Make token available to templates/views
      res.locals.csrfToken = token;
      req.csrfToken = token;

      next();
    } catch (error) {
      logger.error('CSRF token generation error:', error);
      next();
    }
  };
};

// CSRF error handler
const csrfErrorHandler = (error, req, res, next) => {
  if (error.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });

    return res.status(403).json({
      error: 'CSRF protection',
      message: 'CSRF token validation failed'
    });
  }

  next(error);
};

// Generate CSRF token for API responses
const generateCsrfToken = (req) => {
  if (!req.session?.csrfSecret) {
    if (!req.session) req.session = {};
    req.session.csrfSecret = generateSecret();
  }

  return generateToken(req.session.csrfSecret);
};

// Validate CSRF token manually
const validateCsrfToken = (token, secret) => {
  if (!token || !secret) return false;

  try {
    const expectedToken = generateToken(secret);
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    );
  } catch (error) {
    logger.error('CSRF token validation error:', error);
    return false;
  }
};

module.exports = {
  csrfProtection,
  csrfToken,
  csrfErrorHandler,
  generateCsrfToken,
  validateCsrfToken,
  CSRF_CONFIG
};