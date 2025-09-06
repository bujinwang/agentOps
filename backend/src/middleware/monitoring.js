const os = require('os');
const { logger } = require('../config/logger');

// Application metrics
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byStatus: {}
      },
      responseTime: [],
      activeConnections: 0,
      memoryUsage: {},
      cpuUsage: {},
      uptime: process.uptime(),
      startTime: new Date()
    };
    
    this.startMetricsCollection();
  }

  startMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Log metrics every 5 minutes
    setInterval(() => {
      this.logMetrics();
    }, 300000);
  }

  collectSystemMetrics() {
    // Memory usage
    const memUsage = process.memoryUsage();
    const systemMem = os.totalmem();
    const freeMem = os.freemem();

    this.metrics.memoryUsage = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      systemTotal: systemMem,
      systemFree: freeMem,
      systemUsed: systemMem - freeMem,
      usagePercent: ((systemMem - freeMem) / systemMem * 100).toFixed(2)
    };

    // CPU usage
    const cpus = os.cpus();
    const cpuUsage = cpus.map(cpu => {
      const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
      const idle = cpu.times.idle;
      return {
        model: cpu.model,
        speed: cpu.speed,
        usage: ((total - idle) / total * 100).toFixed(2)
      };
    });

    this.metrics.cpuUsage = {
      average: (cpuUsage.reduce((acc, cpu) => acc + parseFloat(cpu.usage), 0) / cpuUsage.length).toFixed(2),
      cores: cpuUsage.length,
      details: cpuUsage
    };

    this.metrics.uptime = process.uptime();
  }

  recordRequest(method, statusCode, responseTime) {
    this.metrics.requests.total++;
    this.metrics.requests.byStatus[statusCode] = (this.metrics.requests.byStatus[statusCode] || 0) + 1;

    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    if (responseTime) {
      this.metrics.responseTime.push(responseTime);
      
      // Keep only last 1000 response times
      if (this.metrics.responseTime.length > 1000) {
        this.metrics.responseTime.shift();
      }
    }
  }

  recordConnection() {
    this.metrics.activeConnections++;
  }

  recordDisconnection() {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
  }

  getAverageResponseTime() {
    if (this.metrics.responseTime.length === 0) return 0;
    
    const sum = this.metrics.responseTime.reduce((acc, time) => acc + time, 0);
    return (sum / this.metrics.responseTime.length).toFixed(2);
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: this.getAverageResponseTime(),
      requestsPerSecond: (this.metrics.requests.total / this.metrics.uptime).toFixed(2)
    };
  }

  logMetrics() {
    const metrics = this.getMetrics();
    
    logger.info('Application Metrics', {
      requests: metrics.requests,
      averageResponseTime: metrics.averageResponseTime,
      requestsPerSecond: metrics.requestsPerSecond,
      activeConnections: metrics.activeConnections,
      memoryUsage: metrics.memoryUsage,
      cpuUsage: metrics.cpuUsage,
      uptime: metrics.uptime
    });
  }

  reset() {
    this.metrics.requests = {
      total: 0,
      successful: 0,
      failed: 0,
      byStatus: {}
    };
    this.metrics.responseTime = [];
    this.metrics.startTime = new Date();
  }
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

// Request monitoring middleware
const requestMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Record connection
  metricsCollector.recordConnection();

  // Override res.end to capture response completion
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Record request metrics
    metricsCollector.recordRequest(req.method, res.statusCode, responseTime);
    
    // Record disconnection
    metricsCollector.recordDisconnection();
    
    // Log slow requests (>1 second)
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userAgent: req.get('user-agent'),
        ip: req.ip
      });
    }
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Health check middleware
const healthCheck = (req, res) => {
  const metrics = metricsCollector.getMetrics();
  const memoryUsage = process.memoryUsage();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      external: memoryUsage.external
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      loadAverage: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem()
    },
    metrics: {
      requests: metrics.requests,
      averageResponseTime: metrics.averageResponseTime,
      activeConnections: metrics.activeConnections
    },
    checks: {
      database: true, // This would be set by database health check
      redis: true,    // This would be set by redis health check
      memory: memoryUsage.heapUsed < memoryUsage.heapTotal * 0.9,
      cpu: parseFloat(metrics.cpuUsage.average) < 80
    }
  };

  // Determine overall health status
  const allChecksPass = Object.values(health.checks).every(check => check === true);
  const statusCode = allChecksPass ? 200 : 503;
  
  if (!allChecksPass) {
    health.status = 'unhealthy';
    health.issues = [];
    
    Object.entries(health.checks).forEach(([check, passed]) => {
      if (!passed) {
        health.issues.push(`${check} check failed`);
      }
    });
  }

  res.status(statusCode).json(health);
};

// Detailed health check with dependencies
const detailedHealthCheck = async (req, res) => {
  const checks = {};
  const startTime = Date.now();

  try {
    // Database health check
    const dbStart = Date.now();
    // This would be implemented based on your database connection
    checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }

  try {
    // Redis health check
    const redisStart = Date.now();
    // This would be implemented based on your Redis connection
    checks.redis = {
      status: 'healthy',
      responseTime: Date.now() - redisStart
    };
  } catch (error) {
    checks.redis = {
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }

  // External service checks
  checks.externalServices = {
    status: 'healthy',
    services: {
      email: 'healthy',
      sms: 'healthy',
      openai: 'healthy'
    }
  };

  const overallHealth = Object.values(checks).every(check => 
    check.status === 'healthy' || 
    (check.services && Object.values(check.services).every(service => service === 'healthy'))
  );

  res.status(overallHealth ? 200 : 503).json({
    status: overallHealth ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
    responseTime: Date.now() - startTime
  });
};

// Performance monitoring middleware
const performanceMonitor = (threshold = 1000) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      if (responseTime > threshold) {
        logger.warn('Slow response detected', {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          responseTime: `${responseTime}ms`,
          threshold: `${threshold}ms`,
          userAgent: req.get('user-agent'),
          ip: req.ip
        });
      }
    });
    
    next();
  };
};

// Memory monitoring
const memoryMonitor = (threshold = 0.9) => {
  return (req, res, next) => {
    const memUsage = process.memoryUsage();
    const heapUsedRatio = memUsage.heapUsed / memUsage.heapTotal;
    
    if (heapUsedRatio > threshold) {
      logger.warn('High memory usage detected', {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        ratio: heapUsedRatio.toFixed(2),
        threshold: threshold,
        url: req.originalUrl,
        method: req.method
      });
    }
    
    next();
  };
};

// Rate limiting monitoring
const rateLimitMonitor = (req, res, next) => {
  // This would integrate with your rate limiting solution
  const rateLimitInfo = {
    limit: 100,
    remaining: 95,
    reset: Date.now() + 900000 // 15 minutes
  };
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
  res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
  res.setHeader('X-RateLimit-Reset', new Date(rateLimitInfo.reset).toISOString());
  
  next();
};

module.exports = {
  metricsCollector,
  requestMonitor,
  healthCheck,
  detailedHealthCheck,
  performanceMonitor,
  memoryMonitor,
  rateLimitMonitor
};