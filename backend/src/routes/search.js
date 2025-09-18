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
 * Get search suggestions based on user history
 */
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const query = req.query.q || '';

    // This could be enhanced to provide intelligent suggestions
    // For now, return basic suggestions
    const suggestions = {
      leads: [
        'recent leads',
        'hot leads',
        'new this week'
      ],
      tasks: [
        'overdue tasks',
        'due today',
        'high priority'
      ],
      filters: [
        'status:active',
        'priority:high',
        'source:referral'
      ]
    };

    // Filter suggestions based on query
    if (query) {
      const filtered = {};
      for (const [category, items] of Object.entries(suggestions)) {
        filtered[category] = items.filter(item =>
          item.toLowerCase().includes(query.toLowerCase())
        );
      }
      suggestions = filtered;
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

    // This could track search usage patterns
    // For now, return mock statistics
    const stats = {
      totalSearches: 145,
      popularQueries: [
        { query: 'overdue tasks', count: 23 },
        { query: 'hot leads', count: 18 },
        { query: 'new this week', count: 15 }
      ],
      searchCategories: {
        leads: 67,
        tasks: 52,
        unified: 26
      },
      averageResults: {
        leads: 12.5,
        tasks: 8.3,
        unified: 15.2
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