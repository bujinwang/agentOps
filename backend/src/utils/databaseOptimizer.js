// Database optimization utilities for improved query performance

const { executeQuery, executeWithCache, executeBatch, getQueryStats, clearQueryCache } = require('../config/database');

/**
 * Query optimization utilities
 */
class DatabaseOptimizer {

  /**
   * Execute a query with automatic EXPLAIN ANALYZE for performance analysis
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {boolean} analyze - Whether to run EXPLAIN ANALYZE
   * @returns {Promise<Object>} Query result with optional analysis
   */
  static async analyzeQuery(query, params = [], analyze = false) {
    if (analyze) {
      const explainQuery = `EXPLAIN ANALYZE ${query}`;
      const analysis = await executeQuery(explainQuery, params);
      console.log('Query Analysis:', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        analysis: analysis.rows
      });
    }

    return executeQuery(query, params);
  }

  /**
   * Execute bulk operations with transaction and progress tracking
   * @param {Array} operations - Array of {query, params} objects
   * @param {Object} options - Options for batch execution
   * @returns {Promise<Array>} Results of all operations
   */
  static async bulkOperation(operations, options = {}) {
    const { batchSize = 10, onProgress } = options;
    const results = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await executeBatch(batch);
      results.push(...batchResults);

      if (onProgress) {
        onProgress(Math.min(i + batchSize, operations.length), operations.length);
      }
    }

    return results;
  }

  /**
   * Get performance statistics for monitoring
   * @returns {Object} Performance statistics
   */
  static getPerformanceStats() {
    return getQueryStats();
  }

  /**
   * Clear query cache for specific patterns or all
   * @param {string} pattern - Cache key pattern to clear
   */
  static clearCache(pattern = null) {
    clearQueryCache(pattern);
  }

  /**
   * Execute read-heavy queries with caching
   * @param {string} cacheKey - Cache key
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<Object>} Cached query result
   */
  static async cachedQuery(cacheKey, query, params = [], ttl = 5 * 60 * 1000) {
    return executeWithCache(cacheKey, query, params, ttl);
  }

  /**
   * Optimize SELECT queries with proper indexing hints
   * @param {string} table - Table name
   * @param {Array} columns - Columns to select
   * @param {Object} where - Where conditions
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Optimized query result
   */
  static async optimizedSelect(table, columns = ['*'], where = {}, options = {}) {
    const { limit, offset, orderBy, useIndex } = options;

    let query = `SELECT ${columns.join(', ')} FROM ${table}`;
    const params = [];
    let paramIndex = 0;

    // Add index hint if specified
    if (useIndex) {
      query = `SELECT ${columns.join(', ')} FROM ${table} /*+ INDEX(${table} ${useIndex}) */`;
    }

    // Build WHERE clause
    if (Object.keys(where).length > 0) {
      const conditions = [];
      Object.entries(where).forEach(([key, value]) => {
        paramIndex++;
        if (value === null) {
          conditions.push(`${key} IS NULL`);
          paramIndex--; // Don't use parameter for NULL
        } else {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(value);
        }
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    // Add LIMIT/OFFSET
    if (limit) {
      paramIndex++;
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);

      if (offset) {
        paramIndex++;
        query += ` OFFSET $${paramIndex}`;
        params.push(offset);
      }
    }

    return executeQuery(query, params);
  }

  /**
   * Execute complex aggregations with optimized queries
   * @param {string} table - Table name
   * @param {Array} aggregations - Aggregation functions
   * @param {Object} groupBy - Group by columns
   * @param {Object} where - Where conditions
   * @returns {Promise<Object>} Aggregation results
   */
  static async optimizedAggregation(table, aggregations = [], groupBy = [], where = {}) {
    const aggFunctions = aggregations.map(agg => `${agg.function}(${agg.column}) as ${agg.alias || agg.column}_${agg.function.toLowerCase()}`);
    const selectClause = [...aggFunctions, ...groupBy].join(', ');

    let query = `SELECT ${selectClause} FROM ${table}`;
    const params = [];
    let paramIndex = 0;

    // Build WHERE clause
    if (Object.keys(where).length > 0) {
      const conditions = [];
      Object.entries(where).forEach(([key, value]) => {
        paramIndex++;
        conditions.push(`${key} = $${paramIndex}`);
        params.push(value);
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add GROUP BY
    if (groupBy.length > 0) {
      query += ` GROUP BY ${groupBy.join(', ')}`;
    }

    return executeQuery(query, params);
  }

  /**
   * Execute full-text search with optimized queries
   * @param {string} table - Table name
   * @param {string} searchTerm - Search term
   * @param {Array} searchColumns - Columns to search in
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  static async fullTextSearch(table, searchTerm, searchColumns = [], options = {}) {
    const { limit = 50, offset = 0, rankThreshold = 0.1 } = options;

    // Use GIN index for full-text search
    const tsvector = searchColumns.map(col => `coalesce(${col}, '')`).join(` || ' ' || `);
    const tsquery = searchTerm.split(' ').map(term => `${term}:*`).join(' & ');

    const query = `
      SELECT *,
             ts_rank_cd(to_tsvector('english', ${tsvector}), to_tsquery('english', $1)) as rank
      FROM ${table}
      WHERE to_tsvector('english', ${tsvector}) @@ to_tsquery('english', $1)
        AND ts_rank_cd(to_tsvector('english', ${tsvector}), to_tsquery('english', $1)) > $2
      ORDER BY rank DESC
      LIMIT $3 OFFSET $4
    `;

    const params = [tsquery, rankThreshold, limit, offset];
    return executeQuery(query, params);
  }

  /**
   * Monitor and log slow queries
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {number} threshold - Slow query threshold in ms
   * @returns {Promise<Object>} Query result
   */
  static async monitorQuery(query, params = [], threshold = 1000) {
    const startTime = Date.now();
    const result = await executeQuery(query, params);
    const executionTime = Date.now() - startTime;

    if (executionTime > threshold) {
      console.warn('Slow Query Detected:', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        executionTime: `${executionTime}ms`,
        params: params.length,
        rows: result.rows?.length || 0,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  }

  /**
   * Execute queries with connection pooling optimization
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Query result
   */
  static async executeWithOptimization(query, params = [], options = {}) {
    const { useCache = false, cacheKey, cacheTTL = 5 * 60 * 1000, monitor = true } = options;

    if (useCache && cacheKey) {
      return this.cachedQuery(cacheKey, query, params, cacheTTL);
    }

    if (monitor) {
      return this.monitorQuery(query, params);
    }

    return executeQuery(query, params);
  }
}

module.exports = DatabaseOptimizer;