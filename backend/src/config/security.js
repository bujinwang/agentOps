/**
 * Security Configuration
 * Centralized security settings and policies
 */

const securityConfig = {
  // Rate Limiting Configuration
  rateLimit: {
    general: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: 'Too many requests from this IP, please try again later.'
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Only 5 attempts per 15 minutes
      message: 'Too many authentication attempts, please try again later.'
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // Higher limit for API endpoints
      message: 'Too many API requests, please try again later.'
    },
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // Only 10 uploads per hour
      message: 'Too many file uploads, please try again later.'
    },
    admin: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // Only 20 admin requests per 15 minutes
      message: 'Too many admin requests, please try again later.'
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:19000'],
    methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: process.env.CORS_HEADERS?.split(',') || ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },

  // Security Headers Configuration
  headers: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },

  // Input Validation Configuration
  validation: {
    maxLength: 10000,
    skipBodyFields: ['password', 'token', 'refreshToken'],
    skipQueryFields: [],
    blockOnSecurityIssues: process.env.BLOCK_SUSPICIOUS === 'true'
  },

  // Security Monitoring Configuration
  monitoring: {
    logAllRequests: process.env.NODE_ENV === 'development',
    suspiciousThreshold: 3,
    blockSuspicious: process.env.BLOCK_SUSPICIOUS === 'true'
  },

  // CSRF Configuration
  csrf: {
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
  },

  // Brute Force Protection
  bruteForce: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    blockDuration: 60 * 60 * 1000 // 1 hour
  }
};

// Security policies
const securityPolicies = {
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false
  },

  // Session configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  },

  // File upload restrictions
  uploads: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
  },

  // API restrictions
  api: {
    maxRequestSize: '10mb',
    timeout: 30000, // 30 seconds
    maxConcurrentRequests: 100
  }
};

// Security event types for logging
const SECURITY_EVENTS = {
  SUSPICIOUS_REQUEST: 'suspicious_request',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  AUTH_FAILURE: 'auth_failure',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_PAYLOAD: 'suspicious_payload',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  PATH_TRAVERSAL_ATTEMPT: 'path_traversal_attempt',
  BRUTE_FORCE_ATTEMPT: 'brute_force_attempt',
  SUSPICIOUS_USER_AGENT: 'suspicious_user_agent',
  UNUSUAL_TRAFFIC_PATTERN: 'unusual_traffic_pattern'
};

// Required dependencies for security features
const requiredDependencies = [
  'express-rate-limit',
  'rate-limit-redis',
  'helmet',
  'cors',
  'express-validator',
  'csurf', // For CSRF protection if needed
  'express-sanitizer', // Additional sanitization
  'hpp', // HTTP Parameter Pollution protection
  'express-mongo-sanitize' // MongoDB injection protection (if using MongoDB)
];

// Installation instructions
const installationInstructions = `
To install required security dependencies, run:

npm install ${requiredDependencies.join(' ')}

For Redis-based rate limiting (recommended for production):
npm install redis

For additional security (optional):
npm install hpp express-mongo-sanitize csurf express-sanitizer
`;

module.exports = {
  securityConfig,
  securityPolicies,
  SECURITY_EVENTS,
  requiredDependencies,
  installationInstructions
};