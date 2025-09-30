const { jest: jestConfig } = require('@jest/globals');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'realestate_crm_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting test suite...');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Mock external services
jest.mock('../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../src/config/metrics', () => {
  const noop = () => {};
  const metricsRegistry = {
    incrementCounter: jest.fn(),
    setGauge: jest.fn(),
    observeHistogram: jest.fn(),
    createCounter: jest.fn(),
    createGauge: jest.fn(),
    createHistogram: jest.fn()
  };

  return {
    metricsRegistry,
    initializeMetrics: jest.fn(),
    metricsMiddleware: (req, res, next) => next(),
    metricsEndpoint: (req, res) => res.json({ metrics: [] }),
    recordLeadCreated: jest.fn(),
    recordLeadConverted: jest.fn(),
    recordInteractionCreated: jest.fn(),
    recordNotificationSent: jest.fn(),
    recordDatabaseQuery: jest.fn(),
    recordDatabaseError: jest.fn(),
    recordRedisOperation: jest.fn()
  };
});

jest.mock('../src/config/redis', () => ({
  connectRedis: jest.fn(),
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn()
  }))
}));

jest.mock('../src/jobs/setup', () => ({
  setupJobQueues: jest.fn()
}));

// Mock database connection
const mockPool = {
  connect: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn()
  })),
  query: jest.fn(),
  end: jest.fn()
};

jest.mock('../src/config/database', () => ({
  connectDatabase: jest.fn(),
  closeDatabase: jest.fn(),
  getDatabase: jest.fn(() => mockPool),
  executeQuery: jest.fn(),
  executeWithCache: jest.fn(),
  getConnectionStats: jest.fn(() => ({})),
  getQueryStats: jest.fn(() => ({ avgQueryTime: 0, slowQueries: 0, totalQueries: 0 })),
  startHealthMonitoring: jest.fn(),
  stopHealthMonitoring: jest.fn(),
  query: mockPool.query
}));

// Mock cache service
jest.mock('../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  },
  cacheMiddleware: () => (req, res, next) => next(),
  cacheInvalidation: {
    invalidateUserCache: jest.fn(),
    invalidateLeadCache: jest.fn(),
    invalidateResourceCache: jest.fn()
  },
  CACHE_CONFIG: { defaultTTL: 300 }
}));