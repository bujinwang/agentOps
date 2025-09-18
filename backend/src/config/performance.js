/**
 * Performance Monitoring Configuration
 * Centralized performance monitoring and alerting settings
 */

const performanceConfig = {
  // Response Time Monitoring
  responseTime: {
    warningThreshold: 1000,    // 1 second - log warning
    criticalThreshold: 5000,   // 5 seconds - log critical
    slowQueryThreshold: 2000,  // 2 seconds - consider slow
    percentiles: [50, 95, 99], // Calculate these percentiles
    sampleSize: 1000           // Keep last 1000 response times
  },

  // Memory Monitoring
  memory: {
    warningThreshold: 0.8,     // 80% - log warning
    criticalThreshold: 0.9,    // 90% - log critical
    heapDumpThreshold: 0.95,   // 95% - trigger heap dump
    gcThreshold: 0.85,         // 85% - force garbage collection
    sampleSize: 100            // Keep last 100 memory readings
  },

  // CPU Monitoring
  cpu: {
    warningThreshold: 0.7,     // 70% - log warning
    criticalThreshold: 0.85,   // 85% - log critical
    sampleSize: 50             // Keep last 50 CPU readings
  },

  // Throughput Monitoring
  throughput: {
    windowSize: 60,            // 60 seconds rolling window
    warningThreshold: 1000,    // 1000 requests/minute - warning
    criticalThreshold: 2000,   // 2000 requests/minute - critical
    sampleSize: 60             // Keep last 60 minutes of data
  },

  // Cache Configuration
  cache: {
    defaultTTL: 300,           // 5 minutes default
    maxMemoryItems: 1000,      // Max items in memory cache
    compressionThreshold: 1024, // Compress items > 1KB
    cleanupInterval: 60000,    // Clean expired items every minute
    redisPrefix: 'cache:'
  },

  // Database Performance
  database: {
    slowQueryThreshold: 1000,  // 1 second - consider slow
    connectionPoolSize: 10,    // Max connections
    queryTimeout: 30000,       // 30 seconds
    cacheEnabled: true,        // Enable query result caching
    cacheTTL: 600              // 10 minutes for query cache
  },

  // Alert Configuration
  alerts: {
    enabled: true,
    checkInterval: 30000,      // Check every 30 seconds
    cooldownPeriod: 300000,    // 5 minutes between similar alerts
    notificationChannels: ['log', 'email'], // Where to send alerts
    escalationThreshold: 3     // Escalate after 3 consecutive alerts
  },

  // Performance Baselines (for comparison)
  baselines: {
    avgResponseTime: 500,      // Expected average response time (ms)
    p95ResponseTime: 2000,     // Expected 95th percentile (ms)
    errorRate: 0.01,           // Expected error rate (1%)
    throughput: 100,           // Expected requests per minute
    memoryUsage: 0.7,          // Expected memory usage (70%)
    cpuUsage: 0.6             // Expected CPU usage (60%)
  },

  // Monitoring Endpoints
  endpoints: {
    metrics: '/api/performance/metrics',
    cacheStats: '/api/cache/stats',
    cacheHealth: '/api/cache/health',
    databaseStats: '/api/database/stats',
    health: '/health',
    detailedHealth: '/health/detailed'
  },

  // External Monitoring Integration
  externalMonitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    provider: process.env.MONITORING_PROVIDER || 'datadog', // datadog, newrelic, prometheus
    apiKey: process.env.MONITORING_API_KEY,
    endpoint: process.env.MONITORING_ENDPOINT,
    tags: {
      service: 'real-estate-crm',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0'
    }
  },

  // Performance Testing Configuration
  testing: {
    enabled: process.env.PERF_TESTING_ENABLED === 'true',
    loadTest: {
      duration: 300,           // 5 minutes
      concurrency: 50,         // 50 concurrent users
      rampUpTime: 60,          // 1 minute ramp up
      endpoints: [
        '/api/leads',
        '/api/analytics/dashboard',
        '/api/market-insights'
      ]
    },
    stressTest: {
      duration: 600,           // 10 minutes
      maxConcurrency: 200,     // Max 200 concurrent users
      failureThreshold: 0.05   // 5% failure rate threshold
    }
  },

  // Auto-scaling Configuration
  autoScaling: {
    enabled: process.env.AUTO_SCALING_ENABLED === 'true',
    metrics: {
      cpuThreshold: 0.8,       // Scale up at 80% CPU
      memoryThreshold: 0.85,   // Scale up at 85% memory
      responseTimeThreshold: 3000, // Scale up at 3s avg response time
      cooldownPeriod: 300      // 5 minutes between scaling actions
    },
    limits: {
      minInstances: 1,
      maxInstances: 10,
      scaleUpStep: 1,
      scaleDownStep: 1
    }
  },

  // Performance Optimization Settings
  optimization: {
    compression: {
      enabled: true,
      level: 6,                // Compression level (1-9)
      threshold: 1024         // Compress responses > 1KB
    },
    caching: {
      enabled: true,
      strategies: ['memory', 'redis'],
      defaultTTL: 300,
      cacheableEndpoints: [
        '/api/leads',
        '/api/analytics',
        '/api/market-insights'
      ]
    },
    connectionPooling: {
      enabled: true,
      maxConnections: 20,
      idleTimeout: 30000,
      acquireTimeout: 60000
    }
  }
};

// Performance monitoring thresholds by environment
const environmentThresholds = {
  development: {
    responseTime: { warning: 2000, critical: 10000 },
    memory: { warning: 0.9, critical: 0.95 },
    cpu: { warning: 0.8, critical: 0.9 }
  },
  staging: {
    responseTime: { warning: 1500, critical: 8000 },
    memory: { warning: 0.85, critical: 0.92 },
    cpu: { warning: 0.75, critical: 0.85 }
  },
  production: {
    responseTime: { warning: 1000, critical: 5000 },
    memory: { warning: 0.8, critical: 0.9 },
    cpu: { warning: 0.7, critical: 0.85 }
  }
};

// Get environment-specific configuration
function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  const envThresholds = environmentThresholds[env] || environmentThresholds.development;

  return {
    ...performanceConfig,
    responseTime: { ...performanceConfig.responseTime, ...envThresholds.responseTime },
    memory: { ...performanceConfig.memory, ...envThresholds.memory },
    cpu: { ...performanceConfig.cpu, ...envThresholds.cpu }
  };
}

// Performance monitoring utilities
const performanceUtils = {
  // Calculate percentile from array
  calculatePercentile: (arr, percentile) => {
    if (arr.length === 0) return 0;
    const sorted = arr.sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  },

  // Format bytes to human readable
  formatBytes: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Format milliseconds to human readable
  formatDuration: (ms) => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  },

  // Check if performance is within acceptable range
  isPerformanceAcceptable: (metrics) => {
    const config = getEnvironmentConfig();

    return {
      responseTime: metrics.avgResponseTime <= config.baselines.avgResponseTime,
      memory: metrics.memoryUsage <= config.baselines.memoryUsage,
      cpu: metrics.cpuUsage <= config.baselines.cpuUsage,
      errorRate: metrics.errorRate <= config.baselines.errorRate,
      throughput: metrics.throughput >= config.baselines.throughput
    };
  }
};

module.exports = {
  performanceConfig,
  environmentThresholds,
  getEnvironmentConfig,
  performanceUtils
};