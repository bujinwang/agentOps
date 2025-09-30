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

    const db = require('../config/database');

    // Build search query using the search_properties view
    let whereConditions = ["status = 'active'"];
    let params = [];
    let paramIndex = 1;

    if (city) {
      whereConditions.push(`city ILIKE $${paramIndex}`);
      params.push(`%${city}%`);
      paramIndex++;
    }

    if (state) {
      whereConditions.push(`state = $${paramIndex}`);
      params.push(state);
      paramIndex++;
    }

    if (minPrice) {
      whereConditions.push(`price >= $${paramIndex}`);
      params.push(parseFloat(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      whereConditions.push(`price <= $${paramIndex}`);
      params.push(parseFloat(maxPrice));
      paramIndex++;
    }

    if (propertyType) {
      whereConditions.push(`property_type = $${paramIndex}`);
      params.push(propertyType);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM search_properties
      WHERE ${whereClause}
    `;

    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const searchQuery = `
      SELECT
        id,
        title,
        description,
        price,
        property_type,
        bedrooms,
        bathrooms,
        square_feet,
        city,
        state,
        zip_code,
        mls_id,
        mls_status,
        created_at
      FROM search_properties
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(searchQuery, params);

    // Format properties for response
    const properties = result.rows.map(property => ({
      id: property.id,
      mlsNumber: property.mls_id,
      title: property.title,
      description: property.description,
      address: property.city && property.state ?
        `${property.city}, ${property.state}${property.zip_code ? ' ' + property.zip_code : ''}` :
        'Address not available',
      city: property.city,
      state: property.state,
      zipCode: property.zip_code,
      price: property.price,
      propertyType: property.property_type,
      status: property.mls_status || 'Active',
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      squareFeet: property.square_feet,
      createdAt: property.created_at
    }));

    sendResponse(res, {
      properties,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
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

    const db = require('../config/database');

    // Query property details with media
    const propertyQuery = `
      SELECT
        p.*,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'url', pm.url,
              'type', pm.media_type,
              'isPrimary', pm.is_primary,
              'title', pm.title,
              'description', pm.description
            ) ORDER BY pm.is_primary DESC, pm.sort_order ASC)
            FROM property_media pm
            WHERE pm.property_id = p.id
          ), '[]'::json
        ) AS photos
      FROM properties p
      WHERE p.mls_id = $1 AND p.deleted_at IS NULL
      LIMIT 1
    `;

    const result = await db.query(propertyQuery, [mlsNumber]);

    if (result.rows.length === 0) {
      return sendError(res, 'Property not found', 'PROPERTY_NOT_FOUND', null, 404);
    }

    const property = result.rows[0];

    // Format response
    const formattedProperty = {
      id: property.id,
      mlsNumber: property.mls_id,
      title: property.title,
      description: property.description || property.public_remarks,
      address: property.address?.street || 'Address not available',
      street: property.address?.street,
      city: property.address?.city,
      state: property.address?.state,
      zipCode: property.address?.zip_code,
      latitude: property.address?.latitude,
      longitude: property.address?.longitude,
      price: property.price,
      status: property.status,
      propertyType: property.property_type,
      bedrooms: property.details?.bedrooms,
      bathrooms: property.details?.bathrooms,
      halfBathrooms: property.details?.half_bathrooms,
      squareFeet: property.details?.square_feet,
      lotSize: property.details?.lot_size,
      yearBuilt: property.details?.year_built,
      garageSpaces: property.details?.garage_spaces,
      parkingSpaces: property.details?.parking_spaces,
      interiorFeatures: property.details?.interior_features || [],
      appliances: property.details?.appliances || [],
      listingAgent: property.marketing?.listing_agent || property.marketing?.agent,
      listingOffice: property.marketing?.listing_office,
      photos: Array.isArray(property.photos) ? property.photos : [],
      mlsProvider: property.mls_provider,
      mlsStatus: property.mls_status,
      mlsListingDate: property.mls_listing_date,
      lastUpdated: property.updated_at,
      createdAt: property.created_at
    };

    sendResponse(res, formattedProperty, 'MLS property details retrieved successfully');

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

    const db = require('../config/database');

    // Get basic property counts
    const basicStatsQuery = `
      SELECT
        COUNT(*) as total_properties,
        COUNT(*) FILTER (WHERE status = 'active') as active_listings,
        COUNT(*) FILTER (WHERE status = 'sold' AND updated_at >= CURRENT_DATE - INTERVAL '30 days') as sold_this_month,
        AVG(price) FILTER (WHERE price > 0) as average_price,
        MIN(updated_at) as oldest_property,
        MAX(updated_at) as newest_property
      FROM properties
      WHERE deleted_at IS NULL AND mls_id IS NOT NULL
    `;

    // Get top neighborhoods by property count
    const neighborhoodsQuery = `
      SELECT
        COALESCE(address->>'city', 'Unknown') as neighborhood,
        COUNT(*) as count,
        ROUND(AVG(price)) as avg_price
      FROM properties
      WHERE deleted_at IS NULL AND mls_id IS NOT NULL AND status = 'active'
      GROUP BY address->>'city'
      HAVING COUNT(*) >= 3
      ORDER BY count DESC
      LIMIT 5
    `;

    // Get price change over last 30 days (comparing to previous 30 days)
    const priceChangeQuery = `
      WITH recent_prices AS (
        SELECT
          price,
          CASE
            WHEN updated_at >= CURRENT_DATE - INTERVAL '30 days' THEN 'current'
            ELSE 'previous'
          END as period
        FROM properties
        WHERE deleted_at IS NULL
          AND mls_id IS NOT NULL
          AND price > 0
          AND updated_at >= CURRENT_DATE - INTERVAL '60 days'
      )
      SELECT
        AVG(CASE WHEN period = 'current' THEN price END) as current_avg,
        AVG(CASE WHEN period = 'previous' THEN price END) as previous_avg
      FROM recent_prices
    `;

    // Get last sync info
    const lastSyncQuery = `
      SELECT
        completed_at as last_sync,
        status as sync_status,
        results
      FROM mls_sync_logs
      WHERE status IN ('completed', 'failed')
      ORDER BY completed_at DESC
      LIMIT 1
    `;

    const [basicResult, neighborhoodsResult, priceChangeResult, lastSyncResult] = await Promise.all([
      db.query(basicStatsQuery),
      db.query(neighborhoodsQuery),
      db.query(priceChangeQuery),
      db.query(lastSyncQuery)
    ]);

    const basic = basicResult.rows[0];
    const priceChange = priceChangeResult.rows[0];

    // Calculate price change percentage
    let priceChangePercent = '0.0%';
    if (priceChange.current_avg && priceChange.previous_avg && priceChange.previous_avg > 0) {
      const change = ((priceChange.current_avg - priceChange.previous_avg) / priceChange.previous_avg) * 100;
      priceChangePercent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    }

    const stats = {
      totalProperties: parseInt(basic.total_properties || 0),
      activeListings: parseInt(basic.active_listings || 0),
      soldThisMonth: parseInt(basic.sold_this_month || 0),
      averagePrice: Math.round(parseFloat(basic.average_price || 0)),
      priceChange: priceChangePercent,
      topNeighborhoods: neighborhoodsResult.rows.map(row => ({
        name: row.neighborhood,
        count: parseInt(row.count),
        avgPrice: parseInt(row.avg_price)
      })),
      lastSync: lastSyncResult.rows[0]?.last_sync || null,
      syncStatus: lastSyncResult.rows[0]?.sync_status || 'unknown',
      dataFreshness: {
        oldestProperty: basic.oldest_property,
        newestProperty: basic.newest_property
      }
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

    const db = require('../config/database');

    // Build query conditions
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`started_at >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`started_at <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM mls_sync_logs ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated logs
    const logsQuery = `
      SELECT
        sync_id,
        status,
        started_at,
        completed_at,
        results,
        error_message,
        options
      FROM mls_sync_logs
      ${whereClause}
      ORDER BY started_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const logsResult = await db.query(logsQuery, params);

    // Format logs for response
    const logs = logsResult.rows.map(log => ({
      syncId: log.sync_id,
      status: log.status,
      startedAt: log.started_at,
      completedAt: log.completed_at,
      duration: log.completed_at ?
        Math.round((new Date(log.completed_at) - new Date(log.started_at)) / 1000) : null,
      recordsProcessed: log.results?.recordsProcessed || 0,
      recordsUpdated: log.results?.recordsUpdated || 0,
      recordsCreated: log.results?.recordsCreated || 0,
      errorMessage: log.error_message,
      options: log.options
    }));

    sendResponse(res, {
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
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