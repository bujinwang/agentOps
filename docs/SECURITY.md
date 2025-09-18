# Security Implementation Guide

## Overview

This document outlines the comprehensive security hardening measures implemented for the Real Estate CRM system. The security implementation follows OWASP guidelines and industry best practices.

## 🔒 Security Features Implemented

### 1. Rate Limiting

**Purpose**: Prevent abuse and DoS attacks by limiting request frequency.

**Implementation**:
- **General Rate Limiting**: 100 requests per 15 minutes per IP
- **Authentication Endpoints**: 5 attempts per 15 minutes (brute force protection)
- **API Endpoints**: 200 requests per 15 minutes
- **File Uploads**: 10 uploads per hour
- **Admin Endpoints**: 20 requests per 15 minutes

**Configuration**: See `backend/src/config/security.js`

### 2. Input Sanitization

**Purpose**: Protect against XSS, injection attacks, and malicious input.

**Features**:
- HTML tag removal and neutralization
- JavaScript URL blocking
- SQL injection pattern detection
- Path traversal prevention
- Control character filtering
- Input length limits

**Files**: `backend/src/middleware/sanitization.js`

### 3. Security Headers

**Purpose**: Implement OWASP recommended security headers.

**Headers Applied**:
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` (restrictive)
- `Strict-Transport-Security` (production only)
- `Referrer-Policy: strict-origin-when-cross-origin`

**Files**: `backend/src/middleware/securityHeaders.js`

### 4. CORS Configuration

**Purpose**: Control cross-origin resource sharing.

**Configuration**:
- Whitelist specific origins
- Restrict HTTP methods
- Limit headers
- Enable credentials for authenticated requests

### 5. Security Monitoring

**Purpose**: Detect and log suspicious activities.

**Features**:
- Suspicious request pattern detection
- User agent analysis
- Path traversal attempt logging
- Authentication failure tracking
- Brute force attempt prevention
- Security event logging

**Files**: `backend/src/middleware/securityMonitor.js`

### 6. CSRF Protection

**Purpose**: Prevent Cross-Site Request Forgery attacks.

**Implementation**:
- CSRF token generation and validation
- Secure token storage in HTTP-only cookies
- Automatic token injection for forms
- Token verification for state-changing operations

**Files**: `backend/src/middleware/csrf.js`

## 🚀 Installation & Setup

### Required Dependencies

Install the following security dependencies:

```bash
npm install express-rate-limit rate-limit-redis helmet cors express-validator
```

For Redis-based rate limiting (recommended for production):

```bash
npm install redis
```

### Environment Variables

Add these security-related environment variables to your `.env` file:

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:19000
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization,X-Requested-With

# Security
BLOCK_SUSPICIOUS=false
NODE_ENV=development

# Redis (for distributed rate limiting)
REDIS_URL=redis://localhost:6379
```

## ⚙️ Configuration

### Security Configuration File

The main security configuration is in `backend/src/config/security.js`:

```javascript
const securityConfig = {
  rateLimit: {
    general: { windowMs: 15 * 60 * 1000, max: 100 },
    auth: { windowMs: 15 * 60 * 1000, max: 5 },
    // ... more configurations
  },
  cors: {
    origin: ['http://localhost:3001'],
    credentials: true
    // ... more configurations
  }
  // ... more security settings
};
```

### Middleware Stack Order

The security middleware is applied in this order in `backend/src/server.js`:

1. **Helmet + Custom Security Headers**
2. **CORS Configuration**
3. **Security Monitoring**
4. **Input Sanitization**
5. **Rate Limiting** (different limits per endpoint type)

## 🔍 Security Monitoring

### Security Events Logged

The system logs these security events:

- `suspicious_request`: Unusual request patterns
- `rate_limit_exceeded`: Rate limit violations
- `auth_failure`: Authentication failures
- `unauthorized_access`: Unauthorized access attempts
- `suspicious_payload`: Malicious input detection
- `sql_injection_attempt`: SQL injection attempts
- `xss_attempt`: XSS attack attempts
- `path_traversal_attempt`: Path traversal attempts
- `brute_force_attempt`: Brute force attack detection

### Monitoring Dashboard

Security events are logged and can be monitored through:

- Application logs
- Health check endpoints (`/health/detailed`)
- Metrics endpoint (`/metrics`)

## 🛡️ Protection Against Common Attacks

### 1. Cross-Site Scripting (XSS)
- **Input Sanitization**: Removes script tags and dangerous HTML
- **Content Security Policy**: Restricts script execution
- **XSS Protection Headers**: Browser-level XSS prevention

### 2. SQL Injection
- **Parameterized Queries**: All database queries use parameters
- **Input Validation**: Detects SQL injection patterns
- **Sanitization**: Removes dangerous SQL characters

### 3. Cross-Site Request Forgery (CSRF)
- **CSRF Tokens**: Required for state-changing operations
- **SameSite Cookies**: Prevents cross-site cookie sending
- **Origin Validation**: CORS origin checking

### 4. Brute Force Attacks
- **Rate Limiting**: Limits authentication attempts
- **Progressive Delays**: Increasing delays on failures
- **Account Lockout**: Temporary account locking

### 5. Denial of Service (DoS)
- **Rate Limiting**: Prevents request flooding
- **Request Size Limits**: Limits payload sizes
- **Timeout Protection**: Request timeout handling

### 6. Path Traversal
- **Input Validation**: Detects `../` patterns
- **Path Sanitization**: Normalizes file paths
- **Access Controls**: Restricts file system access

## 📊 Security Metrics

Monitor these security metrics:

- Rate limit violations per hour
- Authentication failure rate
- Suspicious request patterns
- Blocked IP addresses
- Security event frequency

## 🔧 Maintenance & Updates

### Regular Security Tasks

1. **Dependency Updates**: Keep security packages updated
2. **Log Review**: Regularly review security logs
3. **Rule Updates**: Update detection patterns
4. **Configuration Review**: Review security settings

### Security Testing

Run these security tests regularly:

```bash
# OWASP ZAP scanning
# SQLMap testing
# XSS payload testing
# CSRF token validation
# Rate limiting verification
```

## 🚨 Incident Response

### Security Incident Procedure

1. **Detection**: Security monitoring alerts
2. **Assessment**: Evaluate incident severity
3. **Containment**: Block malicious activity
4. **Investigation**: Analyze logs and patterns
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update security measures

### Emergency Contacts

- Security Team: security@company.com
- DevOps: devops@company.com
- Management: management@company.com

## 📚 Additional Resources

- [OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet Documentation](https://helmetjs.github.io/)

## 🔐 Security Checklist

- [ ] Dependencies installed and updated
- [ ] Environment variables configured
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Input validation working
- [ ] CORS properly configured
- [ ] Security monitoring active
- [ ] Logs being reviewed regularly
- [ ] Security tests passing

---

**Last Updated**: December 2024
**Version**: 1.0
**Contact**: Security Team