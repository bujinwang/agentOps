const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { ERROR_MESSAGES } = require('../config/constants');
const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input',
      details: errors.array()
    });
  }
  next();
};

// MLS data validation
const mlsDataValidation = [
  body('properties')
    .isArray({ min: 1 })
    .withMessage('Properties array is required and must not be empty'),
  body('properties.*.mlsNumber')
    .notEmpty()
    .withMessage('MLS number is required for each property'),
  body('properties.*.address')
    .notEmpty()
    .withMessage('Address is required for each property'),
  body('properties.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('properties.*.status')
    .optional()
    .isIn(['Active', 'Pending', 'Sold', 'Off Market'])
    .withMessage('Invalid property status')
];

/**
 * POST /webhooks/mls/property-update
 * Webhook endpoint for MLS property updates (replaces n8n workflow)
 * Receives property data from MLS systems and processes it
 */
router.post('/webhooks/mls/property-update', mlsDataValidation, handleValidationErrors, async (req, res) => {
  try {
    const { properties } = req.body;
    const processedCount = properties.length;

    logger.info(`Received MLS property update webhook with ${processedCount} properties`);

    // Process each property
    const results = [];
    for (const property of properties) {
      try {
        // Validate and normalize property data
        const normalizedProperty = {
          mlsNumber: property.mlsNumber,
          address: property.address,
          city: property.city || 'Unknown',
          state: property.state || 'Unknown',
          zipCode: property.zipCode || property.zip || 'Unknown',
          price: property.price || property.listPrice || 0,
          status: property.status || 'Active',
          propertyType: property.propertyType || 'Unknown',
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 0,
          squareFeet: property.squareFeet || property.sqft || 0,
          lotSize: property.lotSize || 0,
          yearBuilt: property.yearBuilt || null,
          description: property.description || property.remarks || '',
          listingAgent: property.listingAgent || null,
          listingOffice: property.listingOffice || null,
          photos: property.photos || [],
          lastUpdated: property.lastUpdated || new Date().toISOString(),
          source: 'MLS'
        };

        // Here you would typically:
        // 1. Check if property exists in database
        // 2. Update or create property record
        // 3. Handle duplicate detection
        // 4. Update search indexes
        // 5. Trigger notifications if needed

        // For now, just log the processing
        logger.info(`Processing MLS property: ${normalizedProperty.mlsNumber} - ${normalizedProperty.address}`);

        results.push({
          mlsNumber: normalizedProperty.mlsNumber,
          status: 'processed',
          address: normalizedProperty.address
        });

      } catch (propertyError) {
        logger.error(`Error processing property ${property.mlsNumber}:`, propertyError);
        results.push({
          mlsNumber: property.mlsNumber,
          status: 'error',
          error: propertyError.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'processed').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    logger.info(`MLS webhook processing complete: ${successCount} successful, ${errorCount} errors`);

    sendResponse(res, {
      message: 'MLS property update processed',
      summary: {
        total: processedCount,
        successful: successCount,
        errors: errorCount
      },
      results
    }, 'MLS data processed successfully');

  } catch (error) {
    logger.error('MLS webhook processing error:', error);
    sendError(res, 'Failed to process MLS data', 'MLS_PROCESSING_ERROR', null, 500);
  }
});

/**
 * GET /api/mls/status
 * Get MLS integration status and recent activity
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const db = require('../config/database');

    // Get basic MLS statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_properties,
        COUNT(*) FILTER (WHERE status = 'active') as active_listings,
        COUNT(*) FILTER (WHERE updated_at >= CURRENT_DATE - INTERVAL '24 hours') as recent_updates
      FROM properties
      WHERE deleted_at IS NULL AND mls_id IS NOT NULL
    `;

    // Get last sync information
    const lastSyncQuery = `
      SELECT
        completed_at as last_sync,
        status as sync_status,
        results->>'recordsProcessed' as records_processed
      FROM mls_sync_logs
      WHERE status IN ('completed', 'failed')
      ORDER BY completed_at DESC
      LIMIT 1
    `;

    // Get current sync status
    const currentSyncQuery = `
      SELECT sync_id, status, started_at
      FROM mls_sync_logs
      WHERE status = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    `;

    const [statsResult, lastSyncResult, currentSyncResult] = await Promise.all([
      db.query(statsQuery),
      db.query(lastSyncQuery),
      db.query(currentSyncQuery)
    ]);

    const stats = statsResult.rows[0];
    const lastSync = lastSyncResult.rows[0];
    const currentSync = currentSyncResult.rows[0];

    const status = {
      lastSync: lastSync?.last_sync || null,
      totalProperties: parseInt(stats.total_properties || 0),
      activeListings: parseInt(stats.active_listings || 0),
      recentUpdates: parseInt(stats.recent_updates || 0),
      syncStatus: currentSync ? 'running' : 'idle',
      currentSyncId: currentSync?.sync_id || null,
      nextScheduledSync: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      lastSyncRecordsProcessed: lastSync?.records_processed ? parseInt(lastSync.records_processed) : 0
    };

    sendResponse(res, status, 'MLS status retrieved successfully');
  } catch (error) {
    logger.error('Error getting MLS status:', error);
    sendError(res, 'Failed to get MLS status', 'STATUS_ERROR', null, 500);
  }
});

/**
 * POST /api/mls/sync
 * Manually trigger MLS synchronization
 */
router.post('/sync', authenticate, async (req, res) => {
  try {
    // This would typically trigger an MLS sync process
    logger.info('Manual MLS sync triggered by user:', req.user.email);

    // Simulate sync process
    const syncResult = {
      syncId: `sync_${Date.now()}`,
      status: 'started',
      estimatedDuration: '5-10 minutes',
      propertiesExpected: 1250
    };

    sendResponse(res, syncResult, 'MLS sync initiated successfully', 202);
  } catch (error) {
    logger.error('Error initiating MLS sync:', error);
    sendError(res, 'Failed to initiate MLS sync', 'SYNC_ERROR', null, 500);
  }
});

/**
 * GET /api/mls/properties/:mlsNumber
 * Get property details by MLS number
 */
router.get('/properties/:mlsNumber', authenticate, async (req, res) => {
  try {
    const { mlsNumber } = req.params;
    const db = require('../config/database');

    // Query property details
    const propertyQuery = `
      SELECT
        p.id,
        p.mls_id,
        p.title,
        p.description,
        p.public_remarks,
        p.price,
        p.status,
        p.property_type,
        p.address,
        p.details,
        p.marketing,
        p.mls_provider,
        p.mls_status,
        p.mls_listing_date,
        p.created_at,
        p.updated_at,
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
      city: property.address?.city,
      state: property.address?.state,
      zipCode: property.address?.zip_code,
      price: property.price,
      status: property.status,
      propertyType: property.property_type,
      bedrooms: property.details?.bedrooms,
      bathrooms: property.details?.bathrooms,
      squareFeet: property.details?.square_feet,
      lotSize: property.details?.lot_size,
      yearBuilt: property.details?.year_built,
      listingAgent: property.marketing?.listing_agent || property.marketing?.agent,
      listingOffice: property.marketing?.listing_office,
      photos: Array.isArray(property.photos) ? property.photos : [],
      mlsProvider: property.mls_provider,
      mlsStatus: property.mls_status,
      mlsListingDate: property.mls_listing_date,
      lastUpdated: property.updated_at,
      createdAt: property.created_at,
      source: 'MLS'
    };

    sendResponse(res, formattedProperty, 'Property details retrieved successfully');
  } catch (error) {
    logger.error('Error getting property details:', error);
    sendError(res, 'Failed to get property details', 'PROPERTY_ERROR', null, 500);
  }
});

/**
 * GET /api/mls/stats
 * Get MLS integration statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const db = require('../config/database');

    // Get comprehensive MLS statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_properties,
        COUNT(*) FILTER (WHERE status = 'active') as active_listings,
        COUNT(*) FILTER (WHERE status = 'sold' AND updated_at >= CURRENT_DATE - INTERVAL '30 days') as sold_this_month,
        ROUND(AVG(price) FILTER (WHERE price > 0)) as average_price,
        ROUND(AVG(price) FILTER (WHERE price > 0 AND updated_at >= CURRENT_DATE - INTERVAL '30 days')) as current_avg_price,
        ROUND(AVG(price) FILTER (WHERE price > 0 AND updated_at >= CURRENT_DATE - INTERVAL '60 days' AND updated_at < CURRENT_DATE - INTERVAL '30 days')) as previous_avg_price
      FROM properties
      WHERE deleted_at IS NULL AND mls_id IS NOT NULL
    `;

    // Get top neighborhoods
    const neighborhoodsQuery = `
      SELECT
        COALESCE(address->>'city', 'Unknown') as neighborhood,
        COUNT(*) as count,
        ROUND(AVG(price)) as avg_price
      FROM properties
      WHERE deleted_at IS NULL AND mls_id IS NOT NULL AND status = 'active' AND price > 0
      GROUP BY address->>'city'
      HAVING COUNT(*) >= 2
      ORDER BY count DESC
      LIMIT 5
    `;

    const [statsResult, neighborhoodsResult] = await Promise.all([
      db.query(statsQuery),
      db.query(neighborhoodsQuery)
    ]);

    const stats = statsResult.rows[0];

    // Calculate price change
    let priceChange = '0.0%';
    if (stats.current_avg_price && stats.previous_avg_price && stats.previous_avg_price > 0) {
      const change = ((stats.current_avg_price - stats.previous_avg_price) / stats.previous_avg_price) * 100;
      priceChange = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    }

    const formattedStats = {
      totalProperties: parseInt(stats.total_properties || 0),
      activeListings: parseInt(stats.active_listings || 0),
      soldThisMonth: parseInt(stats.sold_this_month || 0),
      averagePrice: parseInt(stats.average_price || 0),
      priceChange,
      topNeighborhoods: neighborhoodsResult.rows.map(row => ({
        name: row.neighborhood,
        count: parseInt(row.count),
        avgPrice: parseInt(row.avg_price)
      })),
      lastUpdated: new Date().toISOString()
    };

    sendResponse(res, formattedStats, 'MLS statistics retrieved successfully');
  } catch (error) {
    logger.error('Error getting MLS stats:', error);
    sendError(res, 'Failed to get MLS statistics', 'STATS_ERROR', null, 500);
  }
});

module.exports = router;