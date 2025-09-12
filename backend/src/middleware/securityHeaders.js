/**
 * Security Headers Middleware
 * Implements OWASP recommended security headers
 */

const { logger } = require('../config/logger');

// Security headers configuration
const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Content Security Policy (basic)
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",

  // HTTP Strict Transport Security (only if HTTPS is enabled)
  // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Feature policy / Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',

  // Remove server information
  'X-Powered-By': '',

  // Cross-Origin Embedder Policy (for COEP)
  'Cross-Origin-Embedder-Policy': 'credentialless',

  // Cross-Origin Opener Policy (for COOP)
  'Cross-Origin-Opener-Policy': 'same-origin',

  // Cross-Origin Resource Policy
  'Cross-Origin-Resource-Policy': 'cross-origin'
};

// Environment-specific headers
const getEnvironmentHeaders = () => {
  const headers = { ...SECURITY_HEADERS };

  // In development, allow more permissive CSP
  if (process.env.NODE_ENV === 'development') {
    headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace("'unsafe-inline'", "'unsafe-inline' http://localhost:* https://localhost:*");
  }

  // Only add HSTS in production with HTTPS
  if (process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  try {
    const headers = getEnvironmentHeaders();

    // Apply security headers
    Object.entries(headers).forEach(([header, value]) => {
      if (value) { // Only set headers with values
        res.setHeader(header, value);
      }
    });

    // Log security headers application (only in development or if debug enabled)
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_SECURITY === 'true') {
      logger.debug('Applied security headers', {
        path: req.path,
        method: req.method,
        headers: Object.keys(headers)
      });
    }

    next();
  } catch (error) {
    logger.error('Error applying security headers:', error);
    // Don't fail the request if security headers fail
    next();
  }
};

// API-specific security headers (more permissive for APIs)
const apiSecurityHeaders = (req, res, next) => {
  try {
    // Apply basic security headers for APIs
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Powered-By', '');

    // CORS headers for API (if needed)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    next();
  } catch (error) {
    logger.error('Error applying API security headers:', error);
    next();
  }
};

// Function to generate CSP for specific routes
const generateCSP = (directives = {}) => {
  const defaultDirectives = {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline'",
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: https:",
    'font-src': "'self' data:",
    'connect-src': "'self' https:",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'"
  };

  const finalDirectives = { ...defaultDirectives, ...directives };
  return Object.entries(finalDirectives)
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');
};

module.exports = {
  securityHeaders,
  apiSecurityHeaders,
  generateCSP,
  SECURITY_HEADERS
};