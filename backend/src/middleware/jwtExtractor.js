const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');

/**
 * Middleware to extract and validate JWT tokens from Authorization headers
 * Extracts user information and attaches to req.user
 * Used to replace JWT parsing logic in n8n workflows
 */
const extractUserFromToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('No authorization header provided', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({
        error: 'Authorization required',
        message: 'Authorization header is required'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Invalid authorization header format', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        header: authHeader.substring(0, 20) + '...'
      });
      return res.status(401).json({
        error: 'Invalid authorization format',
        message: 'Authorization header must start with "Bearer "'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      logger.warn('Empty token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token cannot be empty'
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user information to request
    const roles = Array.isArray(decoded.roles)
      ? decoded.roles.map(role => String(role).toLowerCase())
      : decoded.role
        ? [String(decoded.role).toLowerCase()]
        : [];

    req.user = {
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: roles[0] || 'user',
      roles,
      permissions: decoded.permissions || []
    };

    // Log successful token extraction (only in debug mode for security)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('JWT token extracted successfully', {
        userId: req.user.userId,
        path: req.path,
        method: req.method
      });
    }

    next();
  } catch (error) {
    logger.error('JWT extraction error', {
      error: error.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
      stack: error.stack
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid.'
      });
    } else {
      return res.status(500).json({
        error: 'Authentication error',
        message: 'An error occurred while processing your request.'
      });
    }
  }
};

/**
 * Optional JWT extraction - doesn't fail if no token provided
 * Useful for endpoints that work with or without authentication
 */
const optionalExtractUserFromToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user context
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const roles = Array.isArray(decoded.roles)
      ? decoded.roles.map(role => String(role).toLowerCase())
      : decoded.role
        ? [String(decoded.role).toLowerCase()]
        : [];

    req.user = {
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: roles[0] || 'user',
      roles,
      permissions: decoded.permissions || []
    };

    next();
  } catch (error) {
    // For optional extraction, we don't fail on errors
    logger.debug('Optional JWT extraction failed, continuing without user context', {
      error: error.message,
      path: req.path
    });
    req.user = null;
    next();
  }
};

module.exports = {
  extractUserFromToken,
  optionalExtractUserFromToken
};
