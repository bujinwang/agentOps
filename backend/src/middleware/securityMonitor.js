/**
 * Security Monitoring Middleware
 * Monitors and logs security-related events and suspicious activities
 */

const { logger } = require('../config/logger');

// Security event types
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

// Suspicious patterns
const SUSPICIOUS_PATTERNS = {
  userAgents: [
    /sqlmap/i,
    /nmap/i,
    /nikto/i,
    /dirbuster/i,
    /gobuster/i,
    /wpscan/i,
    /joomlavs/i,
    /drupal/i,
    /acunetix/i,
    /openvas/i,
    /nessus/i,
    /qualys/i,
    /rapid7/i,
    /metasploit/i,
    /burpsuite/i,
    /owasp/i,
    /zaproxy/i,
    /postman/i,
    /insomnia/i,
    /httpie/i
  ],
  paths: [
    /\.\./,
    /wp-admin/i,
    /wp-content/i,
    /wp-includes/i,
    /administrator/i,
    /admin/i,
    /phpmyadmin/i,
    /mysql/i,
    /backup/i,
    /\.env/i,
    /\.git/i,
    /config/i,
    /database/i,
    /\.sql/i,
    /dump/i
  ],
  headers: [
    /x-forwarded-for/i,
    /x-real-ip/i,
    /x-client-ip/i,
    /x-remote-addr/i,
    /x-remote-ip/i,
    /x-cluster-client-ip/i,
    /x-forwarded/i,
    /forwarded/i
  ]
};

// Security monitoring middleware
const securityMonitor = (options = {}) => {
  const config = {
    logAllRequests: options.logAllRequests || false,
    suspiciousThreshold: options.suspiciousThreshold || 3,
    blockSuspicious: options.blockSuspicious || false,
    ...options
  };

  return (req, res, next) => {
    const startTime = Date.now();
    const clientInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent') || 'unknown',
      referer: req.get('Referer') || 'none',
      method: req.method,
      path: req.path,
      query: req.query,
      userId: req.user?.userId || 'anonymous',
      sessionId: req.session?.id || 'none'
    };

    // Track suspicious activities for this IP
    const suspiciousCount = getSuspiciousCount(clientInfo.ip);

    try {
      // Check for suspicious patterns
      const suspiciousActivities = detectSuspiciousActivity(req, clientInfo);

      if (suspiciousActivities.length > 0) {
        incrementSuspiciousCount(clientInfo.ip);

        // Log security event
        logSecurityEvent(SECURITY_EVENTS.SUSPICIOUS_REQUEST, {
          ...clientInfo,
          suspiciousActivities,
          suspiciousCount: suspiciousCount + 1,
          timestamp: new Date().toISOString()
        });

        // Block if threshold exceeded and blocking is enabled
        if (config.blockSuspicious && suspiciousCount >= config.suspiciousThreshold) {
          logger.warn('Blocking suspicious IP', {
            ip: clientInfo.ip,
            suspiciousCount: suspiciousCount + 1,
            lastActivities: suspiciousActivities
          });

          return res.status(403).json({
            error: 'Access Forbidden',
            message: 'Suspicious activity detected'
          });
        }
      }

      // Log all requests if enabled
      if (config.logAllRequests) {
        logger.info('Request logged', {
          ...clientInfo,
          headers: getRelevantHeaders(req),
          bodySize: req.body ? JSON.stringify(req.body).length : 0
        });
      }

      // Store original response methods for monitoring
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;

      let responseStatus = 200;
      let responseSize = 0;

      // Override response methods to capture response data
      res.send = function(data) {
        responseSize = data ? data.length : 0;
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        responseSize = JSON.stringify(data).length;
        return originalJson.call(this, data);
      };

      res.status = function(code) {
        responseStatus = code;
        return originalStatus.call(this, code);
      };

      // Log response when finished
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;

        // Log slow responses or errors
        if (responseTime > 5000 || responseStatus >= 400) {
          logger.warn('Slow or error response', {
            ...clientInfo,
            responseStatus,
            responseTime,
            responseSize,
            timestamp: new Date().toISOString()
          });
        }

        // Log security-relevant responses
        if (responseStatus === 401 || responseStatus === 403) {
          logSecurityEvent(SECURITY_EVENTS.UNAUTHORIZED_ACCESS, {
            ...clientInfo,
            responseStatus,
            responseTime,
            attemptedAction: `${req.method} ${req.path}`,
            timestamp: new Date().toISOString()
          });
        }
      });

      next();
    } catch (error) {
      logger.error('Security monitoring error:', error);
      next();
    }
  };
};

// Detect suspicious activities
const detectSuspiciousActivity = (req, clientInfo) => {
  const suspicious = [];

  // Check user agent
  if (clientInfo.userAgent !== 'unknown') {
    SUSPICIOUS_PATTERNS.userAgents.forEach(pattern => {
      if (pattern.test(clientInfo.userAgent)) {
        suspicious.push(`Suspicious user agent: ${clientInfo.userAgent}`);
      }
    });
  }

  // Check path
  SUSPICIOUS_PATTERNS.paths.forEach(pattern => {
    if (pattern.test(clientInfo.path)) {
      suspicious.push(`Suspicious path: ${clientInfo.path}`);
    }
  });

  // Check headers
  Object.keys(req.headers).forEach(headerName => {
    SUSPICIOUS_PATTERNS.headers.forEach(pattern => {
      if (pattern.test(headerName)) {
        suspicious.push(`Suspicious header: ${headerName}`);
      }
    });
  });

  // Check for unusual request patterns
  if (req.method === 'POST' && !req.body && req.headers['content-length'] > 0) {
    suspicious.push('POST request with no body but content-length > 0');
  }

  // Check for too many query parameters
  if (Object.keys(req.query).length > 20) {
    suspicious.push('Too many query parameters');
  }

  // Check for unusual characters in query parameters
  Object.values(req.query).forEach(value => {
    if (typeof value === 'string' && /[<>'"&]/.test(value)) {
      suspicious.push('HTML characters in query parameters');
    }
  });

  return suspicious;
};

// Get relevant headers for logging
const getRelevantHeaders = (req) => {
  const relevantHeaders = [
    'user-agent',
    'accept',
    'accept-language',
    'accept-encoding',
    'cache-control',
    'pragma',
    'connection',
    'host',
    'origin',
    'referer'
  ];

  const headers = {};
  relevantHeaders.forEach(header => {
    if (req.headers[header]) {
      headers[header] = req.headers[header];
    }
  });

  return headers;
};

// In-memory storage for suspicious activity tracking (use Redis in production)
const suspiciousActivity = new Map();

// Get suspicious count for IP
const getSuspiciousCount = (ip) => {
  return suspiciousActivity.get(ip) || 0;
};

// Increment suspicious count for IP
const incrementSuspiciousCount = (ip) => {
  const current = getSuspiciousCount(ip);
  suspiciousActivity.set(ip, current + 1);

  // Clean up old entries (simple cleanup)
  if (suspiciousActivity.size > 10000) {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    for (const [key, value] of suspiciousActivity.entries()) {
      if (value < cutoff) {
        suspiciousActivity.delete(key);
      }
    }
  }
};

// Log security event
const logSecurityEvent = (eventType, data) => {
  logger.warn(`Security Event: ${eventType}`, {
    eventType,
    ...data
  });
};

// Authentication failure monitor
const authFailureMonitor = (req, res, next) => {
  if (res.statusCode === 401) {
    logSecurityEvent(SECURITY_EVENTS.AUTH_FAILURE, {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      attemptedUser: req.body?.email || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Brute force protection
const bruteForceProtection = (options = {}) => {
  const config = {
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    maxAttempts: options.maxAttempts || 5,
    blockDuration: options.blockDuration || 60 * 60 * 1000, // 1 hour
    ...options
  };

  const attempts = new Map();
  const blocked = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    // Check if IP is blocked
    if (blocked.has(ip)) {
      const blockExpiry = blocked.get(ip);
      if (now < blockExpiry) {
        logSecurityEvent(SECURITY_EVENTS.BRUTE_FORCE_ATTEMPT, {
          ip,
          path: req.path,
          method: req.method,
          blockExpiry: new Date(blockExpiry).toISOString()
        });

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Account temporarily locked due to too many failed attempts'
        });
      } else {
        blocked.delete(ip);
      }
    }

    // Track attempts
    if (!attempts.has(ip)) {
      attempts.set(ip, []);
    }

    const ipAttempts = attempts.get(ip);

    // Remove old attempts outside the window
    const windowStart = now - config.windowMs;
    const recentAttempts = ipAttempts.filter(timestamp => timestamp > windowStart);

    if (recentAttempts.length >= config.maxAttempts) {
      // Block the IP
      blocked.set(ip, now + config.blockDuration);

      logSecurityEvent(SECURITY_EVENTS.BRUTE_FORCE_ATTEMPT, {
        ip,
        path: req.path,
        method: req.method,
        attempts: recentAttempts.length,
        blockDuration: config.blockDuration
      });

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many failed attempts. Account temporarily locked.'
      });
    }

    // Add current attempt
    recentAttempts.push(now);
    attempts.set(ip, recentAttempts);

    next();
  };
};

module.exports = {
  securityMonitor,
  authFailureMonitor,
  bruteForceProtection,
  detectSuspiciousActivity,
  logSecurityEvent,
  SECURITY_EVENTS,
  SUSPICIOUS_PATTERNS
};