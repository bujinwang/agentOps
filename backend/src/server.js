
require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { logger } = require('./config/logger');
// const { swaggerDocs } = require('./config/swagger'); // Temporarily disabled
const { initializeMetrics, metricsMiddleware, metricsEndpoint } = require('./config/metrics');
const {
  requestMonitor,
  healthCheck,
  detailedHealthCheck,
  performanceMonitor,
  memoryMonitor
} = require('./middleware/monitoring');
const { errorHandler } = require('./middleware/errorHandler');
const { securityHeaders } = require('./middleware/securityHeaders');
const { sanitizeMiddleware } = require('./middleware/sanitization');
const { securityMonitor } = require('./middleware/securityMonitor');
const {
  generalLimiter,
  authLimiter,
  apiLimiter,
  uploadLimiter,
  adminLimiter
} = require('./middleware/rateLimiter');
const {
  responseTimeMonitor,
  memoryMonitor,
  cpuMonitor,
  throughputMonitor,
  performanceMetricsEndpoint,
  performanceAlertSystem
} = require('./middleware/performance');
const { cacheService, cacheMiddleware } = require('./services/CacheService');
const {
  basicHealthCheck,
  detailedHealthCheck,
  healthStatusEndpoint,
  healthCheckMiddleware,
  startHealthMonitoring
} = require('./middleware/health');

// Import routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const taskRoutes = require('./routes/tasks');
const interactionRoutes = require('./routes/interactions');
const analyticsRoutes = require('./routes/analytics');
const searchRoutes = require('./routes/search');
const notificationRoutes = require('./routes/notifications');
const templateRoutes = require('./routes/templates');
const conversionRoutes = require('./routes/conversion');
const fileRoutes = require('./routes/files');
const profileRoutes = require('./routes/profile');
const migrationRoutes = require('./routes/migrations');
const workflowAnalyticsRoutes = require('./routes/workflowAnalytics');
const experimentsRoutes = require('./routes/experiments');
const revenueRoutes = require('./routes/revenue');
const commissionRoutes = require('./routes/commissions');
const mlsRoutes = require('./routes/mls');
const mlsSyncRoutes = require('./routes/mls-sync');
const conversionTrackingRoutes = require('./routes/conversion-tracking');
const analyticsDashboardRoutes = require('./routes/analytics-dashboard');
const notificationsManagementRoutes = require('./routes/notifications-management');
const marketInsightsRoutes = require('./routes/market-insights');
const leadScoreRoutes = require('./routes/lead-score');
const mlsSyncSchedulerRoutes = require('./routes/mls-sync-scheduler');
const notificationTriggersRoutes = require('./routes/notification-triggers');

// Apply caching to frequently accessed routes
app.use('/api/leads', cacheMiddleware({
  ttl: 300, // 5 minutes
  keyFn: (req) => `leads:${req.user?.userId || 'anon'}:${JSON.stringify(req.query)}`,
  condition: (req) => req.method === 'GET' && !req.query.search // Don't cache search results
}));

app.use('/api/analytics', cacheMiddleware({
  ttl: 600, // 10 minutes
  keyFn: (req) => `analytics:${req.user?.userId || 'anon'}:${req.path}`,
  condition: (req) => req.method === 'GET'
}));

app.use('/api/market-insights', cacheMiddleware({
  ttl: 1800, // 30 minutes
  keyFn: (req) => `market-insights:${JSON.stringify(req.query)}`,
  condition: (req) => req.method === 'GET'
}));

// Import job queues
const { setupJobQueues, addWorkflowProcessingJob } = require('./jobs/setup');
const migrationManager = require('./migrations');
const cronScheduler = require('./jobs/cronScheduler');
const NotificationScheduler = require('./services/NotificationScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced Security Middleware Stack

// 1. Security Headers (Helmet + Custom)
app.use(helmet({
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
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Additional custom security headers
app.use(securityHeaders);

// 2. CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:19000'],
  methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: process.env.CORS_HEADERS?.split(',') || ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// 3. Security Monitoring (must be early)
app.use(securityMonitor({
  logAllRequests: process.env.NODE_ENV === 'development',
  suspiciousThreshold: 3,
  blockSuspicious: process.env.BLOCK_SUSPICIOUS === 'true'
}));

// 4. Input Sanitization
app.use(sanitizeMiddleware({
  maxLength: 10000,
  skipBodyFields: ['password', 'token', 'refreshToken'],
  skipQueryFields: [],
  blockOnSecurityIssues: false // Log but don't block in production initially
}));

// 5. Rate Limiting (different limits for different endpoints)
app.use('/api/auth', authLimiter); // Strict limits for auth
app.use('/api/admin', adminLimiter); // Strict limits for admin
app.use('/api/files', uploadLimiter); // Limits for file uploads
app.use('/api/', apiLimiter); // General API limits
app.use('/', generalLimiter); // General limits for all other routes

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring middleware
app.use(responseTimeMonitor);
app.use(throughputMonitor);
app.use(memoryMonitor(0.8)); // Alert on memory usage > 80%
app.use(cpuMonitor(0.7)); // Alert on CPU usage > 70%

// Legacy monitoring (keeping for compatibility)
app.use(requestMonitor);
app.use(performanceMonitor(1000)); // Alert on requests > 1 second

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Metrics middleware
app.use(metricsMiddleware);

// Health check endpoints
app.get('/health', basicHealthCheck);
app.get('/health/detailed', detailedHealthCheck);
app.get('/health/status', healthStatusEndpoint);
app.get('/metrics', metricsEndpoint);

// Performance monitoring endpoints
app.get('/api/performance/metrics', performanceMetricsEndpoint);

// Cache management endpoints
app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache statistics'
    });
  }
});

app.post('/api/cache/clear', async (req, res) => {
  try {
    const { pattern } = req.body;
    await cacheService.clear();

    res.json({
      success: true,
      message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

app.get('/api/cache/health', async (req, res) => {
  try {
    const health = await cacheService.healthCheck();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error checking cache health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check cache health'
    });
  }
});

// System monitoring endpoints
app.get('/api/monitoring/system', async (req, res) => {
  try {
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    logger.error('Error fetching system info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system information'
    });
  }
});

// Service monitoring endpoints
app.get('/api/monitoring/services', async (req, res) => {
  try {
    const { comprehensiveHealthCheck } = require('./middleware/health');
    const health = await comprehensiveHealthCheck();

    res.json({
      success: true,
      data: {
        overall: health.overall,
        services: health.services,
        timestamp: health.timestamp
      }
    });
  } catch (error) {
    logger.error('Error fetching service status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service status'
    });
  }
});

// Application metrics endpoint
app.get('/api/monitoring/metrics', async (req, res) => {
  try {
    const { performanceMetrics } = require('./middleware/performance');

    const metrics = {
      responseTimes: performanceMetrics.responseTimes.slice(-100), // Last 100 requests
      memoryUsage: performanceMetrics.memoryUsage.slice(-50),     // Last 50 memory readings
      throughput: performanceMetrics.throughput.slice(-60),       // Last 60 minutes
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching application metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application metrics'
    });
  }
});

// Database performance monitoring endpoints
app.get('/api/database/stats', async (req, res) => {
  try {
    const { getConnectionStats, getQueryStats } = require('./config/database');
    const connectionStats = getConnectionStats();
    const queryStats = getQueryStats();

    res.json({
      timestamp: new Date().toISOString(),
      connections: connectionStats,
      queries: queryStats,
      performance: {
        avgQueryTime: queryStats.avgQueryTime,
        slowQueryCount: queryStats.slowQueries,
        totalQueries: queryStats.totalQueries
      }
    });
  } catch (error) {
    logger.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Failed to fetch database statistics' });
  }
});

app.post('/api/database/cache/clear', async (req, res) => {
  try {
    const { clearQueryCache } = require('./config/database');
    const { pattern } = req.body;

    clearQueryCache(pattern);
    res.json({
      success: true,
      message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Health check middleware for critical routes
const criticalRoutesMiddleware = healthCheckMiddleware({
  requiredServices: ['database', 'cache']
});

// API routes - unified endpoint structure with health checks
app.use('/api/auth', criticalRoutesMiddleware, authRoutes);
app.use('/api/leads', criticalRoutesMiddleware, leadRoutes);
app.use('/api/tasks', criticalRoutesMiddleware, taskRoutes);
app.use('/api/interactions', criticalRoutesMiddleware, interactionRoutes);
app.use('/api/analytics', criticalRoutesMiddleware, analyticsRoutes);
app.use('/api/search', criticalRoutesMiddleware, searchRoutes);
app.use('/api/notifications', criticalRoutesMiddleware, notificationRoutes);
app.use('/api/templates', criticalRoutesMiddleware, templateRoutes);
app.use('/api/conversion', criticalRoutesMiddleware, conversionRoutes);
app.use('/api/files', criticalRoutesMiddleware, fileRoutes);
app.use('/api/profile', criticalRoutesMiddleware, profileRoutes);
app.use('/api/migrations', migrationRoutes);
app.use('/api/workflow-analytics', workflowAnalyticsRoutes);
app.use('/api/experiments', experimentsRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/mls', mlsRoutes);
app.use('/api/mls-sync', mlsSyncRoutes);
app.use('/api/conversion-tracking', conversionTrackingRoutes);
app.use('/api/analytics-dashboard', analyticsDashboardRoutes);
app.use('/api/notifications-management', notificationsManagementRoutes);
app.use('/api/market-insights', marketInsightsRoutes);
app.use('/api/lead-score', leadScoreRoutes);
app.use('/api/mls-sync', mlsSyncSchedulerRoutes);
app.use('/api/notifications', notificationTriggersRoutes);

// Remove duplicate webhook routes - use API endpoints only
// Frontend should connect to /api/* endpoints, not webhook routes

// Swagger API documentation - temporarily disabled
// swaggerDocs(app, PORT);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Store workflow interval reference for cleanup
let workflowInterval = null;
let serverInstance = null;

// Start server
async function startServer() {
  try {
    // Initialize metrics
    initializeMetrics();
    logger.info('Metrics initialized successfully');

    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Run database migrations
    await migrationManager.initialize();
    logger.info('Database migrations completed successfully');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Setup job queues
    await setupJobQueues();
    logger.info('Job queues setup successfully');

    // Start workflow scheduler (runs every 5 minutes)
    workflowInterval = setInterval(async () => {
      try {
        await addWorkflowProcessingJob();
      } catch (error) {
        logger.error('Failed to schedule workflow processing:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Prevent interval from keeping the process alive if unref is available
    if (workflowInterval.unref) {
      workflowInterval.unref();
    }

    logger.info('Workflow scheduler started (runs every 5 minutes)');

    // Start the server
    serverInstance = app.listen(PORT, async () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`Metrics available at http://localhost:${PORT}/metrics`);

      // Start cron scheduler
      try {
        await cronScheduler.start();
        logger.info('Cron scheduler started successfully');
      } catch (error) {
        logger.error('Failed to start cron scheduler', { error: error.message });
      }

      // Start notification scheduler
      try {
        NotificationScheduler.start();
        logger.info('Notification scheduler started successfully');
      } catch (error) {
        logger.error('Failed to start notification scheduler', { error: error.message });
      }
  
      // Start performance alert system
      try {
        const stopPerformanceAlerts = performanceAlertSystem();
        logger.info('Performance alert system started successfully');
  
        // Store reference for cleanup
        serverInstance.stopPerformanceAlerts = stopPerformanceAlerts;
      } catch (error) {
        logger.error('Failed to start performance alert system', { error: error.message });
      }
  
      // Start health monitoring
      try {
        const stopHealthMonitoring = startHealthMonitoring();
        logger.info('Health monitoring system started successfully');
  
        // Store reference for cleanup
        serverInstance.stopHealthMonitoring = stopHealthMonitoring;
      } catch (error) {
        logger.error('Failed to start health monitoring system', { error: error.message });
      }
    });

    // Handle server errors
    serverInstance.on('error', (error) => {
      logger.error('Server error:', error);
      gracefulShutdown();
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    await gracefulShutdown();
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal = 'unknown') => {
  logger.info(`Shutting down gracefully... (signal: ${signal})`);

  // Start shutdown timeout
  startShutdownTimeout();

  try {
    // Stop accepting new connections
    if (serverInstance) {
      logger.info('Stopping server...');
      await new Promise((resolve) => {
        serverInstance.close((err) => {
          if (err) {
            logger.error('Error closing server:', err);
          } else {
            logger.info('Server stopped accepting connections');
          }
    // Stop cron scheduler
    try {
      cronScheduler.stop();
      logger.info('Cron scheduler stopped');
    } catch (error) {
      logger.error('Error stopping cron scheduler:', error);
    }

    // Stop notification scheduler
    try {
      NotificationScheduler.stop();
      logger.info('Notification scheduler stopped');
    } catch (error) {
      logger.error('Error stopping notification scheduler:', error);
    }

    // Stop performance alert system
    try {
      if (serverInstance && serverInstance.stopPerformanceAlerts) {
        serverInstance.stopPerformanceAlerts();
        logger.info('Performance alert system stopped');
      }
    } catch (error) {
      logger.error('Error stopping performance alert system:', error);
    }

    // Stop health monitoring
    try {
      if (serverInstance && serverInstance.stopHealthMonitoring) {
        serverInstance.stopHealthMonitoring();
        logger.info('Health monitoring system stopped');
      }
    } catch (error) {
      logger.error('Error stopping health monitoring system:', error);
    }
          resolve();
        });
      });
    }

    // Clear workflow interval
    if (workflowInterval) {
      clearInterval(workflowInterval);
      workflowInterval = null;
      logger.info('Workflow scheduler stopped');
    }

    // Close database connections
    try {
      const { closeDatabase } = require('./config/database');
      await closeDatabase();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database:', error);
    }

    // Close Redis connections
    try {
      const redis = require('./config/redis');
      if (redis.closeRedis) {
        await redis.closeRedis();
        logger.info('Redis connections closed');
      }
    } catch (error) {
      logger.error('Error closing Redis:', error);
    }

    // Clear shutdown timeout since we completed successfully
    clearShutdownTimeout();

    logger.info('Graceful shutdown completed');
    process.exit(0);

  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    clearShutdownTimeout();
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException').then(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection').then(() => {
    process.exit(1);
  });
});

// Handle process warnings
process.on('warning', (warning) => {
  logger.warn('Process warning:', warning.name, warning.message);
});

// Force exit after timeout during shutdown
let shutdownTimeout;
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds

function startShutdownTimeout() {
  shutdownTimeout = setTimeout(() => {
    logger.error('Shutdown timeout reached, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
}

function clearShutdownTimeout() {
  if (shutdownTimeout) {
    clearTimeout(shutdownTimeout);
    shutdownTimeout = null;
  }
}

startServer();

module.exports = app;