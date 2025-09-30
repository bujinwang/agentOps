const express = require('express');
const { extractUserFromToken } = require('../middleware/jwtExtractor');
const SearchService = require('../services/SearchService');
const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

const router = express.Router();

// All routes require authentication
router.use(extractUserFromToken);

/**
 * GET /api/search/leads
 * Search leads with advanced filtering
 * Replaces n8n search workflow
 */
router.get('/leads', async (req, res) => {
  try {
    const userId = req.user.userId;
    const filters = {
      query: req.query.q || '',
      status: req.query.status,
      priority: req.query.priority,
      source: req.query.source,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    logger.info('Lead search request', { userId, filters });

    const result = await SearchService.searchLeads(userId, filters);

    if (result.success) {
      sendResponse(res, result.data, 'Leads search completed successfully', 200, {
        pagination: {
          count: result.count,
          hasMore: result.hasMore,
          limit: filters.limit,
          offset: filters.offset
        }
      });
    } else {
      sendError(res, 'Search failed', 'SEARCH_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Lead search error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to search leads', 'SEARCH_ERROR', null, 500);
  }
});

/**
 * GET /api/search/tasks
 * Search tasks with advanced filtering
 * Replaces n8n search workflow
 */
router.get('/tasks', async (req, res) => {
  try {
    const userId = req.user.userId;
    const filters = {
      query: req.query.q || '',
      completed: req.query.completed ? req.query.completed === 'true' : undefined,
      priority: req.query.priority,
      leadId: req.query.leadId ? parseInt(req.query.leadId) : undefined,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    logger.info('Task search request', { userId, filters });

    const result = await SearchService.searchTasks(userId, filters);

    if (result.success) {
      sendResponse(res, result.data, 'Tasks search completed successfully', 200, {
        pagination: {
          count: result.count,
          hasMore: result.hasMore,
          limit: filters.limit,
          offset: filters.offset
        }
      });
    } else {
      sendError(res, 'Search failed', 'SEARCH_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Task search error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to search tasks', 'SEARCH_ERROR', null, 500);
  }
});

/**
 * GET /api/search/unified
 * Unified search across leads and tasks
 * Replaces n8n search workflow
 */
router.get('/unified', async (req, res) => {
  try {
    const userId = req.user.userId;
    const filters = {
      query: req.query.q || '',
      limit: parseInt(req.query.limit) || 25, // Smaller limit for unified search
      offset: parseInt(req.query.offset) || 0
    };

    logger.info('Unified search request', { userId, filters });

    const result = await SearchService.unifiedSearch(userId, filters);

    if (result.success) {
      sendResponse(res, result.data, 'Unified search completed successfully', 200, {
        summary: result.summary,
        pagination: {
          totalCount: result.summary.totalCount,
          limit: filters.limit,
          offset: filters.offset
        }
      });
    } else {
      sendError(res, 'Unified search failed', 'SEARCH_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Unified search error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to perform unified search', 'SEARCH_ERROR', null, 500);
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions based on user history and popular searches
 */
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const query = req.query.q || '';
    const db = require('../config/database');

    // Get user's recent search history
    const userHistoryQuery = `
      SELECT DISTINCT search_query->>'query' as query
      FROM search_history
      WHERE user_id = $1
        AND search_query->>'query' IS NOT NULL
        AND search_query->>'query' != ''
        AND executed_at >= NOW() - INTERVAL '30 days'
      ORDER BY executed_at DESC
      LIMIT 5
    `;

    // Get popular search terms across all users
    const popularQuery = `
      SELECT search_term, search_count
      FROM get_popular_search_terms(30, 10)
      ORDER BY search_count DESC
      LIMIT 5
    `;

    // Get user's saved searches
    const savedSearchesQuery = `
      SELECT name, search_query
      FROM saved_searches
      WHERE user_id = $1 AND is_active = true
      ORDER BY last_executed_at DESC NULLS LAST, updated_at DESC
      LIMIT 3
    `;

    const [userHistoryResult, popularResult, savedResult] = await Promise.all([
      db.query(userHistoryQuery, [userId]),
      db.query(popularQuery),
      db.query(savedSearchesQuery, [userId])
    ]);

    // Build suggestions object
    const suggestions = {
      leads: [],
      tasks: [],
      filters: [],
      recent: [],
      popular: [],
      saved: []
    };

    // Add user's recent searches
    suggestions.recent = userHistoryResult.rows.map(row => row.query);

    // Add popular searches (excluding user's own recent searches)
    const recentSet = new Set(suggestions.recent.map(q => q.toLowerCase()));
    suggestions.popular = popularResult.rows
      .filter(row => !recentSet.has(row.search_term.toLowerCase()))
      .map(row => row.search_term);

    // Add saved searches
    suggestions.saved = savedResult.rows.map(row => ({
      name: row.name,
      query: row.search_query?.query || ''
    }));

    // Add some default suggestions if we don't have enough
    if (suggestions.leads.length === 0) {
      suggestions.leads = [
        'recent leads',
        'hot leads',
        'new this week'
      ];
    }

    if (suggestions.tasks.length === 0) {
      suggestions.tasks = [
        'overdue tasks',
        'due today',
        'high priority'
      ];
    }

    if (suggestions.filters.length === 0) {
      suggestions.filters = [
        'status:active',
        'priority:high',
        'source:referral'
      ];
    }

    // Filter suggestions based on query if provided
    if (query) {
      const filtered = {};
      for (const [category, items] of Object.entries(suggestions)) {
        if (Array.isArray(items)) {
          filtered[category] = items.filter(item => {
            if (typeof item === 'string') {
              return item.toLowerCase().includes(query.toLowerCase());
            } else if (item && typeof item === 'object' && item.query) {
              return item.name.toLowerCase().includes(query.toLowerCase()) ||
                     item.query.toLowerCase().includes(query.toLowerCase());
            }
            return false;
          });
        } else {
          filtered[category] = items;
        }
      }
      Object.assign(suggestions, filtered);
    }

    sendResponse(res, suggestions, 'Search suggestions retrieved successfully');

  } catch (error) {
    logger.error('Search suggestions error', {
      userId: req.user?.userId,
      query: req.query.q,
      error: error.message
    });
    sendError(res, 'Failed to get search suggestions', 'SUGGESTIONS_ERROR', null, 500);
  }
});

/**
 * GET /api/search/stats
 * Get search usage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = require('../config/database');

    // Get overall search analytics for the last 30 days
    const analyticsQuery = `
      SELECT
        SUM(total_searches) as total_searches,
        AVG(average_execution_time) as avg_execution_time,
        SUM(unique_users) as unique_users
      FROM search_analytics
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    `;

    // Get popular queries from the last 30 days
    const popularQueriesQuery = `
      SELECT search_term, search_count::integer as count, avg_results::numeric as avg_results
      FROM get_popular_search_terms(30, 10)
      ORDER BY search_count DESC
    `;

    // Get user's personal search statistics
    const userStatsQuery = `
      SELECT
        COUNT(*) as user_total_searches,
        AVG(result_count) as user_avg_results,
        AVG(execution_time) as user_avg_execution_time,
        COUNT(DISTINCT DATE(executed_at)) as active_days
      FROM search_history
      WHERE user_id = $1
        AND executed_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    // Get search category breakdown from user's history
    const categoryStatsQuery = `
      SELECT
        COALESCE(search_query->>'type', 'unified') as category,
        COUNT(*) as count,
        AVG(result_count) as avg_results
      FROM search_history
      WHERE user_id = $1
        AND executed_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY search_query->>'type'
    `;

    const [analyticsResult, popularResult, userStatsResult, categoryResult] = await Promise.all([
      db.query(analyticsQuery),
      db.query(popularQueriesQuery),
      db.query(userStatsQuery, [userId]),
      db.query(categoryStatsQuery, [userId])
    ]);

    const analytics = analyticsResult.rows[0] || {};
    const userStats = userStatsResult.rows[0] || {};

    // Build category breakdown
    const searchCategories = {};
    categoryResult.rows.forEach(row => {
      searchCategories[row.category] = parseInt(row.count);
    });

    // Ensure we have all categories
    searchCategories.leads = searchCategories.leads || 0;
    searchCategories.tasks = searchCategories.tasks || 0;
    searchCategories.unified = searchCategories.unified || 0;

    // Calculate average results per category
    const averageResults = {};
    categoryResult.rows.forEach(row => {
      averageResults[row.category] = parseFloat(row.avg_results || 0).toFixed(1);
    });

    // Ensure we have all categories with defaults
    averageResults.leads = averageResults.leads || '0.0';
    averageResults.tasks = averageResults.tasks || '0.0';
    averageResults.unified = averageResults.unified || '0.0';

    const stats = {
      totalSearches: parseInt(analytics.total_searches || 0),
      uniqueUsers: parseInt(analytics.unique_users || 0),
      averageExecutionTime: parseFloat(analytics.avg_execution_time || 0).toFixed(1),
      popularQueries: popularResult.rows.map(row => ({
        query: row.search_term,
        count: row.count,
        avgResults: parseFloat(row.avg_results || 0).toFixed(1)
      })),
      searchCategories,
      averageResults,
      userStats: {
        totalSearches: parseInt(userStats.user_total_searches || 0),
        averageResults: parseFloat(userStats.user_avg_results || 0).toFixed(1),
        averageExecutionTime: parseFloat(userStats.user_avg_execution_time || 0).toFixed(1),
        activeDays: parseInt(userStats.active_days || 0)
      }
    };

    sendResponse(res, stats, 'Search statistics retrieved successfully');

  } catch (error) {
    logger.error('Search stats error', {
      userId: req.user?.userId,
      error: error.message
    });
    sendError(res, 'Failed to get search statistics', 'STATS_ERROR', null, 500);
  }
});

module.exports = router;