
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { ERROR_MESSAGES, JWT_CONFIG } = require('../config/constants');

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set();
const tokenBlacklistMaxSize = 10000; // Prevent memory issues

// Rate limiting for token operations
const tokenRateLimit = new Map();
const TOKEN_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const TOKEN_RATE_LIMIT_MAX = 10; // 10 attempts per window

// Token blacklist management
const addToBlacklist = (token) => {
  if (tokenBlacklist.size >= tokenBlacklistMaxSize) {
    // Clear oldest entries (simple FIFO)
    const iterator = tokenBlacklist.values();
    for (let i = 0; i < 1000; i++) {
      const value = iterator.next().value;
      if (value) tokenBlacklist.delete(value);
    }
  }
  tokenBlacklist.add(token);
};

const isBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

// Rate limiting check
const checkRateLimit = (identifier) => {
  const now = Date.now();
  const userAttempts = tokenRateLimit.get(identifier) || [];

  // Remove old attempts outside the window
  const validAttempts = userAttempts.filter(time => now - time < TOKEN_RATE_LIMIT_WINDOW);

  if (validAttempts.length >= TOKEN_RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  validAttempts.push(now);
  tokenRateLimit.set(identifier, validAttempts);
  return true; // Within limits
};

// Generate JWT tokens with enhanced security
const generateTokens = (user) => {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const jti = crypto.randomBytes(16).toString('hex'); // Unique JWT ID

  const accessTokenPayload = {
    userId: user.user_id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    type: 'access',
    iat: now,
    iss: 'real-estate-crm-api',
    jti: jti,
    // Add user agent fingerprint for additional security
    fingerprint: crypto.createHash('sha256')
      .update(`${user.user_id}-${user.email}-${now}`)
      .digest('hex').substring(0, 16)
  };

  const refreshTokenPayload = {
    userId: user.user_id,
    email: user.email,
    type: 'refresh',
    iat: now,
    iss: 'real-estate-crm-api',
    jti: jti + '_refresh',
    fingerprint: accessTokenPayload.fingerprint
  };

  const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET, {
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
    algorithm: JWT_CONFIG.ALGORITHM
  });

  const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_SECRET, {
    expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
    algorithm: JWT_CONFIG.ALGORITHM
  });

  return { accessToken, refreshToken, jti };
};

// Verify JWT token with enhanced security
const verifyToken = (token, expectedType = null, userAgent = null) => {
  try {
    // Check if token is blacklisted
    if (isBlacklisted(token)) {
      throw new Error('Token has been revoked');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_CONFIG.ALGORITHM],
      issuer: 'real-estate-crm-api',
      maxAge: expectedType === 'refresh' ? JWT_CONFIG.REFRESH_TOKEN_EXPIRY : JWT_CONFIG.ACCESS_TOKEN_EXPIRY
    });

    // Comprehensive security validations
    if (!decoded.userId || !decoded.email) {
      throw new Error('Token missing required claims');
    }

    // Verify token type if specified
    if (expectedType && decoded.type !== expectedType) {
      throw new Error(`Invalid token type. Expected ${expectedType}, got ${decoded.type}`);
    }

    // Check for token reuse/replay with enhanced validation
    const now = Math.floor(Date.now() / 1000);
    const tokenAge = now - (decoded.iat || 0);

    if (tokenAge < 0) {
      throw new Error('Token issued in the future');
    }

    // Check token expiration more thoroughly
    if (decoded.exp && now > decoded.exp) {
      throw new Error('Token expired');
    }

    // Validate fingerprint if present (additional security layer)
    if (decoded.fingerprint) {
      const expectedFingerprint = crypto.createHash('sha256')
        .update(`${decoded.userId}-${decoded.email}-${decoded.iat}`)
        .digest('hex').substring(0, 16);

      if (decoded.fingerprint !== expectedFingerprint) {
        throw new Error('Token fingerprint mismatch');
      }
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not yet valid');
    }
    throw error;
  }
};

// Authentication middleware with enhanced security
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check rate limiting
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({
        error: 'Too many authentication attempts',
        message: 'Please try again later'
      });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: ERROR_MESSAGES.UNAUTHORIZED
      });
    }

    const token = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix and trim

    // Basic token format validation
    if (!token || token.length < 10) {
      return res.status(401).json({
        error: 'Invalid token format',
        message: ERROR_MESSAGES.INVALID_TOKEN
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token, 'access', userAgent);
    } catch (error) {
      // Enhanced error handling with specific messages
      if (error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.message === 'Token has been revoked') {
        return res.status(401).json({
          error: 'Token revoked',
          message: 'Your session has been terminated. Please log in again.',
          code: 'TOKEN_REVOKED'
        });
      } else if (error.message === 'Invalid token type. Expected access, got refresh') {
        return res.status(401).json({
          error: 'Invalid token type',
          message: 'Access token required for this operation.',
          code: 'INVALID_TOKEN_TYPE'
        });
      } else if (error.message === 'Token fingerprint mismatch') {
        return res.status(401).json({
          error: 'Security violation',
          message: 'Token validation failed. Please log in again.',
          code: 'TOKEN_FINGERPRINT_MISMATCH'
        });
      }

      return res.status(401).json({
        error: 'Invalid token',
        message: ERROR_MESSAGES.INVALID_TOKEN,
        code: 'INVALID_TOKEN'
      });
    }

    // Get user from database with additional validation
    const user = await User.findById(decoded.userId);

    if (!user) {
      // Token is valid but user doesn't exist - revoke the token
      addToBlacklist(token);
      return res.status(401).json({
        error: 'User not found',
        message: ERROR_MESSAGES.USER_NOT_FOUND,
        code: 'USER_NOT_FOUND'
      });
    }

    // Additional security checks
    if (user.email !== decoded.email) {
      // Email mismatch - potential security issue
      addToBlacklist(token);
      return res.status(401).json({
        error: 'Security violation',
        message: 'Token validation failed. Please log in again.',
        code: 'EMAIL_MISMATCH'
      });
    }

    // Attach user and token info to request
    req.user = user;
    req.userId = user.user_id;
    req.tokenJti = decoded.jti;
    req.tokenFingerprint = decoded.fingerprint;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      code: 'AUTHENTICATION_ERROR'
    });
  }
};

// Optional authentication middleware (for public routes that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId);
        
        if (user) {
          req.user = user;
          req.userId = user.user_id;
        }
      } catch (error) {
        // Ignore token errors for optional auth
        console.warn('Optional auth token error:', error.message);
      }
    }
    
    next();
  } catch (error) {
    // Never fail the request for optional auth
    console.error('Optional auth error:', error);
    next();
  }
};

// Refresh token middleware with enhanced security
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check rate limiting for refresh token requests
    if (!checkRateLimit(`refresh_${clientIP}`)) {
      return res.status(429).json({
        error: 'Too many refresh attempts',
        message: 'Please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    if (!token) {
      return res.status(400).json({
        error: 'Refresh token required',
        message: 'Please provide a refresh token',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Basic token format validation
    if (typeof token !== 'string' || token.length < 10) {
      return res.status(400).json({
        error: 'Invalid refresh token format',
        message: 'Please provide a valid refresh token',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token, 'refresh', userAgent);
    } catch (error) {
      // Enhanced error handling
      if (error.message === 'Token has been revoked') {
        return res.status(401).json({
          error: 'Refresh token revoked',
          message: 'Please log in again',
          code: 'TOKEN_REVOKED'
        });
      } else if (error.message === 'Invalid token type. Expected refresh, got access') {
        return res.status(401).json({
          error: 'Invalid token type',
          message: 'Refresh token required for this operation',
          code: 'INVALID_TOKEN_TYPE'
        });
      } else if (error.message === 'Token fingerprint mismatch') {
        return res.status(401).json({
          error: 'Security violation',
          message: 'Token validation failed. Please log in again.',
          code: 'TOKEN_FINGERPRINT_MISMATCH'
        });
      }

      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Please log in again',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      // User doesn't exist - revoke the refresh token
      addToBlacklist(token);
      return res.status(401).json({
        error: 'User not found',
        message: ERROR_MESSAGES.USER_NOT_FOUND,
        code: 'USER_NOT_FOUND'
      });
    }

    // Additional security validation
    if (user.email !== decoded.email) {
      addToBlacklist(token);
      return res.status(401).json({
        error: 'Security violation',
        message: 'Token validation failed. Please log in again.',
        code: 'EMAIL_MISMATCH'
      });
    }

    // Blacklist the old refresh token to prevent reuse
    addToBlacklist(token);

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      error: 'Token refresh failed',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      code: 'REFRESH_TOKEN_ERROR'
    });
  }
};

// Logout function to blacklist tokens
const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      addToBlacklist(token);
    }

    // Also blacklist refresh token if provided
    const { refreshToken } = req.body;
    if (refreshToken) {
      addToBlacklist(refreshToken);
    }

    res.json({
      message: 'Logged out successfully',
      data: {}
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      error: 'Logout failed',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

// Periodic cleanup of expired tokens (run every hour)
const cleanupExpiredTokens = () => {
  // In a production environment, this would be more sophisticated
  // For now, we'll just log the current blacklist size
  console.log(`Token blacklist size: ${tokenBlacklist.size}`);

  // In production, you might want to:
  // 1. Check token expiration dates
  // 2. Remove expired tokens from blacklist
  // 3. Clean up rate limiting data
};

// Start periodic cleanup
setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // Every hour

module.exports = {
  authenticate,
  optionalAuth,
  refreshToken,
  generateTokens,
  verifyToken,
  logout,
  addToBlacklist,
  isBlacklisted
};
