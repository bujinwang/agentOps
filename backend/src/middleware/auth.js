
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ERROR_MESSAGES, JWT_CONFIG } = require('../config/constants');

// Generate JWT tokens
const generateTokens = (user) => {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds

  const accessTokenPayload = {
    userId: user.user_id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    type: 'access', // Token type for additional validation
    iat: now,
    iss: 'real-estate-crm-api'
  };

  const refreshTokenPayload = {
    userId: user.user_id,
    email: user.email,
    type: 'refresh', // Token type for additional validation
    iat: now,
    iss: 'real-estate-crm-api'
  };

  const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET, {
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
    algorithm: JWT_CONFIG.ALGORITHM,
    jwtid: require('crypto').randomBytes(16).toString('hex') // Add JWT ID for uniqueness
  });

  const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_SECRET, {
    expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
    algorithm: JWT_CONFIG.ALGORITHM,
    jwtid: require('crypto').randomBytes(16).toString('hex') // Add JWT ID for uniqueness
  });

  return { accessToken, refreshToken };
};

// Verify JWT token with enhanced security
const verifyToken = (token, expectedType = null) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_CONFIG.ALGORITHM],
      issuer: 'real-estate-crm-api', // Verify issuer
      maxAge: expectedType === 'refresh' ? JWT_CONFIG.REFRESH_TOKEN_EXPIRY : JWT_CONFIG.ACCESS_TOKEN_EXPIRY
    });

    // Additional security validations
    if (!decoded.userId || !decoded.email) {
      throw new Error('Token missing required claims');
    }

    // Verify token type if specified
    if (expectedType && decoded.type !== expectedType) {
      throw new Error(`Invalid token type. Expected ${expectedType}, got ${decoded.type}`);
    }

    // Check for token reuse/replay (basic check)
    const now = Math.floor(Date.now() / 1000);
    const tokenAge = now - (decoded.iat || 0);
    if (tokenAge < 0) {
      throw new Error('Token issued in the future');
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

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: ERROR_MESSAGES.UNAUTHORIZED
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    let decoded;
    try {
      decoded = verifyToken(token, 'access'); // Expect access token
    } catch (error) {
      if (error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.'
        });
      } else if (error.message === 'Invalid token type. Expected access, got refresh') {
        return res.status(401).json({
          error: 'Invalid token type',
          message: 'Access token required for this operation.'
        });
      }
      return res.status(401).json({
        error: 'Invalid token',
        message: ERROR_MESSAGES.INVALID_TOKEN
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: ERROR_MESSAGES.USER_NOT_FOUND
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.user_id;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
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

// Refresh token middleware
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        message: 'Please provide a refresh token'
      });
    }

    let decoded;
    try {
      decoded = verifyToken(refreshToken, 'refresh'); // Expect refresh token
    } catch (error) {
      if (error.message === 'Invalid token type. Expected refresh, got access') {
        return res.status(401).json({
          error: 'Invalid token type',
          message: 'Refresh token required for this operation.'
        });
      }
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Please log in again'
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: ERROR_MESSAGES.USER_NOT_FOUND
      });
    }

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
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  refreshToken,
  generateTokens,
  verifyToken
};
