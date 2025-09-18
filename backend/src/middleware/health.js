/**
 * Comprehensive Health Check Middleware
 * Multi-layer health monitoring for application, database, cache, and external services
 */

const { logger } = require('../config/logger');
const { performanceUtils } = require('../config/performance');

// Health check configuration
const HEALTH_CONFIG = {
  cache: {
    enabled: true,
    ttl: 30, // Cache health status for 30 seconds
    maxFailures: 3 // Allow 3 failures before marking unhealthy
  },
  timeouts: {
    database: 5000, // 5 seconds
    redis: 3000,    // 3 seconds
    external: 10000 // 10 seconds
  },
  thresholds: {
    responseTime: 2000, // 2 seconds max response time
    memoryUsage: 0.9,   // 90% max memory usage
    errorRate: 0.05     // 5% max error rate
  }
};

// Health status cache
const healthCache = {
  status: null,
  timestamp: 0,
  failures: 0
};

// Health check results
const healthResults = {
  overall: 'unknown',
  services: {},
  metrics: {},
  lastCheck: null,
  uptime: 0
};

/**
 * Database Health Check
 */
async function checkDatabaseHealth() {
  const startTime = Date.now();

  try {
    const { connectDatabase } = require('../config/database');

    // Test database connection
    const connection = await connectDatabase();
    if (!connection) {
      throw new Error('Database connection failed');
    }

    // Test basic query
    const result = await connection.query('SELECT 1 as health_check');
    if (!result || result.rows[0].health_check !== 1) {
      throw new Error('Database query failed');
    }

    // Test connection pool stats
    const poolStats = connection.poolStats || {};

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime,
      poolStats: {
        totalCount: poolStats.totalCount || 0,
        idleCount: poolStats.idleCount || 0,
        waitingCount: poolStats.waitingCount || 0
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Redis/Cache Health Check
 */
async function checkCacheHealth() {
  const startTime = Date.now();

  try {
    const cacheService = require('../services/CacheService').cacheService;

    // Test cache health
    const health = await cacheService.healthCheck();

    // Test basic cache operations
    const testKey = `health_check_${Date.now()}`;
    const testValue = { test: true, timestamp: Date.now() };

    await cacheService.set(testKey, testValue, { ttl: 10 });
    const retrieved = await cacheService.get(testKey);
    await cacheService.delete(testKey);

    if (!retrieved || retrieved.test !== true) {
      throw new Error('Cache read/write test failed');
    }

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime,
      cacheLayers: health,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Cache health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * External Services Health Check
 */
async function checkExternalServicesHealth() {
  const results = {};
  const services = [
    {
      name: 'openai',
      url: 'https://api.openai.com/v1/models',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: HEALTH_CONFIG.timeouts.external
    }
    // Add more external services as needed
  ];

  for (const service of services) {
    const startTime = Date.now();

    try {
      const response = await fetch(service.url, {
        method: 'GET',
        headers: service.headers,
        signal: AbortSignal.timeout(service.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      results[service.name] = {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        httpStatus: response.status
      };

    } catch (error) {
      logger.warn(`${service.name} health check failed:`, error.message);
      results[service.name] = {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  return results;
}

/**
 * Application Metrics Health Check
 */
async function checkApplicationHealth() {
  try {
    const performanceMetrics = require('./performance').performanceMetrics;

    // Calculate health metrics
    const recentResponseTimes = performanceMetrics.responseTimes.slice(-10);
    const avgResponseTime = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((sum, rt) => sum + rt.responseTime, 0) / recentResponseTimes.length
      : 0;

    const recentMemoryUsage = performanceMetrics.memoryUsage.slice(-5);
    const avgMemoryUsage = recentMemoryUsage.length > 0
      ? recentMemoryUsage.reduce((sum, mu) => sum + mu.usagePercent, 0) / recentMemoryUsage.length
      : 0;

    const recentErrors = performanceMetrics.responseTimes.filter(rt => rt.statusCode >= 400).length;
    const errorRate = recentResponseTimes.length > 0 ? recentErrors / recentResponseTimes.length : 0;

    // Determine application health
    const isHealthy = (
      avgResponseTime <= HEALTH_CONFIG.thresholds.responseTime &&
      avgMemoryUsage <= HEALTH_CONFIG.thresholds.memoryUsage &&
      errorRate <= HEALTH_CONFIG.thresholds.errorRate
    );

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      metrics: {
        avgResponseTime,
        avgMemoryUsage,
        errorRate,
        totalRequests: performanceMetrics.responseTimes.length,
        recentErrors
      },
      thresholds: HEALTH_CONFIG.thresholds
    };

  } catch (error) {
    logger.error('Application health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Comprehensive Health Check
 */
async function comprehensiveHealthCheck() {
  const startTime = Date.now();
  const results = {
    overall: 'unknown',
    services: {},
    metrics: {},
    timestamp: new Date().toISOString(),
    responseTime: 0
  };

  try {
    // Check if we can use cached result
    if (HEALTH_CONFIG.cache.enabled &&
        healthCache.status &&
        (Date.now() - healthCache.timestamp) < (HEALTH_CONFIG.cache.ttl * 1000) &&
        healthCache.failures < HEALTH_CONFIG.cache.maxFailures) {

      results.overall = healthCache.status;
      results.cached = true;
      results.cacheAge = Date.now() - healthCache.timestamp;

    } else {
      // Perform fresh health checks
      const [dbHealth, cacheHealth, externalHealth, appHealth] = await Promise.allSettled([
        checkDatabaseHealth(),
        checkCacheHealth(),
        checkExternalServicesHealth(),
        checkApplicationHealth()
      ]);

      // Process database health
      results.services.database = dbHealth.status === 'fulfilled' ? dbHealth.value : {
        status: 'unhealthy',
        error: dbHealth.reason?.message || 'Health check failed'
      };

      // Process cache health
      results.services.cache = cacheHealth.status === 'fulfilled' ? cacheHealth.value : {
        status: 'unhealthy',
        error: cacheHealth.reason?.message || 'Health check failed'
      };

      // Process external services health
      results.services.external = externalHealth.status === 'fulfilled' ? externalHealth.value : {
        status: 'unhealthy',
        error: externalHealth.reason?.message || 'Health check failed'
      };

      // Process application health
      results.services.application = appHealth.status === 'fulfilled' ? appHealth.value : {
        status: 'unhealthy',
        error: appHealth.reason?.message || 'Health check failed'
      };

      // Determine overall health
      const serviceStatuses = Object.values(results.services).map(s => s.status);
      if (serviceStatuses.every(status => status === 'healthy')) {
        results.overall = 'healthy';
        healthCache.failures = 0;
      } else if (serviceStatuses.some(status => status === 'healthy')) {
        results.overall = 'degraded';
        healthCache.failures = Math.min(healthCache.failures + 1, HEALTH_CONFIG.cache.maxFailures);
      } else {
        results.overall = 'unhealthy';
        healthCache.failures = Math.min(healthCache.failures + 1, HEALTH_CONFIG.cache.maxFailures);
      }

      // Update cache
      healthCache.status = results.overall;
      healthCache.timestamp = Date.now();
    }

    // Add system metrics
    results.metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    results.responseTime = Date.now() - startTime;

    // Update global health results
    healthResults.overall = results.overall;
    healthResults.services = results.services;
    healthResults.metrics = results.metrics;
    healthResults.lastCheck = results.timestamp;

    return results;

  } catch (error) {
    logger.error('Comprehensive health check failed:', error);

    results.overall = 'unhealthy';
    results.error = error.message;
    results.responseTime = Date.now() - startTime;

    // Update cache with failure
    healthCache.failures = Math.min(healthCache.failures + 1, HEALTH_CONFIG.cache.maxFailures);

    return results;
  }
}

/**
 * Basic Health Check Endpoint
 */
const basicHealthCheck = async (req, res) => {
  try {
    const health = await comprehensiveHealthCheck();

    const statusCode = health.overall === 'healthy' ? 200 :
                      health.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: health.overall,
      timestamp: health.timestamp,
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0'
    });

  } catch (error) {
    logger.error('Basic health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Detailed Health Check Endpoint
 */
const detailedHealthCheck = async (req, res) => {
  try {
    const health = await comprehensiveHealthCheck();

    const statusCode = health.overall === 'healthy' ? 200 :
                      health.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      ...health,
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Detailed health check failed',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Health Status Endpoint
 */
const healthStatusEndpoint = async (req, res) => {
  try {
    const currentHealth = {
      overall: healthResults.overall,
      services: healthResults.services,
      metrics: healthResults.metrics,
      lastCheck: healthResults.lastCheck,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    const statusCode = currentHealth.overall === 'healthy' ? 200 :
                      currentHealth.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json(currentHealth);

  } catch (error) {
    logger.error('Health status endpoint failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health status check failed',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Health Check Middleware for Routes
 */
const healthCheckMiddleware = (options = {}) => {
  const { requiredServices = ['database', 'cache'] } = options;

  return async (req, res, next) => {
    try {
      // Quick health check for required services
      const health = await comprehensiveHealthCheck();

      // Check if required services are healthy
      const unhealthyServices = requiredServices.filter(
        service => health.services[service]?.status !== 'healthy'
      );

      if (unhealthyServices.length > 0) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          unhealthyServices,
          timestamp: new Date().toISOString()
        });
      }

      next();

    } catch (error) {
      logger.error('Health check middleware failed:', error);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Health Monitoring Background Process
 */
const startHealthMonitoring = () => {
  const monitoringInterval = setInterval(async () => {
    try {
      await comprehensiveHealthCheck();

      // Log health status changes
      if (healthResults.overall !== 'healthy') {
        logger.warn('Health status degraded:', {
          overall: healthResults.overall,
          services: healthResults.services,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Health monitoring failed:', error);
    }
  }, 30000); // Check every 30 seconds

  // Return cleanup function
  return () => clearInterval(monitoringInterval);
};

module.exports = {
  basicHealthCheck,
  detailedHealthCheck,
  healthStatusEndpoint,
  comprehensiveHealthCheck,
  healthCheckMiddleware,
  startHealthMonitoring,
  HEALTH_CONFIG,
  healthResults
};