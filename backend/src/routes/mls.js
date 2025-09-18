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
    // This would typically query the database for MLS integration metrics
    const status = {
      lastSync: new Date().toISOString(),
      totalProperties: 1250,
      activeListings: 890,
      recentUpdates: 45,
      syncStatus: 'healthy',
      nextScheduledSync: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
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

    // This would typically query the database for property details
    // For now, return mock data
    const property = {
      mlsNumber,
      address: '123 Main St, Anytown, USA',
      price: 450000,
      status: 'Active',
      lastUpdated: new Date().toISOString(),
      source: 'MLS'
    };

    sendResponse(res, property, 'Property details retrieved successfully');
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
    // This would typically aggregate MLS statistics from the database
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
      lastUpdated: new Date().toISOString()
    };

    sendResponse(res, stats, 'MLS statistics retrieved successfully');
  } catch (error) {
    logger.error('Error getting MLS stats:', error);
    sendError(res, 'Failed to get MLS statistics', 'STATS_ERROR', null, 500);
  }
});

module.exports = router;