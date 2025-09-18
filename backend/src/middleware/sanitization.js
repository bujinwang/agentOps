/**
 * Input Sanitization Middleware
 * Protects against XSS, injection attacks, and malicious input
 */

const { logger } = require('../config/logger');

// HTML sanitization patterns
const SANITIZATION_PATTERNS = {
  // Remove script tags and their content
  script: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,

  // Remove javascript: URLs
  javascript: /javascript:/gi,

  // Remove vbscript: URLs
  vbscript: /vbscript:/gi,

  // Remove data: URLs that might contain scripts
  dataUrl: /data:text\/html/gi,

  // Remove event handlers
  eventHandlers: /on\w+\s*=/gi,

  // Remove style tags with javascript
  styleScript: /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,

  // Remove iframe tags
  iframe: /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,

  // Remove object/embed tags
  object: /<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi,

  // Remove meta refresh with javascript
  metaRefresh: /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi,

  // Remove base64 encoded scripts (basic detection)
  base64Script: /data:text\/javascript;base64,[a-zA-Z0-9+/=]+/gi
};

// SQL injection patterns (additional protection beyond parameterized queries)
const SQL_INJECTION_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(select|from|where|into)\b)/i,
  /('|(\\x27)|(\\x2D\\x2D)|(\\#)|(\\x23)|(\-\-)|(\;)|(\%3B)|(\%27)|(\%22)|(\%2D\\x2D)|(\%23))/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\\x27)|(')|(\-\-)|(\#)|(\\x23))/i,
  /((\%3D)|(=))[^\n]*((\%22)|(\\x22)|("))/i
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.[\/\\]/,
  /%2e%2e[\/\\]/,
  /%2e%2e%2f/,
  /%2e%2e%5c/,
  /\.\.%2f/,
  /\.\.%5c/
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$()]/,
  /\\x[0-9a-fA-F]{2}/,
  /%[0-9a-fA-F]{2}/
];

// Input sanitization function
const sanitizeInput = (input, options = {}) => {
  if (typeof input !== 'string') return input;

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Apply HTML sanitization
  if (options.html !== false) {
    Object.values(SANITIZATION_PATTERNS).forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length if specified
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
};

// Deep sanitization for objects and arrays
const sanitizeObject = (obj, options = {}) => {
  if (obj === null || typeof obj !== 'object') {
    return sanitizeInput(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip sensitive fields that shouldn't be sanitized
    if (options.skipFields && options.skipFields.includes(key)) {
      sanitized[key] = value;
      continue;
    }

    // Sanitize key and value
    const sanitizedKey = sanitizeInput(key, { maxLength: 100 });
    sanitized[sanitizedKey] = sanitizeObject(value, options);
  }

  return sanitized;
};

// Security validation function
const validateSecurity = (input, type = 'general') => {
  if (typeof input !== 'string') return { valid: true };

  const issues = [];

  // Check for SQL injection patterns
  if (type === 'sql' || type === 'general') {
    SQL_INJECTION_PATTERNS.forEach(pattern => {
      if (pattern.test(input)) {
        issues.push('Potential SQL injection detected');
      }
    });
  }

  // Check for path traversal
  if (type === 'path' || type === 'general') {
    PATH_TRAVERSAL_PATTERNS.forEach(pattern => {
      if (pattern.test(input)) {
        issues.push('Potential path traversal detected');
      }
    });
  }

  // Check for command injection
  if (type === 'command' || type === 'general') {
    COMMAND_INJECTION_PATTERNS.forEach(pattern => {
      if (pattern.test(input)) {
        issues.push('Potential command injection detected');
      }
    });
  }

  // Check for extremely long input (potential DoS)
  if (input.length > 10000) {
    issues.push('Input too long - potential DoS attack');
  }

  return {
    valid: issues.length === 0,
    issues
  };
};

// Express middleware for input sanitization
const sanitizeMiddleware = (options = {}) => {
  return (req, res, next) => {
    try {
      // Sanitize query parameters
      if (req.query) {
        req.query = sanitizeObject(req.query, {
          maxLength: 500,
          skipFields: options.skipQueryFields || []
        });
      }

      // Sanitize body parameters
      if (req.body) {
        req.body = sanitizeObject(req.body, {
          maxLength: 10000,
          skipFields: options.skipBodyFields || ['password', 'token', 'refreshToken']
        });
      }

      // Sanitize route parameters
      if (req.params) {
        req.params = sanitizeObject(req.params, {
          maxLength: 200,
          skipFields: options.skipParamFields || []
        });
      }

      // Security validation
      const securityChecks = [];

      // Check query parameters
      if (req.query) {
        Object.values(req.query).forEach(value => {
          if (typeof value === 'string') {
            const check = validateSecurity(value);
            if (!check.valid) {
              securityChecks.push(...check.issues);
            }
          }
        });
      }

      // Check body parameters
      if (req.body) {
        Object.values(req.body).forEach(value => {
          if (typeof value === 'string') {
            const check = validateSecurity(value);
            if (!check.valid) {
              securityChecks.push(...check.issues);
            }
          }
        });
      }

      // Log security issues
      if (securityChecks.length > 0) {
        logger.warn('Security issues detected in request', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          issues: securityChecks,
          userAgent: req.get('User-Agent')
        });

        // Block request if configured to do so
        if (options.blockOnSecurityIssues) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Request contains potentially malicious content'
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Error in sanitization middleware:', error);
      // Don't fail the request if sanitization fails
      next();
    }
  };
};

// File upload sanitization
const sanitizeFileUpload = (req, res, next) => {
  try {
    if (req.files) {
      // Check file names for path traversal
      Object.keys(req.files).forEach(fieldName => {
        const files = Array.isArray(req.files[fieldName]) ? req.files[fieldName] : [req.files[fieldName]];

        files.forEach(file => {
          // Sanitize filename
          const originalName = file.originalname || '';
          const sanitizedName = sanitizeInput(originalName, { maxLength: 255 });

          // Check for path traversal in filename
          const pathCheck = validateSecurity(sanitizedName, 'path');
          if (!pathCheck.valid) {
            logger.warn('Suspicious filename detected', {
              ip: req.ip,
              filename: originalName,
              issues: pathCheck.issues
            });

            // Remove the file from the request
            delete req.files[fieldName];
          } else {
            file.originalname = sanitizedName;
          }
        });
      });
    }

    next();
  } catch (error) {
    logger.error('Error in file upload sanitization:', error);
    next();
  }
};

// Export functions
module.exports = {
  sanitizeInput,
  sanitizeObject,
  validateSecurity,
  sanitizeMiddleware,
  sanitizeFileUpload,
  SANITIZATION_PATTERNS,
  SQL_INJECTION_PATTERNS,
  PATH_TRAVERSAL_PATTERNS,
  COMMAND_INJECTION_PATTERNS
};