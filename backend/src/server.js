
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

// Import job queues
const { setupJobQueues, addWorkflowProcessingJob } = require('./jobs/setup');
const migrationManager = require('./migrations');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:19000'],
  methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: process.env.CORS_HEADERS?.split(',') || ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Monitoring middleware
app.use(requestMonitor);
app.use(performanceMonitor(1000)); // Alert on requests > 1 second
app.use(memoryMonitor(0.9)); // Alert on memory usage > 90%

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Metrics middleware
app.use(metricsMiddleware);

// Health check endpoints
app.get('/health', healthCheck);
app.get('/health/detailed', detailedHealthCheck);
app.get('/metrics', metricsEndpoint);

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

// API routes - unified endpoint structure
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/conversion', conversionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/migrations', migrationRoutes);
app.use('/api/workflow-analytics', workflowAnalyticsRoutes);
app.use('/api/experiments', experimentsRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/commissions', commissionRoutes);

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
    serverInstance = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`Metrics available at http://localhost:${PORT}/metrics`);
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