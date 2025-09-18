const { Pool } = require('pg');

let pool;
let isShuttingDown = false;
let connectionHealthCheckInterval = null;

// Query performance monitoring
const queryStats = {
  totalQueries: 0,
  slowQueries: 0,
  avgQueryTime: 0,
  queryCount: 0,
  slowQueryThreshold: 1000, // 1 second
};

// Prepared statements cache
const preparedStatements = new Map();

// Connection health monitoring
const connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  idleConnections: 0,
  waitingClients: 0,
  lastHealthCheck: null,
  connectionErrors: 0
};

// Health check function
const performHealthCheck = async () => {
  if (!pool || isShuttingDown) return false;

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    connectionStats.lastHealthCheck = new Date();
    connectionStats.connectionErrors = 0;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error.message);
    connectionStats.connectionErrors++;
    return false;
  }
};

// Update connection statistics
const updateConnectionStats = () => {
  if (pool) {
    connectionStats.totalConnections = pool.totalCount || 0;
    connectionStats.activeConnections = pool.idleCount ? pool.totalCount - pool.idleCount : 0;
    connectionStats.idleConnections = pool.idleCount || 0;
    connectionStats.waitingClients = pool.waitingCount || 0;
  }
};

// Start health monitoring
const startHealthMonitoring = () => {
  if (connectionHealthCheckInterval) {
    clearInterval(connectionHealthCheckInterval);
  }

  connectionHealthCheckInterval = setInterval(async () => {
    await performHealthCheck();
    updateConnectionStats();

    // Log warnings if connection issues detected
    if (connectionStats.connectionErrors > 0) {
      console.warn('Database connection issues detected:', {
        errors: connectionStats.connectionErrors,
        stats: connectionStats
      });
    }
  }, 30000); // Check every 30 seconds

  // Prevent interval from keeping process alive
  if (connectionHealthCheckInterval.unref) {
    connectionHealthCheckInterval.unref();
  }
};

// Stop health monitoring
const stopHealthMonitoring = () => {
  if (connectionHealthCheckInterval) {
    clearInterval(connectionHealthCheckInterval);
    connectionHealthCheckInterval = null;
  }
};

const connectDatabase = async (retryCount = 0) => {
  const maxRetries = parseInt(process.env.DB_CONNECT_MAX_RETRIES) || 3;
  const retryDelay = parseInt(process.env.DB_CONNECT_RETRY_DELAY) || 2000;

  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'realestate_crm',
      user: process.env.DB_USER || 'crm_user',
      password: process.env.DB_PASSWORD || 'crm_password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // Additional connection options for better reliability
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
      allowExitOnIdle: true,
    };

    pool = new Pool(config);

    // Set up connection pool event handlers
    pool.on('connect', (client) => {
      console.log('New database client connected');
    });

    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client:', err);
      connectionStats.connectionErrors++;
    });

    pool.on('remove', (client) => {
      console.log('Database client removed from pool');
    });

    // Test the connection with timeout
    const testConnection = async () => {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT NOW() as current_time, version() as db_version');
        console.log('Database connection test successful:', {
          current_time: result.rows[0].current_time,
          db_version: result.rows[0].db_version.substring(0, 20) + '...'
        });
        return result.rows[0];
      } finally {
        client.release();
      }
    };

    await testConnection();

    // Start health monitoring
    startHealthMonitoring();

    console.log('Database connected successfully with monitoring enabled');
    return true;

  } catch (error) {
    console.error(`Database connection attempt ${retryCount + 1} failed:`, error.message);

    // Clean up failed pool
    if (pool) {
      try {
        await pool.end();
      } catch (cleanupError) {
        console.error('Error cleaning up failed pool:', cleanupError.message);
      }
      pool = null;
    }

    // Retry logic
    if (retryCount < maxRetries) {
      console.log(`Retrying database connection in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectDatabase(retryCount + 1);
    }

    throw new Error(`Failed to connect to database after ${maxRetries + 1} attempts: ${error.message}`);
  }
};

const getDatabase = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }

  if (isShuttingDown) {
    throw new Error('Database is shutting down. Cannot acquire new connections.');
  }

  return pool;
};

// Get database with health check
const getDatabaseWithHealthCheck = async () => {
  const db = getDatabase();

  // Perform a quick health check before returning
  try {
    const isHealthy = await performHealthCheck();
    if (!isHealthy) {
      console.warn('Database health check failed, but returning pool anyway');
    }
  } catch (error) {
    console.warn('Health check error:', error.message);
  }

  return db;
};

// Get connection statistics
const getConnectionStats = () => {
  updateConnectionStats();
  return { ...connectionStats };
};

// Get query performance statistics
const getQueryStats = () => {
  return { ...queryStats };
};

// Execute query with performance monitoring
const executeQuery = async (query, params = [], options = {}) => {
  const startTime = Date.now();
  const db = getDatabase();

  try {
    // Update query statistics
    queryStats.totalQueries++;
    queryStats.queryCount++;

    const result = await db.query(query, params);

    // Calculate query time
    const queryTime = Date.now() - startTime;

    // Update average query time
    queryStats.avgQueryTime = ((queryStats.avgQueryTime * (queryStats.queryCount - 1)) + queryTime) / queryStats.queryCount;

    // Check for slow queries
    if (queryTime > queryStats.slowQueryThreshold) {
      queryStats.slowQueries++;
      console.warn(`Slow query detected (${queryTime}ms):`, {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        params: params.length,
        rows: result.rows?.length || 0
      });
    }

    return result;
  } catch (error) {
    // Log query errors with context
    console.error('Query execution error:', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      params: params.length,
      error: error.message,
      executionTime: Date.now() - startTime
    });
    throw error;
  }
};

// Execute prepared statement
const executePrepared = async (name, query, params = []) => {
  const db = getDatabase();

  try {
    // Check if prepared statement exists
    if (!preparedStatements.has(name)) {
      // Prepare the statement
      await db.query('PREPARE ' + name + ' AS ' + query);
      preparedStatements.set(name, query);
    }

    // Execute the prepared statement
    const result = await db.query('EXECUTE ' + name, params);
    return result;
  } catch (error) {
    console.error('Prepared statement error:', { name, error: error.message });
    throw error;
  }
};

// Deallocate prepared statement
const deallocatePrepared = async (name) => {
  const db = getDatabase();

  try {
    if (preparedStatements.has(name)) {
      await db.query('DEALLOCATE ' + name);
      preparedStatements.delete(name);
    }
  } catch (error) {
    console.error('Error deallocating prepared statement:', { name, error: error.message });
  }
};

// Batch query execution
const executeBatch = async (queries) => {
  const db = getDatabase();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const results = [];
    for (const { query, params = [] } of queries) {
      const result = await client.query(query, params);
      results.push(result);
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Batch query error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Query result caching (simple in-memory cache)
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const executeWithCache = async (cacheKey, query, params = [], ttl = CACHE_TTL) => {
  // Check cache first
  const cached = queryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < ttl) {
    return cached.result;
  }

  // Execute query
  const result = await executeQuery(query, params);

  // Cache result
  queryCache.set(cacheKey, {
    result: result,
    timestamp: Date.now()
  });

  return result;
};

// Clear query cache
const clearQueryCache = (pattern = null) => {
  if (pattern) {
    // Clear cache entries matching pattern
    for (const [key] of queryCache) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    queryCache.clear();
  }
};

const closeDatabase = async (force = false) => {
  if (isShuttingDown && !force) {
    console.log('Database shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  console.log('Initiating database shutdown...');

  try {
    // Stop health monitoring
    stopHealthMonitoring();

    if (pool) {
      console.log('Closing database connection pool...');

      // Wait for all active connections to complete (with timeout)
      const shutdownTimeout = setTimeout(() => {
        console.warn('Database shutdown timeout reached, forcing close');
        pool.end();
      }, 10000); // 10 second timeout

      try {
        await pool.end();
        clearTimeout(shutdownTimeout);
        console.log('Database connection pool closed successfully');
      } catch (error) {
        clearTimeout(shutdownTimeout);
        console.error('Error closing database pool:', error.message);
        throw error;
      }
    }

    pool = null;
    console.log('Database shutdown completed');

  } catch (error) {
    console.error('Database shutdown error:', error.message);
    throw error;
  } finally {
    isShuttingDown = false;
  }
};

// Force close database (for emergency shutdowns)
const forceCloseDatabase = async () => {
  return closeDatabase(true);
};

// Check if database is healthy
const isDatabaseHealthy = async () => {
  if (!pool || isShuttingDown) {
    return false;
  }

  try {
    return await performHealthCheck();
  } catch (error) {
    console.error('Database health check error:', error.message);
    return false;
  }
};

module.exports = {
  connectDatabase,
  getDatabase,
  getDatabaseWithHealthCheck,
  closeDatabase,
  forceCloseDatabase,
  isDatabaseHealthy,
  getConnectionStats,
  getQueryStats,
  performHealthCheck,
  executeQuery,
  executePrepared,
  deallocatePrepared,
  executeBatch,
  executeWithCache,
  clearQueryCache,
};