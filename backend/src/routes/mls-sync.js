const express = require('express');
const { extractUserFromToken } = require('../middleware/jwtExtractor');
const MLSSyncService = require('../services/MLSSyncService');
const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

const router = express.Router();

// All routes require authentication
router.use(extractUserFromToken);

/**
 * GET /api/mls/sync/status
 * Get MLS sync status
 * Replaces n8n status check
 */
router.get('/sync/status', async (req, res) => {
  try {
    logger.info('MLS sync status request', {
      userId: req.user.userId
    });

    const status = await MLSSyncService.getSyncStatus();

    sendResponse(res, status, 'MLS sync status retrieved successfully');

  } catch (error) {
    logger.error('MLS sync status error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get MLS sync status', 'SYNC_STATUS_ERROR', null, 500);
  }
});

/**
 * POST /api/mls/sync/start
 * Start MLS synchronization
 * Replaces n8n sync trigger
 */
router.post('/sync/start', async (req, res) => {
  try {
    const {
      fullSync = false,
      validateData = true,
      skipDuplicates = false
    } = req.body;

    logger.info('MLS sync start request', {
      userId: req.user.userId,
      fullSync,
      validateData,
      skipDuplicates
    });

    const result = await MLSSyncService.startSync({
      fullSync,
      validateData,
      skipDuplicates
    });

    if (result.success) {
      sendResponse(res, result, 'MLS sync started successfully', 202);
    } else {
      sendResponse(res, result, result.message, 200);
    }

  } catch (error) {
    logger.error('MLS sync start error', {
      userId: req.user?.userId,
      options: req.body,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to start MLS sync', 'SYNC_START_ERROR', null, 500);
  }
});

/**
 * GET /api/mls/sync/progress/:syncId
 * Get sync progress for a specific sync
 * Replaces n8n progress monitoring
 */
router.get('/sync/progress/:syncId', async (req, res) => {
  try {
    const { syncId } = req.params;

    logger.info('MLS sync progress request', {
      syncId,
      userId: req.user.userId
    });

    const progress = await MLSSyncService.getSyncStatus(syncId);

    sendResponse(res, progress, 'MLS sync progress retrieved successfully');

  } catch (error) {
    logger.error('MLS sync progress error', {
      syncId: req.params.syncId,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get MLS sync progress', 'SYNC_PROGRESS_ERROR', null, 500);
  }
});

/**
 * GET /api/mls/sync/errors
 * Get recent sync errors
 * Replaces n8n error reporting
 */
router.get('/sync/errors', async (req, res) => {
  try {
    logger.info('MLS sync errors request', {
      userId: req.user.userId
    });

    const errors = await MLSSyncService.getSyncErrors();

    sendResponse(res, errors, 'MLS sync errors retrieved successfully');

  } catch (error) {
    logger.error('MLS sync errors error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get MLS sync errors', 'SYNC_ERRORS_ERROR', null, 500);
  }
});

/**
 * POST /api/mls/sync/manual
 * Manually trigger MLS sync (for testing)
 */
router.post('/sync/manual', async (req, res) => {
  try {
    const options = req.body;

    logger.info('Manual MLS sync request', {
      userId: req.user.userId,
      options
    });

    const result = await MLSSyncService.startSync(options);

    sendResponse(res, result, 'Manual MLS sync initiated successfully', 202);

  } catch (error) {
    logger.error('Manual MLS sync error', {
      userId: req.user?.userId,
      options: req.body,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to initiate manual MLS sync', 'MANUAL_SYNC_ERROR', null, 500);
  }
});

/**
 * GET /api/mls/properties/search
 * Search MLS properties
 */
router.get('/properties/search', async (req, res) => {
  try {
    const {
      city,
      state,
      minPrice,
      maxPrice,
      propertyType,
      status = 'Active',
      limit = 50,
      offset = 0
    } = req.query;

    logger.info('MLS property search request', {
      userId: req.user.userId,
      filters: { city, state, minPrice, maxPrice, propertyType, status }
    });

    // This would typically query the properties table
    // For now, return mock data
    const properties = [
      {
        mlsNumber: 'MLS001',
        address: '123 Main St, Anytown, USA',
        price: 450000,
        propertyType: 'Single Family',
        status: 'Active',
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 2000
      }
    ];

    sendResponse(res, {
      properties,
      pagination: {
        total: properties.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }, 'MLS properties search completed successfully');

  } catch (error) {
    logger.error('MLS property search error', {
      userId: req.user?.userId,
      filters: req.query,
      error: error.message
    });
    sendError(res, 'Failed to search MLS properties', 'PROPERTY_SEARCH_ERROR', null, 500);
  }
});

/**
 * GET /api/mls/properties/:mlsNumber
 * Get specific MLS property details
 */
router.get('/properties/:mlsNumber', async (req, res) => {
  try {
    const { mlsNumber } = req.params;

    logger.info('MLS property details request', {
      mlsNumber,
      userId: req.user.userId
    });

    // This would typically query the properties table
    // For now, return mock data
    const property = {
      mlsNumber,
      address: '123 Main St, Anytown, USA',
      city: 'Anytown',
      state: 'USA',
      zipCode: '12345',
      price: 450000,
      status: 'Active',
      propertyType: 'Single Family',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 2000,
      lotSize: 0.25,
      yearBuilt: 1995,
      description: 'Beautiful family home in quiet neighborhood',
      listingAgent: 'John Smith',
      listingOffice: 'ABC Realty',
      photos: ['photo1.jpg', 'photo2.jpg'],
      lastUpdated: new Date().toISOString()
    };

    sendResponse(res, property, 'MLS property details retrieved successfully');

  } catch (error) {
    logger.error('MLS property details error', {
      mlsNumber: req.params.mlsNumber,
      userId: req.user?.userId,
      error: error.message
    });
    sendError(res, 'Failed to get MLS property details', 'PROPERTY_DETAILS_ERROR', null, 500);
  }
});

/**
 * GET /api/mls/stats
 * Get MLS integration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('MLS stats request', {
      userId: req.user.userId
    });

    // This would typically aggregate statistics from the database
    const stats = {
      totalProperties: 1250,
      activeListings: 890,
      soldThisMonth: 45,
      averagePrice: 425000,
      priceChange: '+2.3%',
      topNeighborhoods: [
        { name: 'Downtown', count: 120, avgPrice: 550000 },
        { name: 'Suburb A', count: 95, avgPrice: 380000 },
        { name: 'Suburb B', count: 85, avgPrice: 420000 }
      ],
      lastSync: new Date().toISOString(),
      syncStatus: 'idle'
    };

    sendResponse(res, stats, 'MLS statistics retrieved successfully');

  } catch (error) {
    logger.error('MLS stats error', {
      userId: req.user?.userId,
      error: error.message
    });
    sendError(res, 'Failed to get MLS statistics', 'STATS_ERROR', null, 500);
  }
});

/**
 * POST /api/mls/webhook/property-update
 * Webhook for MLS property updates
 * This would typically be called by the MLS system
 */
router.post('/webhook/property-update', async (req, res) => {
  try {
    const { properties } = req.body;

    logger.info('MLS property update webhook', {
      propertyCount: properties?.length || 0,
      source: 'webhook'
    });

    // Process the webhook data (this would integrate with the main MLS processing)
    const result = {
      received: properties?.length || 0,
      processed: true,
      timestamp: new Date().toISOString()
    };

    sendResponse(res, result, 'MLS property update webhook processed successfully');

  } catch (error) {
    logger.error('MLS property update webhook error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to process MLS property update webhook', 'WEBHOOK_ERROR', null, 500);
  }
});

/**
 * GET /api/mls/logs
 * Get MLS sync logs
 */
router.get('/logs', async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      status,
      startDate,
      endDate
    } = req.query;

    logger.info('MLS logs request', {
      userId: req.user.userId,
      filters: { status, startDate, endDate }
    });

    // This would typically query the mls_sync_logs table
    // For now, return mock data
    const logs = [
      {
        syncId: 'mls_sync_001',
        status: 'completed',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date().toISOString(),
        recordsProcessed: 150,
        recordsUpdated: 45,
        recordsCreated: 105
      }
    ];

    sendResponse(res, {
      logs,
      pagination: {
        total: logs.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    }, 'MLS sync logs retrieved successfully');

  } catch (error) {
    logger.error('MLS logs error', {
      userId: req.user?.userId,
      error: error.message
    });
    sendError(res, 'Failed to get MLS sync logs', 'LOGS_ERROR', null, 500);
  }
});

module.exports = router;