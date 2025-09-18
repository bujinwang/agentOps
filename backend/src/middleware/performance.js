/**
 * Performance Monitoring Middleware
 * Tracks response times, memory usage, and performance metrics
 */

const { logger } = require('../config/logger');

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  responseTime: {
    warning: 1000,  // 1 second
    critical: 5000  // 5 seconds
  },
  memoryUsage: {
    warning: 0.8,   // 80%
    critical: 0.9   // 90%
  },
  cpuUsage: {
    warning: 0.7,   // 70%
    critical: 0.85  // 85%
  }
};

// Performance metrics storage
const performanceMetrics = {
  responseTimes: [],
  memoryUsage: [],
  cpuUsage: [],
  errorRates: [],
  throughput: [],
  maxSamples: 1000
};

// Response time monitoring middleware
const responseTimeMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Store response time
    performanceMetrics.responseTimes.push({
      timestamp: Date.now(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent')?.substring(0, 100) || 'unknown'
    });

    // Keep only recent samples
    if (performanceMetrics.responseTimes.length > performanceMetrics.maxSamples) {
      performanceMetrics.responseTimes.shift();
    }

    // Log slow responses
    if (responseTime > PERFORMANCE_THRESHOLDS.responseTime.critical) {
      logger.error('Critical response time detected', {
        method: req.method,
        path: req.path,
        responseTime: `${responseTime.toFixed(2)}ms`,
        statusCode: res.statusCode,
        ip: req.ip
      });
    } else if (responseTime > PERFORMANCE_THRESHOLDS.responseTime.warning) {
      logger.warn('Slow response time detected', {
        method: req.method,
        path: req.path,
        responseTime: `${responseTime.toFixed(2)}ms`,
        statusCode: res.statusCode
      });
    }

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
};

// Memory usage monitoring
const memoryMonitor = (threshold = PERFORMANCE_THRESHOLDS.memoryUsage.warning) => {
  return (req, res, next) => {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal + memUsage.external;
    const usedMem = memUsage.heapUsed + memUsage.external;
    const memUsagePercent = usedMem / totalMem;

    // Store memory usage
    performanceMetrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      usagePercent: memUsagePercent
    });

    // Keep only recent samples
    if (performanceMetrics.memoryUsage.length > performanceMetrics.maxSamples) {
      performanceMetrics.memoryUsage.shift();
    }

    // Alert on high memory usage
    if (memUsagePercent > PERFORMANCE_THRESHOLDS.memoryUsage.critical) {
      logger.error('Critical memory usage detected', {
        usagePercent: `${(memUsagePercent * 100).toFixed(2)}%`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`
      });
    } else if (memUsagePercent > threshold) {
      logger.warn('High memory usage detected', {
        usagePercent: `${(memUsagePercent * 100).toFixed(2)}%`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`
      });
    }

    next();
  };
};

// CPU usage monitoring
const cpuMonitor = (threshold = PERFORMANCE_THRESHOLDS.cpuUsage.warning) => {
  let lastCpuUsage = process.cpuUsage();

  return (req, res, next) => {
    const currentCpuUsage = process.cpuUsage(lastCpuUsage);
    const totalCpuTime = currentCpuUsage.user + currentCpuUsage.system;
    const cpuUsagePercent = totalCpuTime / 1000000; // Convert to seconds

    // Store CPU usage
    performanceMetrics.cpuUsage.push({
      timestamp: Date.now(),
      user: currentCpuUsage.user,
      system: currentCpuUsage.system,
      usagePercent: cpuUsagePercent
    });

    // Keep only recent samples
    if (performanceMetrics.cpuUsage.length > performanceMetrics.maxSamples) {
      performanceMetrics.cpuUsage.shift();
    }

    // Alert on high CPU usage
    if (cpuUsagePercent > PERFORMANCE_THRESHOLDS.cpuUsage.critical) {
      logger.error('Critical CPU usage detected', {
        usagePercent: `${(cpuUsagePercent * 100).toFixed(2)}%`,
        userTime: `${(currentCpuUsage.user / 1000000).toFixed(2)}s`,
        systemTime: `${(currentCpuUsage.system / 1000000).toFixed(2)}s`
      });
    } else if (cpuUsagePercent > threshold) {
      logger.warn('High CPU usage detected', {
        usagePercent: `${(cpuUsagePercent * 100).toFixed(2)}%`
      });
    }

    // Update last CPU usage for next measurement
    lastCpuUsage = process.cpuUsage();

    next();
  };
};

// Throughput monitoring
const throughputMonitor = (req, res, next) => {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000); // Group by minute

  // Find or create throughput entry for current minute
  let throughputEntry = performanceMetrics.throughput.find(
    entry => entry.minute === currentMinute
  );

  if (!throughputEntry) {
    throughputEntry = {
      minute: currentMinute,
      requests: 0,
      errors: 0,
      avgResponseTime: 0,
      responseTimes: []
    };
    performanceMetrics.throughput.push(throughputEntry);
  }

  throughputEntry.requests++;

  // Store response time for averaging
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const startTime = res.startTime || process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000;

    throughputEntry.responseTimes.push(responseTime);

    // Calculate rolling average
    const totalTime = throughputEntry.responseTimes.reduce((sum, time) => sum + time, 0);
    throughputEntry.avgResponseTime = totalTime / throughputEntry.responseTimes.length;

    // Track errors
    if (res.statusCode >= 400) {
      throughputEntry.errors++;
    }

    // Keep only recent throughput data (last hour)
    performanceMetrics.throughput = performanceMetrics.throughput.filter(
      entry => entry.minute > currentMinute - 60
    );

    originalEnd.apply(this, args);
  };

  // Store start time
  res.startTime = process.hrtime.bigint();

  next();
};

// Performance metrics endpoint
const performanceMetricsEndpoint = (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      responseTimes: {
        count: performanceMetrics.responseTimes.length,
        avg: performanceMetrics.responseTimes.length > 0
          ? performanceMetrics.responseTimes.reduce((sum, rt) => sum + rt.responseTime, 0) / performanceMetrics.responseTimes.length
          : 0,
        p95: calculatePercentile(performanceMetrics.responseTimes.map(rt => rt.responseTime), 95),
        p99: calculatePercentile(performanceMetrics.responseTimes.map(rt => rt.responseTime), 99),
        slowest: performanceMetrics.responseTimes.length > 0
          ? Math.max(...performanceMetrics.responseTimes.map(rt => rt.responseTime))
          : 0
      },
      throughput: performanceMetrics.throughput.length > 0
        ? performanceMetrics.throughput[performanceMetrics.throughput.length - 1]
        : null,
      alerts: {
        slowResponses: performanceMetrics.responseTimes.filter(
          rt => rt.responseTime > PERFORMANCE_THRESHOLDS.responseTime.warning
        ).length,
        memoryWarnings: performanceMetrics.memoryUsage.filter(
          mu => mu.usagePercent > PERFORMANCE_THRESHOLDS.memoryUsage.warning
        ).length,
        cpuWarnings: performanceMetrics.cpuUsage.filter(
          cu => cu.usagePercent > PERFORMANCE_THRESHOLDS.cpuUsage.warning
        ).length
      }
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error generating performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance metrics'
    });
  }
};

// Calculate percentile from array
const calculatePercentile = (arr, percentile) => {
  if (arr.length === 0) return 0;

  const sorted = arr.sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

// Performance alert system
const performanceAlertSystem = () => {
  const checkInterval = setInterval(() => {
    try {
      // Check for performance issues
      const recentResponseTimes = performanceMetrics.responseTimes.slice(-10);
      const avgResponseTime = recentResponseTimes.length > 0
        ? recentResponseTimes.reduce((sum, rt) => sum + rt.responseTime, 0) / recentResponseTimes.length
        : 0;

      const recentMemoryUsage = performanceMetrics.memoryUsage.slice(-5);
      const avgMemoryUsage = recentMemoryUsage.length > 0
        ? recentMemoryUsage.reduce((sum, mu) => sum + mu.usagePercent, 0) / recentMemoryUsage.length
        : 0;

      // Alert conditions
      if (avgResponseTime > PERFORMANCE_THRESHOLDS.responseTime.critical) {
        logger.error('Performance Alert: High average response time', {
          avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
          threshold: `${PERFORMANCE_THRESHOLDS.responseTime.critical}ms`
        });
      }

      if (avgMemoryUsage > PERFORMANCE_THRESHOLDS.memoryUsage.critical) {
        logger.error('Performance Alert: High memory usage', {
          avgMemoryUsage: `${(avgMemoryUsage * 100).toFixed(2)}%`,
          threshold: `${(PERFORMANCE_THRESHOLDS.memoryUsage.critical * 100).toFixed(2)}%`
        });
      }

    } catch (error) {
      logger.error('Error in performance alert system:', error);
    }
  }, 30000); // Check every 30 seconds

  // Return cleanup function
  return () => clearInterval(checkInterval);
};

module.exports = {
  responseTimeMonitor,
  memoryMonitor,
  cpuMonitor,
  throughputMonitor,
  performanceMetricsEndpoint,
  performanceAlertSystem,
  PERFORMANCE_THRESHOLDS,
  performanceMetrics
};