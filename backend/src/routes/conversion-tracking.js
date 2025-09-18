const express = require('express');
const { extractUserFromToken } = require('../middleware/jwtExtractor');
const ConversionTrackingService = require('../services/ConversionTrackingService');
const { logger } = require('../config/logger');
const { sendResponse, sendError } = require('../utils/responseFormatter');

const router = express.Router();

// All routes require authentication
router.use(extractUserFromToken);

/**
 * POST /api/conversion-tracking/leads/:leadId/events
 * Log a conversion event for a lead
 * Replaces n8n conversion tracking workflow
 */
router.post('/leads/:leadId/events', async (req, res) => {
  try {
    const { leadId } = req.params;
    const eventData = req.body;
    const userId = req.user.userId;

    logger.info('Log conversion event request', {
      leadId: parseInt(leadId),
      eventType: eventData.eventType,
      userId
    });

    const result = await ConversionTrackingService.logConversionEvent(
      parseInt(leadId),
      eventData,
      userId
    );

    if (result.success) {
      sendResponse(res, result, 'Conversion event logged successfully', 201);
    } else {
      sendError(res, 'Failed to log conversion event', 'LOG_EVENT_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Log conversion event error', {
      leadId: req.params.leadId,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to log conversion event', 'LOG_EVENT_ERROR', null, 500);
  }
});

/**
 * GET /api/conversion-tracking/leads/:leadId/timeline
 * Get conversion timeline for a lead
 * Replaces n8n conversion tracking workflow
 */
router.get('/leads/:leadId/timeline', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.userId;

    logger.info('Get conversion timeline request', {
      leadId: parseInt(leadId),
      userId
    });

    const result = await ConversionTrackingService.getConversionTimeline(parseInt(leadId));

    if (result.success) {
      sendResponse(res, result, 'Conversion timeline retrieved successfully');
    } else {
      sendError(res, 'Failed to get conversion timeline', 'TIMELINE_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get conversion timeline error', {
      leadId: req.params.leadId,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get conversion timeline', 'TIMELINE_ERROR', null, 500);
  }
});

/**
 * PUT /api/conversion-tracking/leads/:leadId/status
 * Update conversion status for a lead
 * Replaces n8n conversion tracking workflow
 */
router.put('/leads/:leadId/status', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { newStatus, newStage } = req.body;
    const userId = req.user.userId;

    if (!newStatus) {
      return sendError(res, 'New status is required', 'VALIDATION_ERROR', null, 400);
    }

    logger.info('Update conversion status request', {
      leadId: parseInt(leadId),
      newStatus,
      newStage,
      userId
    });

    const result = await ConversionTrackingService.updateConversionStatus(
      parseInt(leadId),
      newStatus,
      newStage,
      userId
    );

    if (result.success) {
      sendResponse(res, result, 'Conversion status updated successfully');
    } else {
      sendError(res, 'Failed to update conversion status', 'STATUS_UPDATE_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Update conversion status error', {
      leadId: req.params.leadId,
      newStatus: req.body.newStatus,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to update conversion status', 'STATUS_UPDATE_ERROR', null, 500);
  }
});

/**
 * GET /api/conversion-tracking/funnel
 * Get conversion funnel analytics
 * Replaces n8n conversion tracking workflow
 */
router.get('/funnel', async (req, res) => {
  try {
    const userId = req.user.userId;

    logger.info('Get conversion funnel request', { userId });

    const result = await ConversionTrackingService.getConversionFunnel();

    if (result.success) {
      sendResponse(res, result.funnelData, 'Conversion funnel retrieved successfully');
    } else {
      sendError(res, 'Failed to get conversion funnel', 'FUNNEL_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get conversion funnel error', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get conversion funnel', 'FUNNEL_ERROR', null, 500);
  }
});

/**
 * GET /api/conversion-tracking/metrics
 * Get conversion metrics for the authenticated user
 */
router.get('/metrics', async (req, res) => {
  try {
    const userId = req.user.userId;
    const filters = {
      timeframe: req.query.timeframe || 'month',
      leadId: req.query.leadId ? parseInt(req.query.leadId) : undefined
    };

    logger.info('Get conversion metrics request', {
      userId,
      filters
    });

    const result = await ConversionTrackingService.getConversionMetrics(userId, filters);

    if (result.success) {
      sendResponse(res, result.metrics, 'Conversion metrics retrieved successfully');
    } else {
      sendError(res, 'Failed to get conversion metrics', 'METRICS_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get conversion metrics error', {
      userId: req.user?.userId,
      filters: req.query,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get conversion metrics', 'METRICS_ERROR', null, 500);
  }
});

/**
 * GET /api/conversion-tracking/leads/:leadId/events
 * Get all conversion events for a specific lead
 */
router.get('/leads/:leadId/events', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    logger.info('Get lead conversion events request', {
      leadId: parseInt(leadId),
      userId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const result = await ConversionTrackingService.getConversionTimeline(parseInt(leadId));

    if (result.success) {
      // Apply pagination to the timeline
      const paginatedEvents = result.timeline.slice(
        parseInt(offset),
        parseInt(offset) + parseInt(limit)
      );

      sendResponse(res, {
        leadId: parseInt(leadId),
        events: paginatedEvents,
        pagination: {
          total: result.timeline.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < result.timeline.length
        }
      }, 'Lead conversion events retrieved successfully');
    } else {
      sendError(res, 'Failed to get lead conversion events', 'EVENTS_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get lead conversion events error', {
      leadId: req.params.leadId,
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get lead conversion events', 'EVENTS_ERROR', null, 500);
  }
});

/**
 * GET /api/conversion-tracking/dashboard
 * Get conversion dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    const timeframe = req.query.timeframe || 'month';

    logger.info('Get conversion dashboard request', {
      userId,
      timeframe
    });

    // Get metrics and funnel data in parallel
    const [metricsResult, funnelResult] = await Promise.all([
      ConversionTrackingService.getConversionMetrics(userId, { timeframe }),
      ConversionTrackingService.getConversionFunnel()
    ]);

    if (metricsResult.success && funnelResult.success) {
      const dashboardData = {
        metrics: metricsResult.metrics,
        funnel: funnelResult.funnelData,
        timeframe,
        generatedAt: new Date().toISOString()
      };

      sendResponse(res, dashboardData, 'Conversion dashboard data retrieved successfully');
    } else {
      sendError(res, 'Failed to get conversion dashboard data', 'DASHBOARD_ERROR', null, 500);
    }

  } catch (error) {
    logger.error('Get conversion dashboard error', {
      userId: req.user?.userId,
      timeframe: req.query.timeframe,
      error: error.message,
      stack: error.stack
    });
    sendError(res, 'Failed to get conversion dashboard data', 'DASHBOARD_ERROR', null, 500);
  }
});

module.exports = router;