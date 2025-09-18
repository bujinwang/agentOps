const express = require('express');
const router = express.Router();
const MLSSyncService = require('../services/MLSSyncService');
const MLSSyncScheduler = require('../services/MLSSyncScheduler');
const { authenticateToken } = require('../middleware/auth');
const { sendResponse, sendError } = require('../utils/responseHelper');

/**
 * @route GET /api/mls/sync/status
 * @desc Check MLS sync status
 * @access Private
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = await MLSSyncService.getSyncStatus();

    sendResponse(res, status, 'Sync status retrieved successfully');
  } catch (error) {
    console.error('Error getting MLS sync status:', error);
    sendError(res, 'Failed to get sync status', 500);
  }
});

/**
 * @route POST /api/mls/sync/start
 * @desc Start MLS synchronization
 * @access Private
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const options = req.body || {};

    // Validate options
    const validOptions = {
      fullSync: typeof options.fullSync === 'boolean' ? options.fullSync : false,
      validateData: typeof options.validateData === 'boolean' ? options.validateData : true,
      skipDuplicates: typeof options.skipDuplicates === 'boolean' ? options.skipDuplicates : false
    };

    const result = await MLSSyncService.startSync(validOptions);

    if (!result.success) {
      return sendError(res, result.message, 409); // Conflict if already running
    }

    sendResponse(res, {
      syncId: result.syncId,
      status: result.status
    }, result.message);
  } catch (error) {
    console.error('Error starting MLS sync:', error);
    sendError(res, 'Failed to start MLS sync', 500);
  }
});

/**
 * @route GET /api/mls/sync/progress/:syncId
 * @desc Get sync progress for specific sync ID
 * @access Private
 */
router.get('/progress/:syncId', authenticateToken, async (req, res) => {
  try {
    const { syncId } = req.params;

    if (!syncId) {
      return sendError(res, 'Sync ID is required', 400);
    }

    const result = await MLSSyncService.getSyncProgress(syncId);

    if (!result.success) {
      return sendError(res, result.error, result.statusCode);
    }

    sendResponse(res, result.data, 'Sync progress retrieved successfully');
  } catch (error) {
    console.error('Error getting sync progress:', error);
    sendError(res, 'Failed to get sync progress', 500);
  }
});

/**
 * @route GET /api/mls/sync/errors
 * @desc Get recent sync errors
 * @access Private
 */
router.get('/errors', authenticateToken, async (req, res) => {
  try {
    const errors = await MLSSyncService.getSyncErrors();

    sendResponse(res, { errors }, 'Sync errors retrieved successfully');
  } catch (error) {
    console.error('Error getting sync errors:', error);
    sendError(res, 'Failed to get sync errors', 500);
  }
});

/**
 * @route GET /api/mls/sync/scheduler/status
 * @desc Get scheduler status
 * @access Private
 */
router.get('/scheduler/status', authenticateToken, async (req, res) => {
  try {
    const status = MLSSyncScheduler.getStatus();

    sendResponse(res, status, 'Scheduler status retrieved successfully');
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    sendError(res, 'Failed to get scheduler status', 500);
  }
});

/**
 * @route POST /api/mls/sync/scheduler/start
 * @desc Start the MLS sync scheduler
 * @access Private (Admin only)
 */
router.post('/scheduler/start', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check
    // if (req.user.role !== 'admin') {
    //   return sendError(res, 'Admin access required', 403);
    // }

    MLSSyncScheduler.start();

    sendResponse(res, { status: 'started' }, 'MLS sync scheduler started successfully');
  } catch (error) {
    console.error('Error starting scheduler:', error);
    sendError(res, 'Failed to start scheduler', 500);
  }
});

/**
 * @route POST /api/mls/sync/scheduler/stop
 * @desc Stop the MLS sync scheduler
 * @access Private (Admin only)
 */
router.post('/scheduler/stop', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check
    // if (req.user.role !== 'admin') {
    //   return sendError(res, 'Admin access required', 403);
    // }

    MLSSyncScheduler.stop();

    sendResponse(res, { status: 'stopped' }, 'MLS sync scheduler stopped successfully');
  } catch (error) {
    console.error('Error stopping scheduler:', error);
    sendError(res, 'Failed to stop scheduler', 500);
  }
});

module.exports = router;